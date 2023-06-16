import {
  Box,
  BoxProps,
  Button,
  Center,
  HStack,
  Icon,
  Image,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Portal,
  Stack,
  Text,
  forwardRef,
  useDisclosure
} from '@chakra-ui/react'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { IoMdSwap } from '@react-icons/all-files/io/IoMdSwap'
import { MdBlockFlipped } from '@react-icons/all-files/md/MdBlockFlipped'
import { MdMoreVert } from '@react-icons/all-files/md/MdMoreVert'
import { MdOutlineCheckCircle } from '@react-icons/all-files/md/MdOutlineCheckCircle'
import { VscQuestion } from '@react-icons/all-files/vsc/VscQuestion'
import Decimal from 'decimal.js'
import { useCallback } from 'react'
import * as React from 'react'
import browser from 'webextension-polyfill'

import { BtnBox } from '~components/BtnBox'
import { CopyArea } from '~components/CopyIcon'
import { useActiveNetwork } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { IToken, ITokenList, TokenVisibility } from '~lib/schema'
import { getTokenUrl } from '~lib/services/network'
import {
  NativeToken,
  TOKEN_SERVICE,
  getNativeTokenBrief,
  getTokenBrief,
  getTokenListBrief
} from '~lib/services/token'

export enum TokenItemStyle {
  UNSPECIFIED = '',
  IMPORT = 'import',
  DISPLAY = 'display',
  DISPLAY_WITH_PRICE = 'displayWithPrice'
}

export const TokenItem = ({
  token,
  nativeToken,
  tokenList,
  style,
  currencySymbol,
  price,
  change24Hour,
  onClick,
  onChange
}: {
  token?: IToken
  nativeToken?: NativeToken
  tokenList?: ITokenList
  style?: TokenItemStyle
  currencySymbol?: string
  price?: number
  change24Hour?: number | null
  onClick?: () => void
  onChange?: () => void
}) => {
  const brief = token ? getTokenBrief(token) : getNativeTokenBrief(nativeToken!)

  const tokenListBrief =
    token && tokenList && getTokenListBrief(tokenList, token.chainId)

  const existing = typeof token?.id === 'number'

  return (
    <Button
      as={style === TokenItemStyle.IMPORT ? Box : undefined}
      size="lg"
      w="full"
      h="63px"
      px={4}
      justifyContent="start"
      variant="solid-secondary"
      borderWidth={token?.visible === TokenVisibility.HIDE ? '1px' : undefined}
      borderColor="red.500"
      onClick={style !== TokenItemStyle.IMPORT ? onClick : undefined}>
      <HStack w="full" justify="space-between" fontWeight="normal">
        <Image
          borderRadius="full"
          boxSize="28px"
          fit="cover"
          src={brief.iconUrl}
          fallback={
            <Center
              w={8}
              h={8}
              borderRadius="full"
              borderWidth="1px"
              borderColor="gray.500">
              <Icon as={BiQuestionMark} fontSize="xl" />
            </Center>
          }
          alt="Token Icon"
        />

        <HStack
          w={!style ? 'calc(100% - 56px)' : 'calc(100% - 35px)'}
          justify="space-between">
          <Stack align="start" maxW={!tokenListBrief ? '50%' : '65%'}>
            <Stack maxW="full" spacing={0}>
              <Text
                fontWeight="medium"
                fontSize="md"
                noOfLines={1}
                display="block"
                maxW="full">
                {brief.name}
              </Text>

              {tokenListBrief && (
                <Text
                  fontWeight="medium"
                  fontSize="sm"
                  color="gray.500"
                  noOfLines={1}
                  display="block"
                  maxW="full">
                  via {tokenListBrief.name}
                  <Image
                    borderRadius="full"
                    boxSize="14px"
                    fit="cover"
                    src={tokenListBrief.iconUrl}
                    fallback={<></>}
                    alt="Token List Icon"
                  />
                </Text>
              )}
            </Stack>

            <Text
              fontWeight="medium"
              fontSize="sm"
              color="gray.500"
              noOfLines={1}
              display="block"
              maxW="full">
              {formatNumber(brief.balance.amount)}
              &nbsp;
              {brief.balance.symbol}
            </Text>
          </Stack>

          {(!style || style === TokenItemStyle.DISPLAY_WITH_PRICE) && (
            <Stack maxW="50%" align="end">
              <Text
                fontWeight="medium"
                fontSize="md"
                noOfLines={1}
                display="block"
                maxW="full">
                {currencySymbol}&nbsp;
                {formatNumber(
                  price && new Decimal(price).mul(brief.balance.amount)
                )}
              </Text>

              <Text
                fontWeight="medium"
                fontSize="sm"
                noOfLines={1}
                display="block"
                maxW="full"
                color={
                  typeof change24Hour !== 'number' || change24Hour === 0
                    ? 'gray.500'
                    : change24Hour > 0
                    ? 'green.500'
                    : 'red.500'
                }>
                {typeof change24Hour !== 'number'
                  ? undefined
                  : change24Hour >= 0
                  ? '+'
                  : '-'}
                {currencySymbol}&nbsp;
                {formatNumber(
                  change24Hour &&
                    new Decimal(change24Hour)
                      .abs()
                      .mul(brief.balance.amount)
                      .div(100)
                )}
              </Text>
            </Stack>
          )}

          {style === TokenItemStyle.IMPORT && (
            <Button
              borderRadius="28px"
              size="sm"
              leftIcon={
                existing && token.visible !== TokenVisibility.UNSPECIFIED ? (
                  <Icon as={FiCheckCircle} />
                ) : undefined
              }
              isDisabled={
                existing && token.visible !== TokenVisibility.UNSPECIFIED
              }
              onClick={onClick}>
              {!existing
                ? 'Import'
                : token.visible === TokenVisibility.UNSPECIFIED
                ? 'Whitelist'
                : token.visible === TokenVisibility.HIDE
                ? 'Blocked'
                : 'Active'}
            </Button>
          )}
        </HStack>

        {!style && token && (
          <Box onClick={(event) => event.stopPropagation()}>
            <TokenMenu token={token} onChange={onChange} />
          </Box>
        )}
      </HStack>
    </Button>
  )
}

export const TokenMenu = ({
  token,
  onChange
}: {
  token: IToken
  onChange?: () => void
}) => {
  const brief = getTokenBrief(token)

  const setTokenVisibility = useCallback(
    async (visible: TokenVisibility) => {
      if (!token) return
      await TOKEN_SERVICE.setTokenVisibility(token.id, visible)
      onChange?.()
    },
    [onChange, token]
  )

  let title1, title2, icon1, icon2, onClick1, onClick2
  switch (token?.visible) {
    case TokenVisibility.UNSPECIFIED:
      title1 = 'Blacklist'
      title2 = 'Whitelist'
      icon1 = MdBlockFlipped
      icon2 = MdOutlineCheckCircle
      onClick1 = () => setTokenVisibility(TokenVisibility.HIDE)
      onClick2 = () => setTokenVisibility(TokenVisibility.SHOW)
      break
    case TokenVisibility.SHOW:
      title1 = 'Blacklist'
      title2 = 'Unwhitelist'
      icon1 = MdBlockFlipped
      icon2 = VscQuestion
      onClick1 = () => setTokenVisibility(TokenVisibility.HIDE)
      onClick2 = () => setTokenVisibility(TokenVisibility.UNSPECIFIED)
      break
    case TokenVisibility.HIDE:
      title1 = 'Unblacklist'
      title2 = 'Whitelist'
      icon1 = VscQuestion
      icon2 = MdOutlineCheckCircle
      onClick1 = () => setTokenVisibility(TokenVisibility.UNSPECIFIED)
      onClick2 = () => setTokenVisibility(TokenVisibility.SHOW)
      break
  }

  const {
    isOpen: isInfoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose
  } = useDisclosure()

  return (
    <>
      <Menu isLazy autoSelect={false} placement="left">
        <MenuButton as={MenuBtn} />
        <Portal>
          <MenuList minW={32} zIndex={1500}>
            <MenuGroup title={brief.name}>
              <MenuItem
                icon={<Icon as={IoMdSwap} />}
                iconSpacing={2}
                onClick={onInfoOpen}>
                Info
              </MenuItem>
              <MenuItem
                icon={<Icon as={icon1} />}
                iconSpacing={2}
                onClick={onClick1}>
                {title1}
              </MenuItem>
              <MenuItem
                icon={<Icon as={icon2} />}
                iconSpacing={2}
                onClick={onClick2}>
                {title2}
              </MenuItem>
            </MenuGroup>
          </MenuList>
        </Portal>
      </Menu>

      <TokenInfoModal token={token} isOpen={isInfoOpen} onClose={onInfoClose} />
    </>
  )
}

const TokenInfoModal = ({
  token,
  isOpen,
  onClose
}: {
  token: IToken
  isOpen: boolean
  onClose: () => void
}) => {
  const network = useActiveNetwork()
  const brief = getTokenBrief(token)
  const tokenUrl = network && getTokenUrl(network, token)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Token Info</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack spacing={6}>
            <Stack>
              <Text fontWeight="medium">Contract Address</Text>
              <CopyArea name="Contract Address" copy={token.token} />
            </Stack>
            <Stack>
              <Text fontWeight="medium">Name</Text>
              <Text>{brief.name}</Text>
            </Stack>
            <Stack>
              <Text fontWeight="medium">Symbol</Text>
              <Text>{brief.balance.symbol}</Text>
            </Stack>
            <Stack>
              <Text fontWeight="medium">Decimals</Text>
              <Text>{brief.balance.decimals}</Text>
            </Stack>
            {tokenUrl && (
              <Stack align="center">
                <Button
                  w="auto"
                  colorScheme="gray"
                  onClick={async () => {
                    await browser.tabs.create({ url: tokenUrl })
                  }}>
                  View token on block explorer
                </Button>
              </Stack>
            )}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const MenuBtn = forwardRef<BoxProps, 'div'>((props, ref) => (
  <BtnBox ref={ref} {...props}>
    <Icon as={MdMoreVert} fontSize="xl" />
  </BtnBox>
))
