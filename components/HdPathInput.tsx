import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  IconButton,
  NumberInput,
  NumberInputField,
  Text
} from '@chakra-ui/react'
import {
  HdPath,
  Slip10RawIndex,
  pathToString,
  stringToPath
} from '@cosmjs/crypto'
import { useCallback } from 'react'

import { HardenedBit } from '~lib/crypto/ed25519'

interface HdPathInputProps {
  isEd25519Curve?: boolean
  forcePrefix?: string
  value?: string

  onChange(value: string): void
}

export const HdPathInput = ({
  isEd25519Curve,
  forcePrefix = "m/44'",
  value = "m/44'",
  onChange
}: HdPathInputProps) => {
  if (!value.startsWith(forcePrefix)) {
    throw new Error(`Prefix of HD path '${value}' is not '${forcePrefix}'`)
  }
  const hdPathPrefix: HdPath = stringToPath(forcePrefix)
  const hdPath: HdPath = stringToPath(value)
  if (isEd25519Curve) {
    if (
      hdPathPrefix.find((component) => !component.isHardened()) ||
      hdPath.find((component) => !component.isHardened())
    ) {
      throw new Error('ED25519 curve supports only hardened key generation')
    }
  }
  // console.log(pathToString(hdPath))

  const onValueChange = useCallback(
    (value: number, index: number) => {
      value = value || 0
      if (value >= HardenedBit) {
        value = HardenedBit - 1
      }
      const component = hdPath[index].isHardened()
        ? Slip10RawIndex.hardened(value)
        : Slip10RawIndex.normal(value)
      const path = pathToString(
        hdPath.slice().fill(component, index, index + 1)
      )
      onChange(path)
    },
    [hdPath, onChange]
  )

  const onHardenedChange = useCallback(
    (component: Slip10RawIndex, index: number) => {
      if (component.isHardened()) {
        component = Slip10RawIndex.normal(component.toNumber() - 2 ** 31)
      } else {
        component = Slip10RawIndex.hardened(component.toNumber())
      }
      const path = pathToString(
        hdPath.slice().fill(component, index, index + 1)
      )
      onChange(path)
    },
    [hdPath, onChange]
  )

  const onAddComponent = useCallback(() => {
    const path = pathToString(
      hdPath
        .slice()
        .concat(
          isEd25519Curve ? Slip10RawIndex.hardened(0) : Slip10RawIndex.normal(0)
        )
    )
    onChange(path)
  }, [hdPath, isEd25519Curve, onChange])

  const onRemoveComponent = useCallback(() => {
    const path = pathToString(hdPath.slice(0, hdPath.length - 1))
    onChange(path)
  }, [hdPath, onChange])

  return (
    <HStack>
      <Text>m</Text>
      {hdPath.map((component, index) => {
        return (
          <HStack key={index}>
            <Text>/</Text>
            <Component
              value={
                component.toNumber() -
                (component.isHardened() ? HardenedBit : 0)
              }
              onChange={(value) => onValueChange(value, index)}
              changeable={index + 1 > hdPathPrefix.length}
            />
            <HardenedSymbol
              value={component.isHardened()}
              onChange={() => onHardenedChange(component, index)}
              changeable={!isEd25519Curve && index + 1 > hdPathPrefix.length}
            />
          </HStack>
        )
      })}

      <HStack ps={4}>
        {hdPath.length < 5 && (
          <IconButton
            size="xs"
            aria-label="Add HD path component"
            icon={<AddIcon />}
            onClick={onAddComponent}
          />
        )}
        {hdPath.length > 3 && (
          <IconButton
            size="xs"
            aria-label="Remove HD path component"
            icon={<MinusIcon />}
            onClick={onRemoveComponent}
          />
        )}
      </HStack>
    </HStack>
  )
}

const Component = ({
  value,
  onChange,
  changeable
}: {
  value: number
  onChange: (value: number) => void
  changeable: boolean
}) => {
  return changeable ? (
    <NumberInput
      w={12}
      value={value}
      onChange={(_, value) => onChange(value)}
      precision={0}
      step={1}
      min={0}
      max={HardenedBit - 1}>
      <NumberInputField ps={2} pe={2} textAlign="center" />
    </NumberInput>
  ) : (
    <Box>{value}</Box>
  )
}

const HardenedSymbol = ({
  value,
  onChange,
  changeable
}: {
  value: boolean
  onChange: () => void
  changeable: boolean
}) => {
  return changeable ? (
    <Button variant="outline" px={1} minW={4} onClick={onChange}>
      {value ? "'" : ''}
    </Button>
  ) : (
    <Box>{value ? "'" : ''}</Box>
  )
}
