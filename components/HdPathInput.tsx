import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  HStack,
  IconButton,
  NumberInput,
  NumberInputField,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Text
} from '@chakra-ui/react'
import {
  HdPath,
  Slip10RawIndex,
  pathToString,
  stringToPath
} from '@cosmjs/crypto'
import assert from 'assert'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'

import { HardenedBit } from '~lib/crypto/ed25519'
import { DerivePosition } from '~lib/schema'

interface HdPathInputProps {
  isEd25519Curve?: boolean
  forcePrefixLength?: number
  fixedLength?: boolean
  derivePosition?: DerivePosition
  setDerivePosition?: (position: DerivePosition) => void
  value?: string
  onChange?: (value: string) => void
}

export const HdPathInput = ({
  isEd25519Curve,
  forcePrefixLength = 0,
  fixedLength,
  derivePosition,
  setDerivePosition,
  value = 'm',
  onChange
}: HdPathInputProps) => {
  const hdPath: HdPath = stringToPath(value)

  assert(hdPath.length >= forcePrefixLength)
  const hdPathPrefix: HdPath = hdPath.slice(0, forcePrefixLength)

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
      onChange?.(path)
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
      onChange?.(path)
    },
    [hdPath, onChange]
  )

  const onAddComponent = useCallback(() => {
    const path = pathToString(
      hdPath
        .slice()
        .concat(
          isEd25519Curve || hdPath.length < 3
            ? Slip10RawIndex.hardened(0)
            : Slip10RawIndex.normal(0)
        )
    )
    onChange?.(path)
  }, [hdPath, isEd25519Curve, onChange])

  const onRemoveComponent = useCallback(() => {
    const hp = hdPath.slice(0, hdPath.length - 1)
    if (derivePosition !== undefined && derivePosition > hp.length - 1) {
      const position = hp.length - 1
      setDerivePosition?.(position)
      hp[position] = hp[position].isHardened()
        ? Slip10RawIndex.hardened(0)
        : Slip10RawIndex.normal(0)
    }
    const path = pathToString(hp)
    onChange?.(path)
  }, [derivePosition, setDerivePosition, hdPath, onChange])

  const [positions, setPositions] = useState<
    {
      x?: number
      w?: number
    }[]
  >([])
  useEffect(() => {
    setPositions((positions) => {
      const ps = positions.slice()
      ps[DerivePosition.ACCOUNT] = {}
      ps[DerivePosition.CHANGE] = {}
      ps[DerivePosition.ADDRESS_INDEX] = {}
      return ps
    })
  }, [])

  const onComponentXW = useCallback((index: number, x: number, w: number) => {
    setPositions((positions) => {
      const position = positions[index]
      if (!position) {
        return positions
      }
      if (position.x === x && position.w === w) {
        return positions
      }
      const ps = positions.slice()
      ps[index] = { x, w }
      return ps
    })
  }, [])

  const [boxX, setBoxX] = useState<number>(0)
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setBoxX(node.getBoundingClientRect().x)
    }
  }, [])

  return (
    <Stack>
      <HStack ref={ref}>
        <Text>m</Text>
        {hdPath.map((component, index) => {
          return (
            <HStack key={index}>
              <Text>/</Text>
              <PathComponent
                value={
                  component.toNumber() -
                  (component.isHardened() ? HardenedBit : 0)
                }
                onChange={(value) => onValueChange(value, index)}
                changeable={
                  index + 1 > hdPathPrefix.length && index !== derivePosition
                }
                isDerivePosition={index === derivePosition}
                setXW={(x, w) => onComponentXW(index, x, w)}
              />
              <HardenedSymbol
                value={component.isHardened()}
                onChange={() => onHardenedChange(component, index)}
                changeable={!isEd25519Curve && index + 1 > hdPathPrefix.length}
              />
            </HStack>
          )
        })}

        {!fixedLength && (
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
        )}
      </HStack>

      {derivePosition !== undefined && (
        <Box position="relative" h="10px">
          {positions.map((p, index) => {
            if (typeof p.w !== 'number' || index > hdPath.length - 1) {
              return <React.Fragment key={index} />
            }

            return (
              <Center
                key={index}
                position="absolute"
                left={`${p.x! - boxX - 2}px`}
                width={`${p.w! + 4}px`}>
                <Popover
                  isLazy
                  trigger="hover"
                  placement="bottom"
                  isOpen={
                    index === derivePosition || setDerivePosition
                      ? undefined
                      : false
                  }>
                  <PopoverTrigger>
                    <Center
                      w="10px"
                      h="10px"
                      borderRadius="50%"
                      bg={index === derivePosition ? 'green.500' : 'gray.500'}
                      transition="background 0.2s ease-out"
                      cursor="pointer"
                      onClick={() => {
                        setDerivePosition?.(index)
                        onValueChange(0, index)
                      }}
                    />
                  </PopoverTrigger>
                  <PopoverContent w="auto">
                    <PopoverBody>
                      {index === derivePosition ? (
                        <>This position will be used as derivation index</>
                      ) : (
                        <>Click to mark this position as derivation index</>
                      )}
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </Center>
            )
          })}
        </Box>
      )}
    </Stack>
  )
}

const PathComponent = ({
  value,
  onChange,
  changeable,
  isDerivePosition,
  setXW
}: {
  value: number
  onChange: (value: number) => void
  changeable: boolean
  isDerivePosition: boolean
  setXW: (x: number, width: number) => void
}) => {
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        setXW(
          node.getBoundingClientRect().x,
          node.getBoundingClientRect().width
        )
      }
    },
    [setXW]
  )

  return (
    <Box ref={ref} color={isDerivePosition ? 'green.500' : undefined}>
      {changeable ? (
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
        value
      )}
    </Box>
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
