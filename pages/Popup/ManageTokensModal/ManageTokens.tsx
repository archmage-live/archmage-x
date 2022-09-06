import {
  Checkbox,
  Divider,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Stack,
  TabPanel,
  TabPanels,
  Tabs
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/all'
import { useDebounce } from 'react-use'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { SwitchBar } from '~components/SwitchBar'
import { useActive, useActiveNetwork } from '~lib/active'
import { IToken, ITokenList, TokenVisibility } from '~lib/schema'
import { TOKEN_SERVICE, useTokenLists } from '~lib/services/token'
import { TokenItem } from '~pages/Popup/Assets/TokenItem'
import { TokenList, TokenVisible } from '~pages/Popup/Assets/TokenList'

import { TokenListItem } from './TokenListItem'

const TABS = ['Lists', 'Tokens'] as const

export const ManageTokens = ({
  setTitle,
  setTokenList,
  setToken
}: {
  setTitle: (title: string) => void
  setTokenList: (tokenList: ITokenList | undefined) => void
  setToken: (token: IToken | undefined) => void
}) => {
  useEffect(() => {
    setTitle('Manage Token Lists')
  }, [setTitle])

  const [tab, setTab] = useState<typeof TABS[number]>('Lists')
  const [tabIndex, setTabIndex] = useState(0)
  useEffect(() => {
    setTabIndex(tab === 'Lists' ? 0 : 1)
  }, [tab])

  const { network, account } = useActive()

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTokenList, setNewTokenList] = useState<ITokenList>()
  const [newToken, setNewToken] = useState<IToken>()
  const [alert, setAlert] = useState('')
  const [, setFetchCounter] = useState(0)

  useEffect(() => {
    setLoading(false)
    setNewTokenList(undefined)
    setNewToken(undefined)
    setAlert('')
  }, [search, tab])
  useEffect(() => {
    setSearch('')
  }, [tab])

  const fetch = useCallback(async () => {
    if (!network || !account || !search) {
      return
    }

    let fetchCounter: number
    setFetchCounter((c) => {
      fetchCounter = c + 1
      return fetchCounter
    })
    setLoading(true)

    let tokenList: ITokenList | undefined, token: IToken | undefined
    if (network && account && search) {
      if (tab === 'Lists') {
        tokenList = await TOKEN_SERVICE.fetchTokenList(network.kind, search)
      } else {
        token = await TOKEN_SERVICE.searchToken(account, search)
      }
    }

    setFetchCounter((c) => {
      // if no new fetch
      if (c === fetchCounter) {
        setSearch((s) => {
          // if no new search
          if (s === search) {
            setLoading(false)
            if (tab === 'Lists') {
              setNewTokenList(tokenList)
              if (!tokenList) {
                setAlert('Please enter valid list location')
              }
            } else {
              setNewToken(token)
              if (!token) {
                setAlert('Please enter valid token address')
              }
            }
          }
          return s
        })
      }
      return c
    })
  }, [account, network, search, tab])

  useDebounce(fetch, 1000, [fetch])

  const onTokenChange = useCallback(
    (token: IToken) => {
      if (token.token.toLowerCase() === newToken?.token.toLowerCase()) {
        fetch()
      }
    },
    [fetch, newToken]
  )

  const [showBlacklisted, setShowBlacklisted] = useState(false)

  const { nextStep } = useWizard()

  return (
    <Stack spacing={6} pt={8}>
      <SwitchBar targets={TABS} value={tab} onChange={setTab as any} />

      <InputGroup w="full" size="lg">
        <InputLeftElement pointerEvents="none">
          {loading ? <Spinner size="xs" /> : <Icon as={FiSearch} />}
        </InputLeftElement>
        <Input
          placeholder={
            tab === 'Lists'
              ? 'https:// or ipfs:// or ENS name'
              : 'Token contract address'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value.trim())}
        />
      </InputGroup>

      <AlertBox>{alert}</AlertBox>

      {network && newTokenList && (
        <TokenListItem
          network={network}
          tokenList={newTokenList}
          undetermined="import"
          onImport={() => {
            setTokenList(newTokenList)
            setToken(undefined)
            nextStep()
          }}
        />
      )}

      {newToken && (
        <TokenItem
          token={newToken}
          undetermined="import"
          onClick={() => {
            if (
              typeof newToken.id === 'number' &&
              newToken.visible === TokenVisibility.UNSPECIFIED
            ) {
              TOKEN_SERVICE.setTokenVisibility(
                newToken.id,
                TokenVisibility.SHOW
              ).then(fetch)
              return
            }
            setToken(newToken)
            setTokenList(undefined)
            nextStep()
          }}
        />
      )}

      <Divider />

      <Tabs index={tabIndex}>
        <TabPanels>
          <TabPanel p={0}>
            <TokenLists />
          </TabPanel>
          <TabPanel p={0}>
            <Stack spacing={4}>
              <Checkbox
                colorScheme="purple"
                isChecked={showBlacklisted}
                onChange={(e) => setShowBlacklisted(e.target.checked)}>
                Show blacklisted tokens
              </Checkbox>
              <TokenList
                visible={
                  showBlacklisted
                    ? TokenVisible.WHTIELIST_AND_BLACKLIST
                    : TokenVisible.ONLY_WHITELIST
                }
                onChange={onTokenChange}
              />
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}

const TokenLists = () => {
  const { network } = useActiveNetwork()
  const tokenLists = useTokenLists(network?.kind)

  return (
    <Stack spacing={4}>
      {network &&
        tokenLists
          ?.sort((a, b) => +b.enabled - +a.enabled)
          .map((tokenList) => {
            return (
              <TokenListItem
                key={tokenList.id}
                network={network}
                tokenList={tokenList}
              />
            )
          })}
    </Stack>
  )
}
