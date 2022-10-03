import { Button, Icon, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { MdOutlineFormatListBulleted } from 'react-icons/md'

import { useActive, useActiveAccount } from '~lib/active'
import { IToken, TokenVisibility } from '~lib/schema'
import { useCoinGeckoTokensPrice } from '~lib/services/datasource/coingecko'
import { useTokens } from '~lib/services/token'
import { ManageTokensModal } from '~pages/Popup/ManageTokensModal'

import { useTokenDetailModal } from './TokenDetail'
import { TokenItem } from './TokenItem'

export enum TokenVisible {
  ONLY_WHITELIST,
  ONLY_BLACKLIST,
  WHITELIST_AND_BLACKLIST,
  INCLUDES_WHITELIST,
  ALL
}

export const TokenList = ({
  onClick,
  visible = TokenVisible.INCLUDES_WHITELIST,
  onChange
}: {
  onClick?: (token: IToken) => void
  visible?: TokenVisible
  onChange?: (token: IToken) => void
}) => {
  const { network, account } = useActive()
  const { tokens } = useTokens(account)

  const { currencySymbol, prices, changes24Hour } =
    useCoinGeckoTokensPrice(
      network,
      tokens?.map((t) => t.token)
    ) || {}

  return (
    <Stack w="full" spacing={4}>
      {tokens
        ?.filter((token) => {
          switch (visible) {
            case TokenVisible.ONLY_WHITELIST:
              return token.visible === TokenVisibility.SHOW
            case TokenVisible.ONLY_BLACKLIST:
              return token.visible === TokenVisibility.HIDE
            case TokenVisible.WHITELIST_AND_BLACKLIST:
              return token.visible !== TokenVisibility.UNSPECIFIED
            case TokenVisible.INCLUDES_WHITELIST:
              return token.visible !== TokenVisibility.HIDE
            case TokenVisible.ALL:
              return true
          }
        })
        .map((token) => {
          return (
            <TokenItem
              key={token.id}
              token={token}
              currencySymbol={currencySymbol}
              price={prices?.get(token.token)}
              change24Hour={changes24Hour?.get(token.token)}
              onClick={() => onClick?.(token)}
              onChange={() => onChange?.(token)}
            />
          )
        })}
    </Stack>
  )
}

export const TokenListSection = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const account = useActiveAccount()
  const { fetchTokens } = useTokens(account)

  const { onOpen: onTokenDetailOpen, setToken } = useTokenDetailModal()

  return (
    <Stack w="full" align="center" spacing={4}>
      <TokenList
        onClick={(token) => {
          setToken(token)
          onTokenDetailOpen()
        }}
      />

      <Button
        w={56}
        size="md"
        leftIcon={<Icon color="gray.500" as={MdOutlineFormatListBulleted} />}
        variant="ghost"
        onClick={onOpen}>
        <Text color="gray.500">Manage Token Lists</Text>
      </Button>

      <ManageTokensModal
        isOpen={isOpen}
        onClose={() => {
          onClose()
          fetchTokens()
        }}
      />
    </Stack>
  )
}
