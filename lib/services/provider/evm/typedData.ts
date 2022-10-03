import { TypedDataField } from '@ethersproject/abstract-signer'
import { getAddress } from '@ethersproject/address'
import { BigNumberish } from '@ethersproject/bignumber'
import {
  BytesLike,
  arrayify,
  hexConcat,
  hexZeroPad,
  hexlify
} from '@ethersproject/bytes'
import { id } from '@ethersproject/hash/src.ts/id'
import { keccak256 } from '@ethersproject/keccak256'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import { BigNumber, version } from 'ethers'

const logger = new Logger(version)

export function reduceTypes(
  types: Record<string, Array<TypedDataField>>,
  primaryType?: string
) {
  if (primaryType) {
    // Link struct types to their direct child structs
    const links: Record<string, Record<string, boolean>> = {}

    // Link structs to structs which contain them as a child
    const parents: Record<string, Array<string>> = {}

    // Link all subtypes within a given struct
    const subtypes: Record<string, Record<string, boolean>> = {}

    Object.keys(types).forEach((type) => {
      links[type] = {}
      parents[type] = []
      subtypes[type] = {}
    })

    for (const name in types) {
      const uniqueNames: Record<string, boolean> = {}

      types[name].forEach((field) => {
        // Check each field has a unique name
        if (uniqueNames[field.name]) {
          logger.throwArgumentError(
            `duplicate variable name ${JSON.stringify(
              field.name
            )} in ${JSON.stringify(name)}`,
            'types',
            types
          )
        }
        uniqueNames[field.name] = true

        // Get the base type (drop any array specifiers)
        const baseType = field.type.match(/^([^\x5b]*)(\x5b|$)/)![1]
        if (baseType === name) {
          logger.throwArgumentError(
            `circular type reference to ${JSON.stringify(baseType)}`,
            'types',
            types
          )
        }

        // Is this a base encoding type?
        const encoder = getBaseEncoder(baseType)
        if (encoder) {
          return
        }

        if (!parents[baseType]) {
          logger.throwArgumentError(
            `unknown type ${JSON.stringify(baseType)}`,
            'types',
            types
          )
        }

        // Add linkage
        parents[baseType].push(name)
        links[name][baseType] = true
      })
    }

    const primaryTypes = Object.keys(parents).filter(
      (n) => parents[n].length === 0
    )

    types = shallowCopy(types)
    for (const type of primaryTypes) {
      if (type === primaryType) {
        continue
      }

      delete types[type]
    }
  }

  return types
}

function getBaseEncoder(type: string): ((value: any) => string) | null {
  // intXX and uintXX
  {
    const match = type.match(/^(u?)int(\d*)$/)
    if (match) {
      const signed = match[1] === ''

      const width = parseInt(match[2] || '256')
      if (
        width % 8 !== 0 ||
        width > 256 ||
        (match[2] && match[2] !== String(width))
      ) {
        logger.throwArgumentError('invalid numeric width', 'type', type)
      }

      const boundsUpper = MaxUint256.mask(signed ? width - 1 : width)
      const boundsLower = signed ? boundsUpper.add(One).mul(NegativeOne) : Zero

      return function (value: BigNumberish) {
        const v = BigNumber.from(value)

        if (v.lt(boundsLower) || v.gt(boundsUpper)) {
          logger.throwArgumentError(
            `value out-of-bounds for ${type}`,
            'value',
            value
          )
        }

        return hexZeroPad(v.toTwos(256).toHexString(), 32)
      }
    }
  }

  // bytesXX
  {
    const match = type.match(/^bytes(\d+)$/)
    if (match) {
      const width = parseInt(match[1])
      if (width === 0 || width > 32 || match[1] !== String(width)) {
        logger.throwArgumentError('invalid bytes width', 'type', type)
      }

      return function (value: BytesLike) {
        const bytes = arrayify(value)
        if (bytes.length !== width) {
          logger.throwArgumentError(
            `invalid length for ${type}`,
            'value',
            value
          )
        }
        return hexPadRight(value)
      }
    }
  }

  switch (type) {
    case 'address':
      return function (value: string) {
        return hexZeroPad(getAddress(value), 32)
      }
    case 'bool':
      return function (value: boolean) {
        return !value ? hexFalse : hexTrue
      }
    case 'bytes':
      return function (value: BytesLike) {
        return keccak256(value)
      }
    case 'string':
      return function (value: string) {
        return id(value)
      }
  }

  return null
}

const padding = new Uint8Array(32)
padding.fill(0)

const NegativeOne: BigNumber = BigNumber.from(-1)
const Zero: BigNumber = BigNumber.from(0)
const One: BigNumber = BigNumber.from(1)
const MaxUint256: BigNumber = BigNumber.from(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
)

const hexTrue = hexZeroPad(One.toHexString(), 32)
const hexFalse = hexZeroPad(Zero.toHexString(), 32)

function hexPadRight(value: BytesLike) {
  const bytes = arrayify(value)
  const padOffset = bytes.length % 32
  if (padOffset) {
    return hexConcat([bytes, padding.slice(padOffset)])
  }
  return hexlify(bytes)
}
