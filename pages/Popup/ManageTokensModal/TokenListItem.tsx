import {
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Stack,
  Switch,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import { FiCheckCircle } from 'react-icons/fi'
import { MdOutlineSettings } from 'react-icons/md'
import browser from 'webextension-polyfill'

import { INetwork, ITokenList } from '~lib/schema'
import { EvmProvider } from '~lib/services/provider/evm'
import { TOKEN_SERVICE, getTokenListBrief } from '~lib/services/token'

export const TokenListItem = ({
  network,
  tokenList,
  undetermined,
  onImport
}: {
  network: INetwork
  tokenList: ITokenList
  undetermined?: 'import' | 'display'
  onImport?: () => void
}) => {
  const existing = typeof tokenList.id === 'number'
  const brief = getTokenListBrief(tokenList, network.chainId)

  const [iconUrl, setIconUrl] = useState<string | undefined>()
  useEffect(() => {
    const effect = async () => {
      if (!brief.iconUrl) return
      const provider = await EvmProvider.from(network)
      setIconUrl(await provider.resolveUrl(brief.iconUrl))
    }

    effect()
  }, [network, brief])

  const [enabled, setEnabled] = useState(!undetermined ? brief.enabled : false)

  const bg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const enabledBg = 'purple.500'
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
        alt="Token List Icon"
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

            {!undetermined && (
              <Menu isLazy placement="right" autoSelect={false}>
                <MenuButton
                  variant="link"
                  minW={0}
                  as={IconButton}
                  icon={
                    <Icon boxSize="14px" color={color} as={MdOutlineSettings} />
                  }
                />
                <Portal>
                  <MenuList minW={32} zIndex={1500}>
                    <MenuGroup title={brief.desc}>
                      <MenuItem
                        onClick={() => {
                          browser.tabs.create({ url: brief.url })
                        }}>
                        View list
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          TOKEN_SERVICE.deleteTokenList(tokenList.id)
                        }}>
                        Remove list
                      </MenuItem>
                    </MenuGroup>
                  </MenuList>
                </Portal>
              </Menu>
            )}
          </HStack>
        </Stack>

        {!undetermined ? (
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
        ) : (
          undetermined === 'import' && (
            <Button
              borderRadius="28px"
              size="sm"
              leftIcon={existing ? <Icon as={FiCheckCircle} /> : undefined}
              disabled={existing}
              onClick={onImport}>
              {existing ? 'Loaded' : 'Import'}
            </Button>
          )
        )}
      </HStack>
    </HStack>
  )
}
