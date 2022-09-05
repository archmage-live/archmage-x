import {
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
import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/all'
import { useDebounce } from 'react-use'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { SwitchBar } from '~components/SwitchBar'
import { useActive, useActiveNetwork } from '~lib/active'
import { ITokenList } from '~lib/schema'
import { TOKEN_SERVICE, useTokenLists } from '~lib/services/token'
import { TokenList, TokenVisible } from '~pages/Popup/Assets/TokenList'

import { TokenListItem } from './TokenListItem'

const TABS = ['Lists', 'Tokens'] as const

export const ManageTokens = ({
  setTitle,
  setTokenList
}: {
  setTitle: (title: string) => void
  setTokenList: (tokenList: ITokenList) => void
}) => {
  useEffect(() => {
    setTitle('Manage Token Lists')
  }, [setTitle])

  const [tab, setTab] = useState<typeof TABS[number]>('Lists')

  const { network } = useActive()

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTokenList, setNewTokenList] = useState<ITokenList>()
  const [alert, setAlert] = useState('')

  useEffect(() => {
    setNewTokenList(undefined)
    setAlert('')
  }, [search])

  useDebounce(
    async () => {
      if (!network || !search) {
        return
      }
      setLoading(true)
      const tokenList = await TOKEN_SERVICE.fetchTokenList(
        network.kind,
        search.trim()
      )
      setLoading(false)
      setNewTokenList(tokenList)
      if (!tokenList) {
        setAlert('Please enter valid list location')
      }
    },
    1000,
    [network, search]
  )

  const { nextStep } = useWizard()

  const [tabIndex, setTabIndex] = useState(0)
  useEffect(() => {
    setTabIndex(tab === 'Lists' ? 0 : 1)
  }, [tab])

  return (
    <Stack spacing={6} pt={8}>
      <SwitchBar targets={TABS} value={tab} onChange={setTab as any} />

      <InputGroup w="full" size="lg">
        <InputLeftElement pointerEvents="none">
          {loading ? <Spinner size="xs" /> : <Icon as={FiSearch} />}
        </InputLeftElement>
        <Input
          placeholder="https:// or ipfs:// or ENS name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            <TokenList visible={TokenVisible.ONLY_WHITELIST} />
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
        tokenLists?.map((tokenList) => {
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
