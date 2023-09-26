import { FormControl, FormErrorMessage, FormLabel } from '@chakra-ui/react'
import { useState } from 'react'

import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { ISubWallet, IWallet, isSubNameInvalid } from '~lib/schema'

export const WalletNameEdit = ({ wallet }: { wallet: IWallet }) => {
  const [isNameExists, setIsNameExists] = useState(false)

  return (
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
  )
}

export const SubWalletNameEdit = ({
  wallet,
  subWallet
}: {
  wallet: IWallet
  subWallet: ISubWallet
}) => {
  const [isNameExists, setIsNameExists] = useState(false)

  return (
    <FormControl isInvalid={isNameExists}>
      <FormLabel>Account Name</FormLabel>
      <SaveInput
        hideSaveIfNoChange
        stretchInput
        value={subWallet.name}
        validate={(value: string) => {
          value = value.trim().slice(0, 64)
          if (!value || isSubNameInvalid(value, subWallet.index)) {
            return false
          } else {
            return value
          }
        }}
        asyncValidate={async (value: string) => {
          return !(await DB.subWallets
            .where('[masterId+name]')
            .equals([wallet.id, value])
            .first())
        }}
        onChange={async (value: string) => {
          await DB.subWallets.update(subWallet, { name: value })
        }}
        onInvalid={setIsNameExists}
      />
      <FormErrorMessage>This account name exists.</FormErrorMessage>
    </FormControl>
  )
}
