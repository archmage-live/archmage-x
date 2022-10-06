import { EditIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  PlacementWithLogical,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Stack,
  Switch,
  Text,
  chakra
} from '@chakra-ui/react'
import curveHigh from 'data-base64:~assets/curve-High.png'
import curveLow from 'data-base64:~assets/curve-low.png'
import curveMedium from 'data-base64:~assets/curve-medium.png'
import Decimal from 'decimal.js'
import * as React from 'react'
import { RefObject, useMemo, useRef } from 'react'

import { INetwork } from '~lib/schema'
import {
  Eip1559GasFee,
  GasFeeEstimates,
  GasOption,
  MaxFeePerGas,
  calculateTimeEstimate,
  isSourcedGasFeeEstimates,
  parseGwei,
  useDefaultGasFeeSettings
} from '~lib/services/provider/evm'

export const EvmGasFeeEditModal = ({
  network,
  isOpen,
  onClose,
  onAdvancedOpen,
  activeOption,
  setActiveOption,
  currencySymbol,
  gasFeeEstimates,
  customGasFeePerGas,
  siteSuggestedGasFeePerGas,
  increasedGasFeePerGas,
  gasLimit,
  origin
}: {
  network: INetwork
  isOpen: boolean
  onClose: () => void
  onAdvancedOpen: (confirm?: boolean) => void
  activeOption: GasOption
  setActiveOption: (option: GasOption) => void
  currencySymbol: string
  gasFeeEstimates: GasFeeEstimates
  customGasFeePerGas?: MaxFeePerGas
  siteSuggestedGasFeePerGas?: MaxFeePerGas
  increasedGasFeePerGas?: MaxFeePerGas
  gasLimit: number
  origin: string
}) => {
  const options = useMemo(() => {
    const options: Array<GasOption | false> = [
      GasOption.LOW,
      GasOption.MEDIUM,
      GasOption.HIGH
    ]
    options.push(false)
    if (siteSuggestedGasFeePerGas) {
      options.push(GasOption.SITE_SUGGESTED)
    }
    if (increasedGasFeePerGas) {
      options.push(GasOption.TEN_PERCENT_INCREASE)
    }
    options.push(GasOption.ADVANCED)
    return options
  }, [siteSuggestedGasFeePerGas, increasedGasFeePerGas])

  const ref = useRef(null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="lg"
      scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent my={0}>
        <ModalHeader>Edit gas fee</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0} ref={ref}>
          <Stack px={6} pb={6} spacing={12} fontSize="sm">
            <Stack>
              <Divider />

              <HStack ps={2}>
                <Text w={28}>Gas Option</Text>
                <Text w={14}>Time</Text>
                <Text w={32}>Max Fee</Text>
              </HStack>

              {options.map((option) => {
                if (!option) {
                  return <Divider key="divider" />
                }

                return (
                  <GasFeeOption
                    key={option}
                    network={network}
                    option={option}
                    isActive={option === activeOption}
                    onClick={() => {
                      if (
                        option === GasOption.ADVANCED &&
                        !customGasFeePerGas
                      ) {
                        onAdvancedOpen(true)
                      } else {
                        setActiveOption(option)
                        onClose()
                      }
                    }}
                    onAdvancedOpen={onAdvancedOpen}
                    currencySymbol={currencySymbol}
                    gasFeeEstimates={gasFeeEstimates}
                    customGasFeePerGas={customGasFeePerGas}
                    siteSuggestedGasFeePerGas={siteSuggestedGasFeePerGas}
                    increasedGasFeePerGas={increasedGasFeePerGas}
                    gasLimit={gasLimit}
                    origin={origin}
                    containerRef={ref}
                  />
                )
              })}
            </Stack>

            <NetworkStatus gasFeeEstimates={gasFeeEstimates} />
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const GasFeeOption = ({
  network,
  option,
  isActive,
  onClick,
  onAdvancedOpen,
  currencySymbol,
  gasFeeEstimates,
  customGasFeePerGas,
  siteSuggestedGasFeePerGas,
  increasedGasFeePerGas,
  gasLimit,
  origin,
  containerRef
}: {
  network: INetwork
  option: GasOption
  isActive: boolean
  onClick: () => void
  onAdvancedOpen: () => void
  currencySymbol: string
  gasFeeEstimates: GasFeeEstimates
  customGasFeePerGas?: MaxFeePerGas
  increasedGasFeePerGas?: MaxFeePerGas
  siteSuggestedGasFeePerGas?: MaxFeePerGas
  gasLimit: number
  origin: string
  containerRef: RefObject<HTMLElement | null>
}) => {
  const gasFee = optionGasFee(
    option,
    gasFeeEstimates,
    customGasFeePerGas,
    siteSuggestedGasFeePerGas,
    increasedGasFeePerGas
  )

  const {
    defaultGasFeeOption,
    setDefaultGasFeeOption,
    setDefaultAdvancedGasFee
  } = useDefaultGasFeeSettings(network.id)

  const isDisabled = useMemo(() => {
    if (!increasedGasFeePerGas || !gasFee) {
      return false
    }
    return (
      new Decimal(gasFee.suggestedMaxPriorityFeePerGas).lt(
        increasedGasFeePerGas.maxPriorityFeePerGas
      ) &&
      new Decimal(gasFee.suggestedMaxFeePerGas).lt(
        increasedGasFeePerGas.maxFeePerGas
      )
    )
  }, [gasFee, increasedGasFeePerGas])

  const icon = optionIcon(option)

  return (
    <Button
      as="div"
      variant="ghost"
      ps={2}
      cursor="pointer"
      isDisabled={isDisabled}
      isActive={isActive}
      onClick={onClick}>
      <HStack w="full" justify="space-between">
        <Text fontWeight="medium" w={28}>
          {icon && <>{icon}&nbsp;</>}
          {optionTitle(option)}
        </Text>

        <Text color={minWaitTimeColor(option)} w={14}>
          {toHumanReadableTime(
            minWaitTime(
              option,
              gasFeeEstimates,
              customGasFeePerGas,
              siteSuggestedGasFeePerGas,
              increasedGasFeePerGas
            )
          )}
        </Text>

        <Text color={maxFeeColor(option)} w={32}>
          {gasFee ? (
            <>
              {parseGwei(gasFee.suggestedMaxFeePerGas)
                .mul(gasLimit)
                .div(new Decimal(10).pow(18))
                .toDecimalPlaces(8)
                .toString()}
              &nbsp;
              {currencySymbol}
            </>
          ) : (
            <>--</>
          )}
        </Text>

        <HStack w={10} justify="end">
          {option === GasOption.ADVANCED && (
            <EditIcon
              onClick={(e) => {
                e.stopPropagation()
                onAdvancedOpen()
              }}
            />
          )}

          <Box onClick={(e) => e.stopPropagation()}>
            <Popover isLazy trigger="hover" placement="left">
              <PopoverTrigger>
                <InfoIcon />
              </PopoverTrigger>
              <Portal containerRef={containerRef}>
                <PopoverContent w="240px" whiteSpace="normal">
                  <PopoverArrow />
                  <PopoverBody p={0}>
                    <GasFeeOptionTooltip
                      option={option}
                      gasFee={gasFee}
                      gasLimit={gasLimit}
                      origin={origin}
                      defaultGasFeeOption={defaultGasFeeOption}
                      setDefaultGasFeeOption={setDefaultGasFeeOption}
                      setDefaultAdvancedGasFee={setDefaultAdvancedGasFee}
                    />
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          </Box>
        </HStack>
      </HStack>
    </Button>
  )
}

const GasFeeOptionTooltip = ({
  option,
  gasFee,
  gasLimit,
  origin,
  defaultGasFeeOption,
  setDefaultGasFeeOption,
  setDefaultAdvancedGasFee
}: {
  option: GasOption
  gasFee?: Eip1559GasFee
  gasLimit: number
  origin: string
  defaultGasFeeOption?: GasOption
  setDefaultGasFeeOption: (option?: GasOption) => void
  setDefaultAdvancedGasFee: (advanced: MaxFeePerGas) => void
}) => {
  const image = optionImage(option)

  return (
    <Stack p={4} spacing={4} w="240px" fontWeight="normal">
      {image && (
        <Center>
          <Image
            w="162px"
            h="47px"
            fit="contain"
            src={image}
            alt="Gas option curve"
          />
        </Center>
      )}

      <GasFeeOptionTooltipText option={option} origin={origin} />

      {gasFee && (
        <HStack spacing={6}>
          <Stack fontWeight="bold">
            <Text>Max Base Fee</Text>
            <Text>Priority Fee</Text>
            <Text>Gas Limit</Text>
          </Stack>

          <Stack>
            <Text>
              {new Decimal(gasFee.suggestedMaxFeePerGas)
                .sub(gasFee.suggestedMaxPriorityFeePerGas)
                .toDecimalPlaces(4)
                .toString()}
            </Text>
            <Text>
              {new Decimal(gasFee.suggestedMaxPriorityFeePerGas)
                .toDecimalPlaces(4)
                .toString()}
            </Text>
            <Text>{gasLimit}</Text>
          </Stack>
        </HStack>
      )}

      {gasFee &&
        option !== GasOption.SITE_SUGGESTED &&
        option !== GasOption.TEN_PERCENT_INCREASE && (
          <HStack>
            <Switch
              size="md"
              colorScheme="purple"
              isChecked={defaultGasFeeOption === option}
              onChange={(e) => {
                if (e.target.checked && defaultGasFeeOption !== option) {
                  if (option === GasOption.ADVANCED) {
                    setDefaultAdvancedGasFee({
                      maxFeePerGas: gasFee.suggestedMaxFeePerGas,
                      maxPriorityFeePerGas: gasFee.suggestedMaxPriorityFeePerGas
                    })
                  } else {
                    setDefaultGasFeeOption(option)
                  }
                }
              }}
            />

            <Text>
              Use&nbsp;
              <chakra.span fontWeight="medium">
                {optionTitle(option)}
              </chakra.span>
              &nbsp;as default gas fee option.
            </Text>
          </HStack>
        )}
    </Stack>
  )
}

const GasFeeOptionTooltipText = ({
  option,
  origin
}: {
  option: GasOption
  origin: string
}) => {
  switch (option) {
    case GasOption.LOW:
      return (
        <Text>
          Use <chakra.span fontWeight="bold">Low</chakra.span> to wait for a
          cheaper price. Time estimates are mush less accurate as prices are
          somewhat unpredictable.
        </Text>
      )
    case GasOption.MEDIUM:
      return (
        <Text>
          Use <chakra.span fontWeight="bold">Market</chakra.span> for fast
          processing at current market price.
        </Text>
      )
    case GasOption.HIGH:
      return (
        <Text>
          High probability, even in volatile markets. Use&nbsp;
          <chakra.span fontWeight="bold">Aggressive</chakra.span>
          to cover surges in network traffic due to things like popular NFT
          drops.
        </Text>
      )
    case GasOption.ADVANCED:
      return (
        <Text>
          Use <chakra.span fontWeight="bold">Advanced</chakra.span> to customize
          the gas price. This can be confusing if you aren&apos;t familiar.
          Interact at your own risk.
        </Text>
      )
    case GasOption.SITE_SUGGESTED:
      return <Text>{origin} has suggested this price.</Text>
    case GasOption.TEN_PERCENT_INCREASE:
      return <></>
  }
}

const NetworkStatus = ({
  gasFeeEstimates
}: {
  gasFeeEstimates: GasFeeEstimates
}) => {
  const BaseFeeStatus = ({
    placement
  }: {
    placement: PlacementWithLogical
  }) => (
    <Popover isLazy trigger="hover" placement={placement}>
      <PopoverTrigger>
        <Stack spacing={0}>
          <Text h={6}>
            {new Decimal(gasFeeEstimates.estimatedBaseFee)
              .toDecimalPlaces(0)
              .toString()}
            &nbsp;Gwei
          </Text>
          <Text fontWeight="medium">Base fee</Text>
        </Stack>
      </PopoverTrigger>
      <PopoverContent w="240px">
        <PopoverArrow />
        <PopoverBody>
          The base fee is set by the network and changes every 13-14 seconds.
          Our Market and Aggressive options account for sudden increases.
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )

  return (
    <Stack spacing={4}>
      <Text>Network status</Text>

      {!isSourcedGasFeeEstimates(gasFeeEstimates) ? (
        <Stack spacing={2}>
          <Divider />
          <Center>
            <BaseFeeStatus placement="top" />
          </Center>
          <Divider />
        </Stack>
      ) : (
        <HStack justify="space-evenly" h={16}>
          <BaseFeeStatus placement="top-start" />

          <Divider orientation="vertical" />

          <Popover isLazy trigger="hover" placement="top">
            <PopoverTrigger>
              <Stack spacing={0} align="center">
                <Text h={6}>
                  {new Decimal(gasFeeEstimates.latestPriorityFeeRange[0])
                    .toDecimalPlaces(1)
                    .toString()}
                  &nbsp;-&nbsp;
                  {new Decimal(gasFeeEstimates.latestPriorityFeeRange[1])
                    .toDecimalPlaces(0)
                    .toString()}
                  &nbsp;Gwei
                </Text>
                <Text fontWeight="medium">Priority fee</Text>
              </Stack>
            </PopoverTrigger>
            <PopoverContent w="240px">
              <PopoverArrow />
              <PopoverBody>
                Range of priority fees (aka “miner tip”). This goes to miners
                and incentivizes them to prioritize your transaction.
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Divider orientation="vertical" />

          <StatusSlider networkCongestion={gasFeeEstimates.networkCongestion} />
        </HStack>
      )}
    </Stack>
  )
}

const StatusSlider = ({ networkCongestion }: { networkCongestion: number }) => {
  const { status, tooltip, color, sliderValue } =
    determineStatusInfo(networkCongestion)

  return (
    <Popover isLazy trigger="hover" placement="top-end">
      <PopoverTrigger>
        <Stack w={16} spacing={0}>
          <HStack h={6}>
            <Box w="full">
              <Box w="full" ms="-10px">
                <Box
                  position="relative"
                  w={0}
                  h={0}
                  borderX="10px solid transparent"
                  borderTop="10px solid transparent"
                  mb="-2px"
                  ms={sliderValue + '%'}>
                  <Box
                    position="absolute"
                    w={0}
                    h={0}
                    borderX="5px solid transparent"
                    borderTop="5px solid"
                    borderTopColor={color}
                    bottom="3px"
                    left="-5px"
                  />
                </Box>
              </Box>

              <Box
                w="full"
                h="4px"
                borderRadius="100px"
                bgGradient={`linear-gradient(to right,${GRADIENT_COLORS[0]},${
                  GRADIENT_COLORS[GRADIENT_COLORS.length - 1]
                })`}></Box>
            </Box>
          </HStack>

          <Text fontWeight="medium" color={color} textAlign="center">
            {status}
          </Text>
        </Stack>
      </PopoverTrigger>
      <PopoverContent w="240px">
        <PopoverArrow />
        <PopoverBody>{tooltip}</PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

function optionImage(option: GasOption) {
  switch (option) {
    case GasOption.LOW:
      return curveLow
    case GasOption.MEDIUM:
      return curveMedium
    case GasOption.HIGH:
      return curveHigh
    case GasOption.SITE_SUGGESTED:
      return
    case GasOption.ADVANCED:
      return
    case GasOption.TEN_PERCENT_INCREASE:
      return
  }
}

export function optionGasFee(
  option: GasOption,
  gasFeeEstimates: GasFeeEstimates,
  customGasFeePerGas?: MaxFeePerGas,
  siteSuggestedGasFeePerGas?: MaxFeePerGas,
  increasedGasFeePerGas?: MaxFeePerGas
): Eip1559GasFee | undefined {
  switch (option) {
    case GasOption.LOW:
      return gasFeeEstimates.low
    case GasOption.MEDIUM:
      return gasFeeEstimates.medium
    case GasOption.HIGH:
      return gasFeeEstimates.high
    case GasOption.SITE_SUGGESTED:
    // pass through
    case GasOption.TEN_PERCENT_INCREASE:
    // pass through
    case GasOption.ADVANCED:
      const gasFeePerGas =
        option === GasOption.ADVANCED
          ? customGasFeePerGas
          : option === GasOption.SITE_SUGGESTED
          ? siteSuggestedGasFeePerGas
          : increasedGasFeePerGas
      if (!gasFeePerGas) {
        return
      }
      return {
        suggestedMaxPriorityFeePerGas: gasFeePerGas.maxPriorityFeePerGas,
        suggestedMaxFeePerGas: gasFeePerGas.maxFeePerGas
      } as Eip1559GasFee
  }
}

export function optionIcon(option: GasOption) {
  switch (option) {
    case GasOption.LOW:
      return '🐢'
    case GasOption.MEDIUM:
      return '🦊'
    case GasOption.HIGH:
      return '🦍'
    case GasOption.SITE_SUGGESTED:
      return '🌐'
    case GasOption.ADVANCED:
      return '⚙'
    case GasOption.TEN_PERCENT_INCREASE:
      return
  }
}

export function optionTitle(option: GasOption, short = true) {
  switch (option) {
    case GasOption.LOW:
      return 'Low'
    case GasOption.MEDIUM:
      return 'Market'
    case GasOption.HIGH:
      return 'Aggressive'
    case GasOption.SITE_SUGGESTED:
      return short ? 'Site' : 'Site suggested'
    case GasOption.ADVANCED:
      return 'Advanced'
    case GasOption.TEN_PERCENT_INCREASE:
      return '10% increase'
  }
}

function minWaitTime(
  option: GasOption,
  gasFeeEstimates: GasFeeEstimates,
  customGasFeePerGas?: MaxFeePerGas,
  siteSuggestedGasFeePerGas?: MaxFeePerGas,
  increasedGasFeePerGas?: MaxFeePerGas
) {
  switch (option) {
    case GasOption.LOW:
    // pass through
    case GasOption.MEDIUM:
      return gasFeeEstimates.low.maxWaitTimeEstimate
    case GasOption.HIGH:
      return gasFeeEstimates.high.minWaitTimeEstimate
    case GasOption.SITE_SUGGESTED:
    // pass through
    case GasOption.TEN_PERCENT_INCREASE:
    // pass through
    case GasOption.ADVANCED: {
      const gasFeePerGas =
        option === GasOption.ADVANCED
          ? customGasFeePerGas
          : option === GasOption.SITE_SUGGESTED
          ? siteSuggestedGasFeePerGas
          : increasedGasFeePerGas
      if (!gasFeePerGas) {
        return
      }
      let timeEstimate
      if (
        new Decimal(gasFeePerGas.maxPriorityFeePerGas).lt(
          gasFeeEstimates.low.suggestedMaxPriorityFeePerGas
        )
      ) {
        timeEstimate = calculateTimeEstimate(
          gasFeePerGas.maxPriorityFeePerGas,
          gasFeePerGas.maxFeePerGas,
          gasFeeEstimates
        )
      }

      if (timeEstimate?.upperTimeBound !== undefined) {
        return timeEstimate.upperTimeBound
      } else if (
        new Decimal(gasFeePerGas.maxPriorityFeePerGas).gte(
          gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas
        )
      ) {
        return gasFeeEstimates.high.minWaitTimeEstimate
      } else {
        return gasFeeEstimates.low.maxWaitTimeEstimate
      }
    }
  }
}

export function minWaitTimeColor(option: GasOption) {
  switch (option) {
    case GasOption.LOW:
      return 'red.500'
    case GasOption.MEDIUM:
    // pass through
    case GasOption.HIGH:
      return 'green.500'
    case GasOption.SITE_SUGGESTED:
    // pass through
    case GasOption.TEN_PERCENT_INCREASE:
    // pass through
    case GasOption.ADVANCED:
      return undefined
  }
}

export function minWaitTimeText(
  option: GasOption,
  gasFeeEstimates: GasFeeEstimates,
  customGasFeePerGas?: MaxFeePerGas,
  siteSuggestedGasFeePerGas?: MaxFeePerGas,
  increasedGasFeePerGas?: MaxFeePerGas
) {
  const time = minWaitTime(
    option,
    gasFeeEstimates,
    customGasFeePerGas,
    siteSuggestedGasFeePerGas,
    increasedGasFeePerGas
  )
  if (time === undefined) {
    return
  }
  const timeStr = toHumanReadableTime(time, true)

  switch (option) {
    case GasOption.LOW:
      return `Maybe in ${timeStr}`
    case GasOption.MEDIUM:
      return `Likely in < ${timeStr}`
    case GasOption.HIGH:
      return `Very likely in < ${timeStr}`
    case GasOption.SITE_SUGGESTED:
    // pass through
    case GasOption.TEN_PERCENT_INCREASE:
    // pass through
    case GasOption.ADVANCED: {
      const gasFeePerGas =
        option === GasOption.ADVANCED
          ? customGasFeePerGas
          : option === GasOption.SITE_SUGGESTED
          ? siteSuggestedGasFeePerGas
          : increasedGasFeePerGas
      if (!gasFeePerGas) {
        return
      }
      if (
        new Decimal(gasFeePerGas.maxPriorityFeePerGas).gte(
          gasFeeEstimates.high.suggestedMaxPriorityFeePerGas
        )
      ) {
        return `Very likely in < ${timeStr}`
      } else if (
        new Decimal(gasFeePerGas.maxPriorityFeePerGas).gte(
          gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas
        )
      ) {
        return `Likely in < ${timeStr}`
      } else {
        return `Maybe in ${timeStr}`
      }
    }
  }
}

function maxFeeColor(option: GasOption) {
  switch (option) {
    case GasOption.HIGH:
      return 'red.500'
    default:
      return undefined
  }
}

const MINUTE_CUTOFF = 90 * 60
const SECOND_CUTOFF = 90

function toHumanReadableTime(time?: number, long = false) {
  if (time === undefined || time === null) {
    return '--'
  }
  const seconds = Math.ceil(time / 1000)
  if (seconds <= SECOND_CUTOFF) {
    return seconds + (long ? ' seconds' : 's')
  }
  if (seconds <= MINUTE_CUTOFF) {
    return Math.ceil(seconds / 60) + (long ? ' minutes' : 'm')
  }
  return Math.ceil(seconds / 3600) + (long ? ' hours' : 'h')
}

const GRADIENT_COLORS = [
  '#037DD6',
  '#1876C8',
  '#2D70BA',
  '#4369AB',
  '#57629E',
  '#6A5D92',
  '#805683',
  '#9A4D71',
  '#B44561',
  '#C54055',
  '#D73A49'
]

export const NETWORK_CONGESTION_THRESHOLDS = {
  NOT_BUSY: 0,
  STABLE: 0.33,
  BUSY: 0.66
}

const determineStatusInfo = (networkCongestion: number) => {
  networkCongestion = networkCongestion ?? 0.5
  const colorIndex = Math.round(networkCongestion * 10)
  const color = GRADIENT_COLORS[colorIndex]
  const sliderValue = colorIndex * 10

  const Tooltip = ({ status }: { status: string }) => {
    return (
      <>
        Gas fees are <chakra.span>{status}</chakra.span> relative to the past 72
        hours.
      </>
    )
  }

  if (networkCongestion >= NETWORK_CONGESTION_THRESHOLDS.BUSY) {
    return {
      status: 'Busy',
      tooltip: <Tooltip status="high" />,
      color,
      sliderValue
    }
  } else if (networkCongestion >= NETWORK_CONGESTION_THRESHOLDS.STABLE) {
    return {
      status: 'Stable',
      tooltip: <Tooltip status="stable" />,
      color,
      sliderValue
    }
  }
  return {
    status: 'Not busy',
    tooltip: <Tooltip status="low" />,
    color,
    sliderValue
  }
}
