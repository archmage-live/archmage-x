import {
  Center,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Stack,
  Switch,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/all'
import { BiQuestionMark } from 'react-icons/bi'
import { MdOutlineSettings } from 'react-icons/md'
import browser from 'webextension-polyfill'

import { SwitchBar } from '~components/SwitchBar'
import { useTransparentize } from '~hooks/useColor'
import { useActiveNetwork } from '~lib/active'
import { INetwork, ITokenList } from '~lib/schema'
import { EvmProvider } from '~lib/services/provider/evm'
import {
  TOKEN_SERVICE,
  getTokenListBrief,
  useTokenLists
} from '~lib/services/token'

const TABS = ['Lists', 'Tokens'] as const

export default function ManageTokens() {
  const [tab, setTab] = useState<typeof TABS[number]>('Lists')

  return (
    <Stack spacing={6} py={4}>
      <SwitchBar targets={TABS} value={tab} onChange={setTab as any} />

      <InputGroup w="full" size="lg">
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} />
        </InputLeftElement>
        <Input placeholder="https:// or ipfs:// or ENS name" />
      </InputGroup>

      <Divider />

      <TokenLists />
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

const TokenListItem = ({
  network,
  tokenList
}: {
  network: INetwork
  tokenList: ITokenList
}) => {
  const brief = getTokenListBrief(tokenList)

  const [iconUrl, setIconUrl] = useState<string | undefined>()
  useEffect(() => {
    const effect = async () => {
      if (!brief.iconUrl) return
      const provider = await EvmProvider.from(network)
      setIconUrl(await provider.resolveUrl(brief.iconUrl))
    }

    effect()
  }, [network, brief])

  const [enabled, setEnabled] = useState(brief.enabled)

  const bg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const enabledBg = useTransparentize('purple.500', 'purple.500')
  const color = enabled ? 'white' : undefined

  return (
    <HStack
      w="full"
      h="63px"
      p={4}
      borderRadius="8px"
      justify="space-between"
      bg={enabled ? enabledBg : bg}>
      <Image
        borderRadius="full"
        boxSize="28px"
        fit="cover"
        src={iconUrl}
        fallback={
          <Center
            w={8}
            h={8}
            borderRadius="full"
            borderWidth="1px"
            borderColor="gray.500"
            bg={useColorModeValue('white', 'gray.800')}>
            <Icon as={BiQuestionMark} fontSize="xl" />
          </Center>
        }
        alt="Token Icon"
      />

      <HStack w="calc(100% - 35px)" justify="space-between">
        <Stack align="start" maxW="65%" spacing={0}>
          <Text
            fontWeight="medium"
            noOfLines={1}
            display="block"
            maxW="full"
            color={color}>
            {brief.name}
          </Text>

          <HStack>
            <Text fontSize="sm" color={color}>
              {brief.tokenCount} tokens
            </Text>

            <Menu placement="right" autoSelect={false}>
              <MenuButton
                variant="link"
                minW={0}
                as={IconButton}
                icon={
                  <Icon boxSize="14px" color={color} as={MdOutlineSettings} />
                }
              />
              <MenuList>
                <MenuGroup title={brief.desc}>
                  <MenuItem
                    onClick={() => {
                      browser.tabs.create({ url: brief.url })
                    }}>
                    View List
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      TOKEN_SERVICE.deleteTokenList(tokenList.id)
                    }}>
                    Remove List
                  </MenuItem>
                </MenuGroup>
              </MenuList>
            </Menu>
          </HStack>
        </Stack>

        <Switch
          size="lg"
          colorScheme="whiteAlpha"
          isChecked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked)
            if (e.target.checked !== brief.enabled) {
              TOKEN_SERVICE.enableTokenList(tokenList.id, e.target.checked)
            }
          }}
        />
      </HStack>
    </HStack>
  )
}
