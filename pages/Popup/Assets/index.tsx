import {
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  Stack,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'
import { MdMoreVert } from 'react-icons/md'

import { useBalance } from '~lib/services/provider'
import { useWalletInfo } from '~lib/services/walletService'
import { shortenAddress } from '~lib/utils'

import { useActiveWallet, useSelectedNetwork } from '../select'

export default function Assets() {
  const { wallet, subWallet } = useActiveWallet()
  const { selectedNetwork: network } = useSelectedNetwork()

  const info = useWalletInfo(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )

  const connected = true

  const { hasCopied, onCopy } = useClipboard('')

  const balance = useBalance(network, info)

  return (
    <Stack w="full" pt={8} spacing={8}>
      <HStack justify="space-between" minH={16}>
        <Center
          w="4"
          h="4"
          mx={2}
          borderRadius="50%"
          bg={connected ? 'red.500' : 'gray.500'}
        />

        <Tooltip label={!hasCopied ? 'Copy Address' : 'Copied'}>
          <Button
            variant="ghost"
            size="lg"
            h={16}
            colorScheme="purple"
            onClick={!hasCopied ? onCopy : undefined}>
            <Stack>
              <Text fontSize="lg">{subWallet?.name}</Text>
              <HStack color="gray.500" ps={5}>
                <Text fontSize="md">{shortenAddress(info?.address, 6)}</Text>
                <Icon w={3} h={3} as={!hasCopied ? FiCopy : FiCheckCircle} />
              </HStack>
            </Stack>
          </Button>
        </Tooltip>

        <Menu>
          <MenuButton
            variant="ghost"
            as={IconButton}
            icon={<Icon as={MdMoreVert} fontSize="xl" />}
          />
        </Menu>
      </HStack>

      <HStack justify="center" minH={16}>
        <Text fontSize="4xl" fontWeight="medium">
          {balance?.amount} {balance?.symbol}
        </Text>
      </HStack>

      <HStack justify="center" spacing={4}>
        <Button size="md" w={28}>
          Deposit
        </Button>
        <Button size="md" w={28}>
          Send
        </Button>
      </HStack>
    </Stack>
  )
}
