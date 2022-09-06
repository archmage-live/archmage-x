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
  Portal,
  Stack,
  Text,
  forwardRef,
  useColorModeValue
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { useCallback } from 'react'
import { VscQuestion } from 'react-icons/all'
import { BiQuestionMark } from 'react-icons/bi'
import { FiCheckCircle } from 'react-icons/fi'
import { IoMdSwap } from 'react-icons/io'
import {
  MdBlockFlipped,
  MdMoreVert,
  MdOutlineCheckCircle
} from 'react-icons/md'

import { formatNumber } from '~lib/formatNumber'
import { IToken, ITokenList, TokenVisibility } from '~lib/schema'
import {
  TOKEN_SERVICE,
  getTokenBrief,
  getTokenListBrief
} from '~lib/services/token'

export const TokenItem = ({
  token,
  tokenList,
  undetermined,
  currencySymbol,
  price,
  change24Hour,
  onClick,
  onChange
}: {
  token: IToken
  tokenList?: ITokenList
  undetermined?: 'import' | 'display'
  currencySymbol?: string
  price?: number
  change24Hour?: number | null
  onClick?: () => void
  onChange?: () => void
}) => {
  const brief = getTokenBrief(token)

  const tokenListBrief =
    tokenList && getTokenListBrief(tokenList, token.chainId)

  const existing = typeof token.id === 'number'

  const setTokenVisibility = useCallback(
    async (visible: TokenVisibility) => {
      await TOKEN_SERVICE.setTokenVisibility(token.id, visible)
      onChange?.()
    },
    [onChange, token]
  )

  let title1, title2, icon1, icon2, onClick1, onClick2
  switch (token.visible) {
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

  return (
    <Button
      as={undetermined ? Box : undefined}
      size="lg"
      w="full"
      h="63px"
      px={4}
      justifyContent="start"
      variant="solid-secondary"
      borderWidth={token.visible === TokenVisibility.HIDE ? '1px' : undefined}
      borderColor="red.500"
      onClick={!undetermined ? onClick : undefined}>
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
          w={!undetermined ? 'calc(100% - 56px)' : 'calc(100% - 35px)'}
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

          {!undetermined && (
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

          {undetermined === 'import' && (
            <Button
              borderRadius="28px"
              size="sm"
              leftIcon={
                existing && token.visible !== TokenVisibility.UNSPECIFIED ? (
                  <Icon as={FiCheckCircle} />
                ) : undefined
              }
              disabled={
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

        {!undetermined && (
          <Menu isLazy autoSelect={false} placement="left">
            <MenuButton as={IconBtn} />
            <Portal>
              <MenuList minW={32} zIndex={1500}>
                <MenuGroup title={brief.name}>
                  <MenuItem
                    icon={<Icon as={IoMdSwap} />}
                    iconSpacing={2}
                    onClick={() => {}}>
                    Detail
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
        )}
      </HStack>
    </Button>
  )
}

const IconBtn = forwardRef<BoxProps, 'div'>((props, ref) => (
  <Box
    ref={ref}
    color={useColorModeValue('gray.500', 'gray.200')}
    _active={{ color: useColorModeValue('gray.700', 'gray.500') }}
    {...props}>
    <Icon as={MdMoreVert} fontSize="xl" />
  </Box>
))
