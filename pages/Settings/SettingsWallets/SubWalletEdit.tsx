import {
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import browser from 'webextension-polyfill'

import { CopyArea } from '~components/CopyIcon'
import {
  WrappedDeleteWalletModal,
  useDeleteWalletModal
} from '~components/DeleteWalletModal'
import { ExportPrivateKeyModal } from '~components/ExportPrivateKeyModal'
import { HdPathInput } from '~components/HdPathInput'
import { SafeSettings } from '~components/Safe'
import { SubWalletNameEdit, WalletNameEdit } from '~components/WalletNameEdit'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, ISubWallet, IWallet } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useChainAccountByIndex, useHdPath } from '~lib/services/wallet'
import {
  MultisigWalletType,
  getMultisigTypeTitle,
  getWalletTypeTitle,
  hasWalletKeystore,
  isMultisigWallet,
  isWalletGroup
} from '~lib/wallet'

interface SubWalletEditProps {
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  onDelete: () => void
}

export const SubWalletEdit = ({
  network,
  wallet,
  subWallet,
  onDelete
}: SubWalletEditProps) => {
  const account = useChainAccountByIndex(
    wallet.id,
    network.kind,
    network.chainId,
    subWallet.index
  )

  const balance = useBalance(network, account)
  const accountUrl = account && getAccountUrl(network, account)

  const [hdPath] = useHdPath(network.kind, wallet, subWallet.index)

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure()

  const { onOpen: onOpenDeleteWallet } = useDeleteWalletModal()

  return (
    <Stack spacing="12" fontSize="md">
      {isWalletGroup(wallet) ? (
        <>
          <SubWalletNameEdit wallet={wallet} subWallet={subWallet} />

          <Stack>
            <Text fontWeight="medium">Master Wallet: {wallet.name}</Text>

            <Text fontWeight="medium">Index: {subWallet.index}</Text>
          </Stack>
        </>
      ) : (
        <>
          <WalletNameEdit wallet={wallet} />

          <Text fontWeight="medium">Type: {getWalletTypeTitle(wallet)}</Text>
        </>
      )}

      {account?.address ? (
        <Stack>
          <Text fontWeight="medium">Address:</Text>
          <CopyArea
            name="Address"
            copy={account.address}
            noWrap
            props={{
              noOfLines: 2
            }}
          />
        </Stack>
      ) : (
        <Text fontWeight="medium">Address: Not Available</Text>
      )}

      <Text fontWeight="medium">
        Balance:&nbsp;
        {formatNumber(balance?.amount)} {balance?.symbol}
      </Text>

      {hdPath && (
        <FormControl>
          <FormLabel>HD Path</FormLabel>

          <HdPathInput
            forcePrefixLength={stringToPath(hdPath).length}
            fixedLength
            value={hdPath}
          />
        </FormControl>
      )}

      {isMultisigWallet(wallet) && account && (
        <Stack spacing={6}>
          <Divider />

          <Text fontWeight="medium">
            MultiSig Type: {getMultisigTypeTitle(wallet)}
          </Text>

          {wallet.info.multisigType === MultisigWalletType.SAFE && (
            <SafeSettings
              network={network}
              wallet={wallet}
              subWallet={subWallet}
              account={account}
            />
          )}

          <Divider />
        </Stack>
      )}

      <HStack justify="end">
        {accountUrl && (
          <Button
            variant="outline"
            colorScheme="purple"
            onClick={async () => {
              await browser.tabs.create({ url: accountUrl })
            }}>
            View account on block explorer
          </Button>
        )}

        {hasWalletKeystore(wallet) && (
          <Button variant="outline" colorScheme="purple" onClick={onExportOpen}>
            Export Private Key
          </Button>
        )}

        <Button
          colorScheme="red"
          onClick={() => {
            onOpenDeleteWallet({ subWallet })
          }}>
          Delete {isWalletGroup(wallet) ? 'Account' : 'Wallet'}
        </Button>
      </HStack>

      {account && (
        <ExportPrivateKeyModal
          account={account}
          isOpen={isExportOpen}
          onClose={onExportClose}
        />
      )}

      <WrappedDeleteWalletModal onDelete={onDelete} />
    </Stack>
  )
}
