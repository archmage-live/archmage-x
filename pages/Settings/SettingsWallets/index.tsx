import {
  Button,
  HStack,
  Icon,
  ListItem,
  SimpleGrid,
  Stack,
  UnorderedList
} from '@chakra-ui/react'
import { MdDragIndicator } from '@react-icons/all-files/md/MdDragIndicator'
import { useMemo, useState } from 'react'
import { useTimeout } from 'react-use'

import { NetworkSelectCombiner } from '~components/NetworkSelect'
import { INetwork } from '~lib/schema'
import { useWalletTree } from '~lib/services/wallet/tree'
import { createTab } from '~lib/tab'

import { SubWalletEdit } from './SubWalletEdit'
import { WalletEdit } from './WalletEdit'
import { WalletList } from './WalletList'

export const SettingsWallets = () => {
  const [network, setNetwork] = useState<INetwork>()

  const { wallets, toggleOpen, setSelected } = useWalletTree(network)

  const [selectedWallet, selectedSubWallet] = useMemo(() => {
    if (!wallets?.length) {
      return []
    }
    let selectedWallet, selectedSubWallet
    for (const { wallet, isSelected, subWallets } of wallets) {
      if (isSelected) {
        selectedWallet = wallet

        selectedSubWallet = subWallets.find(
          ({ isSelected }) => isSelected
        )?.subWallet

        break
      }
    }
    return [selectedWallet, selectedSubWallet]
  }, [wallets])

  const [isReady] = useTimeout(50)

  return (
    <Stack spacing={12} h="full">
      <SimpleGrid columns={2} spacing={16} h="full">
        <Stack spacing={6}>
          <NetworkSelectCombiner onSet={setNetwork} />

          <Stack spacing={6} visibility={isReady() ? 'visible' : 'hidden'}>
            {wallets && (
              <WalletList
                walletEntries={wallets}
                onToggleOpen={toggleOpen}
                onSelected={setSelected}
              />
            )}

            <UnorderedList
              fontSize="sm"
              color="gray.500"
              ps={4}
              sx={{ listStyle: "'* ' outside" }}>
              <ListItem>
                Double-click any wallet entry to expand or collapse its account
                list.
              </ListItem>
              <ListItem>
                Press icon&nbsp;
                <Icon
                  as={MdDragIndicator}
                  fontSize="lg"
                  fontWeight="medium"
                  verticalAlign="sub"
                />
                &nbsp;at the right side of any entry and drag to the desired
                position to specify its order in the list.
              </ListItem>
            </UnorderedList>
          </Stack>
        </Stack>

        <Stack spacing={6}>
          <HStack justify="end">
            <Button
              size="md"
              colorScheme="purple"
              onClick={async () => {
                await createTab('#/tab/add-wallet')
              }}>
              Add Wallet
            </Button>
          </HStack>

          {selectedWallet &&
            network &&
            (selectedSubWallet ? (
              <SubWalletEdit
                network={network}
                wallet={selectedWallet}
                subWallet={selectedSubWallet}
                onDelete={() => {
                  setSelected(undefined)
                }}
              />
            ) : (
              <WalletEdit
                network={network}
                wallet={selectedWallet}
                onDelete={() => {
                  setSelected(undefined)
                }}
              />
            ))}
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
