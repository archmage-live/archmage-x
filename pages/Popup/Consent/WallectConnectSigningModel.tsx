import {
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Stack,
  UnorderedList,
  useDisclosure
} from '@chakra-ui/react'
import { joinSignature } from '@ethersproject/bytes/src.ts'
import { JsonRpcProvider } from '@ethersproject/providers'
import * as React from 'react'
import { useRef, useState } from 'react'
import { useAsync } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { WallectConnectQRCode } from '~components/WalletConnectQRCode'
import { IChainAccount, INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { shortenString } from '~lib/utils'
import { useWalletConnect } from '~lib/walletConnect'

export function useWalletConnectSigning() {
  const {
    isOpen: isWcOpen,
    onOpen: onWcOpen,
    onClose: onWcClose
  } = useDisclosure()

  const [wcPayload, setWcPayload] = useState<{
    tx?: any
    typedData?: any
    message?: any
  }>()

  const onWcSignedRef =
    useRef<
      (signed: { signedTx?: any; txHash?: string; signature?: any }) => void
    >()

  return {
    isWcOpen,
    onWcOpen,
    onWcClose,
    wcPayload,
    setWcPayload,
    onWcSignedRef
  }
}

export const WalletConnectSigningModel = ({
  isOpen,
  onClose,
  network,
  account,
  payload,
  onSigned
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  account: IChainAccount
  payload?: {
    tx?: any
    typedData?: any
    message?: any
  }
  onSigned?: (signed: {
    signedTx?: any
    txHash?: string
    signature?: any
  }) => void
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="full"
      scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent my={0}>
        <ModalHeader>Signing with WalletConnect</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          <WalletConnectSigning
            onClose={onClose}
            network={network}
            account={account}
            payload={payload}
            onSigned={onSigned}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const WalletConnectSigning = ({
  onClose,
  network,
  account,
  payload,
  onSigned
}: {
  onClose: () => void
  network: INetwork
  account: IChainAccount
  payload?: {
    tx?: any
    typedData?: any
    message?: any
  }
  onSigned?: (signed: {
    signedTx?: any
    txHash?: string
    signature?: any
  }) => void
}) => {
  const [url, setUrl] = useState('')

  const { provider, waitConnected, refresh, addresses, chainId } =
    useWalletConnect(network, setUrl)

  const [signingErr, setSigningErr] = useState('')

  useAsync(async () => {
    setSigningErr('')

    if (!provider || !payload || !onSigned) {
      return
    }

    try {
      if (!waitConnected) {
        return
      }
      await waitConnected

      if (payload.tx) {
        const tx = JsonRpcProvider.hexlifyTransaction(payload.tx, {
          from: true
        })
        try {
          const signedTx = await provider.connector.signTransaction(tx as any)
          onSigned({ signedTx })
        } catch (err: any) {
          if (err.toString().includes('Method not supported')) {
            // MetaMask does not support returning signed transaction.
            console.error(err)
            const txHash = await provider.connector.sendTransaction(tx as any)
            onSigned({ txHash })
          } else {
            throw err
          }
        }
      } else if (payload.typedData) {
        const request = (provider.connector as any)._formatRequest({
          method: 'eth_signTypedData_v4',
          params: [account.address, JSON.stringify(payload.typedData)]
        })

        const signature = joinSignature(
          await (provider.connector as any)._sendCallRequest(request)
        )
        onSigned({ signature })
      } else if (payload.message) {
        const signature = await provider.connector.signPersonalMessage([
          payload.message,
          account.address
        ])
        onSigned({ signature })
      }

      onClose()
    } catch (err: any) {
      setSigningErr(err.toString())
    }
  }, [provider, waitConnected, onSigned, onClose, payload])

  const mismatchedAccount =
    addresses && addresses.every((addr) => addr !== account.address)
  const mismatchedChainId =
    typeof chainId === 'number' && chainId !== network.chainId

  return (
    <Stack spacing={12} p={8} pt={12}>
      <WallectConnectQRCode url={url} refresh={refresh} />

      <Stack spacing={4}>
        <AlertBox level="info" nowrap>
          <OrderedList>
            <ListItem>
              Open any wallet app which supports WallectConnect
            </ListItem>
            <ListItem>
              Make sure you are using account {shortenString(account.address)}{' '}
              on {getNetworkInfo(network).name}
            </ListItem>
            <ListItem>Scan the QR code above</ListItem>
            <ListItem>
              If an error occurs, press the refresh button to try again
            </ListItem>
          </OrderedList>
        </AlertBox>

        {provider?.connected && (
          <AlertBox
            level={mismatchedAccount || mismatchedChainId ? 'warning' : 'info'}
            nowrap>
            Successfully connected
            {(mismatchedAccount || mismatchedChainId) && (
              <>
                , but:
                <UnorderedList>
                  {mismatchedAccount && <ListItem>Mismatched account</ListItem>}
                  {mismatchedChainId && (
                    <ListItem>Mismatched chain ID</ListItem>
                  )}
                </UnorderedList>
              </>
            )}
          </AlertBox>
        )}

        <AlertBox level="error">{signingErr}</AlertBox>
      </Stack>
    </Stack>
  )
}
