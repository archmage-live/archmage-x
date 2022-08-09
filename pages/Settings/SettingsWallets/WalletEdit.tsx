import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Stack
} from '@chakra-ui/react'
import { useState } from 'react'

import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { IWallet } from '~lib/schema/wallet'

interface WalletEditProps {
  wallet: IWallet
}

export const WalletEdit = ({ wallet }: WalletEditProps) => {
  const [isNameExists, setIsNameExists] = useState(false)

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
    </Stack>
  )
}
