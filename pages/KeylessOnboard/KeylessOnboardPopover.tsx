import {
  Image,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger
} from '@chakra-ui/react'
import web3authLogo from 'data-base64:~assets/thirdparty/web3auth-favicon.svg'
import { useMemo } from 'react'

import { ISubWallet, IWallet } from '~lib/schema'
import { WalletType } from '~lib/wallet'

import { KeylessOnboardInfo } from './KeylessOnboardInfo'

export const KeylessOnboardPopover = ({
  wallet,
  subWallet
}: {
  wallet?: IWallet
  subWallet?: ISubWallet
}) => {
  const info = useMemo(() => {
    if (!wallet || !subWallet) {
      return
    }
    switch (wallet.type) {
      case WalletType.KEYLESS_HD:
      // pass through
      case WalletType.KEYLESS:
        return wallet.info.keyless!
      case WalletType.KEYLESS_GROUP:
        return subWallet.info.keyless!
      default:
        return
    }
  }, [wallet, subWallet])

  return info ? (
    <Popover isLazy trigger="hover" placement="bottom-end">
      <PopoverTrigger>
        <Image
          w="20px"
          h="20px"
          display="inline-block"
          fit="cover"
          src={web3authLogo}
          alt="web3auth logo"
          cursor="pointer"
        />
      </PopoverTrigger>
      <PopoverContent w="auto">
        <PopoverArrow />
        <PopoverBody>
          <KeylessOnboardInfo info={info} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  ) : (
    <></>
  )
}
