import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Select,
  Stack
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from 'react-use'

import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { NETWORK_KIND_SCOPES, getNetworkKind } from '~lib/network'
import { IWallet } from '~lib/schema/wallet'
import {
  WALLET_SERVICE,
  useHdPaths,
  useSubWallets
} from '~lib/services/walletService'
import { getDefaultPathPrefix } from '~lib/wallet'

interface WalletEditProps {
  wallet: IWallet
}

export const WalletEdit = ({ wallet }: WalletEditProps) => {
  const hdPaths = useHdPaths(wallet.id)
  const subWallets = useSubWallets(wallet.id!)

  const [isNameExists, setIsNameExists] = useState(false)

  const [networkScope, setNetworkScope] = useState(NETWORK_KIND_SCOPES[0])
  const [hdPath, setHdPath] = useState('')
  useEffect(() => {
    const networkKind = getNetworkKind(networkScope)
    setHdPath(hdPaths?.get(networkKind) || '')
  }, [hdPaths, networkScope])

  const [changed, setChanged] = useState(false)
  const [notDefault, setNotDefault] = useState(false)
  useEffect(() => {
    const networkKind = getNetworkKind(networkScope)
    setChanged(hdPath !== hdPaths?.get(networkKind))
    setNotDefault(hdPath !== getDefaultPathPrefix(networkKind))
  }, [hdPath, hdPaths, networkScope])

  const [hdPathAction, setHdPathAction] = useState('')

  const [saveVisibility, setSaveVisibility] = useState<any>('hidden')
  const [saveColorScheme, setSaveColorScheme] = useState('gray')
  useDebounce(
    () => {
      if (changed) {
        setHdPathAction('Save')
      } else if (notDefault) {
        setHdPathAction('Default')
      }
      setSaveVisibility(!(changed || notDefault) ? 'hidden' : 'visible')
      setSaveColorScheme(!(changed || notDefault) ? 'gray' : 'purple')
    },
    200,
    [changed, notDefault]
  )

  const onSaveHdPath = useCallback(async () => {
    const networkKind = getNetworkKind(networkScope)
    const h = await DB.hdPaths
      .where({ masterId: wallet.id, networkKind })
      .first()
    if (!h) {
      return
    }
    const path = changed ? hdPath : getDefaultPathPrefix(networkKind)
    await DB.hdPaths.update(h, { path })
  }, [changed, hdPath, networkScope, wallet])

  const [deriveNum, setDeriveNum] = useState(0)

  return (
    <Stack spacing="12">
      <FormControl isInvalid={isNameExists}>
        <FormLabel>Wallet Name</FormLabel>
        <SaveInput
          hideSaveIfNoChange
          stretchInput
          value={wallet.name}
          validate={(value: string) => value.trim().slice(0, 64) || false}
          asyncValidate={async (value: string) => {
            return !(await DB.wallets.where('name').equals(value).first())
          }}
          onChange={(value: string) => {
            DB.wallets.update(wallet, { name: value })
          }}
          onInvalid={setIsNameExists}
        />
        <FormErrorMessage>This wallet name exists.</FormErrorMessage>
      </FormControl>

      <Stack spacing={6}>
        <FormControl>
          <FormLabel>Network Type</FormLabel>

          <HStack spacing={6}>
            <Select
              w={32}
              value={networkScope}
              onChange={(e) => setNetworkScope(e.target.value)}>
              {NETWORK_KIND_SCOPES.map((scope) => {
                return (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                )
              })}
            </Select>

            <Button
              visibility={saveVisibility}
              colorScheme={saveColorScheme}
              transition="all 0.2s"
              onClick={onSaveHdPath}>
              {hdPathAction}
            </Button>
          </HStack>
        </FormControl>

        {hdPath && (
          <FormControl>
            <FormLabel>HD Path</FormLabel>

            <HdPathInput forcePrefix="m" value={hdPath} onChange={setHdPath} />

            <FormHelperText>
              You can set HD path for any specific network type. Please be
              careful that changing the default HD path will cause the addresses
              of all derived wallets to change.
            </FormHelperText>
          </FormControl>
        )}
      </Stack>

      <Stack spacing={6}>
        <FormControl>
          <FormLabel>Derived Wallets: {subWallets?.length}</FormLabel>
        </FormControl>

        <FormControl>
          <FormLabel>Derive New Wallets</FormLabel>
          <SaveInput
            isNumber
            hideSaveIfNoChange
            stretchInput
            saveTitle="Derive"
            value={deriveNum + ''}
            validate={(value: string) => {
              if (isNaN(+value)) {
                return false
              }
              return Math.min(Math.max(+value, 0), 1000) + ''
            }}
            onChange={(value: string) => {
              WALLET_SERVICE.deriveSubWallets(wallet.id!, +value)
            }}
          />
        </FormControl>
      </Stack>
    </Stack>
  )
}
