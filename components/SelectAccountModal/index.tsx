import {
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack
} from '@chakra-ui/react'
import { FiSearch } from '@react-icons/all-files/fi/FiSearch'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { useWalletTreeState } from '~lib/hooks/useWalletTreeState'
import { CompositeAccount, INetwork } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/wallet'
import {
  WalletEntry,
  filterWalletTreeBySearch,
  useWalletTree
} from '~lib/services/wallet/tree'

import { WalletList } from './WalletList'

export const SelectAccountModal = ({
  network,
  account,
  setAccount,
  allowNullAddress,
  isOpen,
  onClose
}: {
  network?: INetwork
  account?: CompositeAccount
  setAccount?: (account: CompositeAccount) => void
  allowNullAddress?: boolean
  isOpen: boolean
  onClose: () => void
}) => {
  const [search, setSearch] = useState('')

  const filter = useCallback(
    (entries: WalletEntry[]) => {
      return filterWalletTreeBySearch(entries, search)
    },
    [search]
  )

  const [_search, _setSearch] = useState('')
  useDebounce(
    () => {
      setSearch(_search)
    },
    300,
    [_search]
  )

  const { wallets, selected, setSelected } = useWalletTree<WalletId>(
    network,
    filter
  )

  useEffect(() => {
    if (!account && selected) {
      setSelected(undefined)
    } else if (
      account &&
      (!selected ||
        selected.id !== account.wallet.id ||
        selected.subId !== account.subWallet.id)
    ) {
      setSelected({
        id: account.wallet.id,
        subId: account.subWallet.id
      })
    }
  }, [account, selected, setSelected])

  const onSelected = useCallback(
    async ({ id, subId }: WalletId) => {
      const wallet = await WALLET_SERVICE.getWallet(id)
      const subWallet = await WALLET_SERVICE.getSubWallet(subId)
      if (!network || !wallet || !subWallet) {
        return
      }
      const account = await WALLET_SERVICE.getChainAccount({
        masterId: wallet.id,
        index: subWallet.index,
        networkKind: network.kind,
        chainId: network.chainId
      })
      if (!account) {
        return
      }
      if (!account.address && !allowNullAddress) {
        return
      }

      setAccount?.({
        wallet,
        subWallet,
        account
      })
      setSelected({ id, subId })

      onClose()
    },
    [network, onClose, setAccount, allowNullAddress, setSelected]
  )

  const { state, setScrollOffset, setSubScrollOffset, toggleOpen } =
    useWalletTreeState()

  if (!wallets) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusOnClose={false}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalHeader>Select Account</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          {isOpen && (
            <Stack spacing={4} px={4} pb={4}>
              <InputGroup w="full" size="md">
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} />
                </InputLeftElement>
                <Input
                  placeholder="Search wallet or account"
                  value={_search}
                  onChange={(e) => _setSearch(e.target.value)}
                />
              </InputGroup>

              <WalletList
                network={network}
                wallets={wallets}
                openState={state.isOpen}
                onToggleOpen={toggleOpen}
                onSelected={onSelected}
                onClose={onClose}
                setScrollOffset={setScrollOffset}
                setSubScrollOffset={setSubScrollOffset}
              />
            </Stack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
