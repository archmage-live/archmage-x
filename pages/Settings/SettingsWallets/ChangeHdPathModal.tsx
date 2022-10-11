import {
  Button,
  Divider,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { getNetworkScope } from '~lib/network'
import { DerivePosition, INetwork, IWallet } from '~lib/schema'
import { WALLET_SERVICE, useHdPath } from '~lib/services/walletService'
import {
  getDefaultDerivePosition,
  getDefaultPath,
  isUseEd25519Curve
} from '~lib/wallet'

export const ChangeHdPathModal = ({
  isOpen,
  onClose,
  network,
  wallet
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  wallet: IWallet
}) => {
  const [_hdPath, _derivePosition] = useHdPath(network.kind, wallet, 0)
  const defaultHdPath = getDefaultPath(network.kind)
  const defaultDerivePosition = getDefaultDerivePosition(network.kind)

  const [hdPath, setHdPath] = useState<string>()
  const [derivePosition, setDerivePosition] = useState<DerivePosition>()

  useEffect(() => {
    setHdPath(_hdPath)
    setDerivePosition(_derivePosition)
  }, [isOpen, _hdPath, _derivePosition])

  const [isLoading, setIsLoading] = useState(false)

  if (!hdPath || !defaultHdPath) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Change HD Path</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack spacing={12} fontSize="md">
            <Stack spacing={6}>
              <Divider />

              <AlertBox>
                You can set HD path schema for any specific network kind. Please
                be careful that changing the default HD path schema will cause
                the addresses of all derived accounts to change. If you want to
                change back to the original addresses and see their assets
                again, you can set back the default HD path schema.
              </AlertBox>

              <HStack>
                <Text>Wallet:</Text>
                <Text color="gray.500">{wallet.name}</Text>
              </HStack>

              <HStack>
                <Text>Network Kind:</Text>
                <Text color="gray.500">{getNetworkScope(network.kind)}</Text>
              </HStack>

              <HdPathInput
                isEd25519Curve={isUseEd25519Curve(network.kind)}
                derivePosition={derivePosition}
                setDerivePosition={setDerivePosition}
                value={hdPath}
                onChange={setHdPath}
              />

              {(hdPath !== defaultHdPath ||
                derivePosition !== defaultDerivePosition) && (
                <AlertBox level="info" nowrap>
                  <Stack spacing={1}>
                    <Text>
                      The HD path schema for network&nbsp;
                      {getNetworkScope(network.kind)} is now different from the
                      default.
                    </Text>
                    <Button
                      variant="ghost"
                      colorScheme="purple"
                      size="sm"
                      w="fit-content"
                      onClick={() => {
                        setHdPath(defaultHdPath)
                        setDerivePosition(defaultDerivePosition)
                      }}>
                      Reset to default
                    </Button>
                  </Stack>
                </AlertBox>
              )}
            </Stack>

            <HStack>
              <Button
                variant="outline"
                colorScheme="purple"
                flex={1}
                isDisabled={isLoading}
                onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                flex={1}
                isDisabled={
                  hdPath === _hdPath && derivePosition === _derivePosition
                }
                isLoading={isLoading}
                onClick={async () => {
                  setIsLoading(true)
                  await WALLET_SERVICE.updateHdPath(
                    wallet.id,
                    network.kind,
                    hdPath,
                    derivePosition
                  )
                  await WALLET_SERVICE.ensureChainAccounts(
                    wallet.id,
                    network.kind,
                    network.chainId
                  )
                  onClose()
                  setIsLoading(false)
                }}>
                Confirm
              </Button>
            </HStack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
