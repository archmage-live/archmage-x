import { AddIcon, MinusIcon, SearchIcon } from '@chakra-ui/icons'
import {
  ButtonGroup,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement
} from '@chakra-ui/react'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'

import { NetworkKind } from '~lib/network'
import { IChainAccount, ISubWallet, IWallet } from '~lib/schema'
import { checkAddress } from '~lib/wallet'

export const SafeOwner = ({
  index,
  isNotOnlyOne,
  isLast,
  name,
  setName,
  address,
  setAddress,
  addOwner,
  removeOwner,
  onScanAddressOpen,
  onSelectAccountOpen,
  networkKind,
  wallet
}: {
  index: number
  isNotOnlyOne: boolean
  isLast: boolean
  name: string
  setName: (name: string) => void
  address: string
  setAddress: (address: string) => void
  addOwner: () => void
  removeOwner: () => void
  onScanAddressOpen: () => void
  onSelectAccountOpen: () => void
  networkKind: NetworkKind
  wallet?: {
    wallet: IWallet
    subWallet: ISubWallet
    account: IChainAccount
  }
}) => {
  return (
    <HStack>
      <Input
        size="lg"
        w={40}
        placeholder={`Owner ${index + 1}`}
        maxLength={64}
        value={name}
        onChange={(e) => setName(e.target.value.trim())}
      />

      <InputGroup size="lg">
        <Input
          sx={{ paddingInlineEnd: '63px' }}
          placeholder={`Address ${index + 1}`}
          errorBorderColor="red.500"
          isInvalid={!!address && !checkAddress(networkKind, address)}
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
        />
        <InputRightElement w="63px">
          <ButtonGroup size="sm" isAttached variant="ghost">
            <IconButton
              aria-label="Scan QR code"
              icon={<Icon fontSize="xl" as={MdQrCode} />}
              onClick={onScanAddressOpen}
            />
            <IconButton
              aria-label="Select existing account"
              icon={<SearchIcon />}
              onClick={onSelectAccountOpen}
            />
          </ButtonGroup>
        </InputRightElement>
      </InputGroup>

      <IconButton
        size="xs"
        aria-label="Add owner"
        icon={<AddIcon />}
        visibility={isLast ? 'visible' : 'hidden'}
        onClick={addOwner}
      />

      <IconButton
        size="xs"
        aria-label="Remove owner"
        icon={<MinusIcon />}
        visibility={isNotOnlyOne ? 'visible' : 'hidden'}
        onClick={removeOwner}
      />
    </HStack>
  )
}
