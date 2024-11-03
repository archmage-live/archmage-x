import safeLogo from 'data-base64:@/assets/thirdparty/Safe_Logos_H-Lockup_Black.svg'
import walletConnectLogo from 'data-base64:@/assets/thirdparty/walletconnect.svg'
import web3authLogo from 'data-base64:@/assets/thirdparty/web3auth-favicon.svg'

import { MultisigWalletType, WalletInfo, WalletType } from './types'

export function getWalletTypeIdentifier(wallet: {
  type: WalletType
  info: WalletInfo
}): {
  identifier?: string
  logo?: string
  logoLight?: string
  logoDark?: string
  logoLightInvert?: boolean
  logoDarkInvert?: boolean
  logoHeight?: string | number
} {
  let identifier = undefined
  let logo = undefined
  let logoLight = undefined
  let logoDark = undefined
  let logoLightInvert = undefined
  let logoDarkInvert = undefined
  let logoHeight = undefined
  switch (wallet.type) {
    case WalletType.HD:
      identifier = 'HD'
      break
    case WalletType.PRIVATE_KEY:
      identifier = '' // empty for simple wallet
      break
    case WalletType.PRIVATE_KEY_GROUP:
      identifier = 'PrivKey Group'
      break
    case WalletType.WATCH:
      identifier = 'Watch'
      break
    case WalletType.WATCH_GROUP:
      identifier = 'Watch Group'
      break
    case WalletType.HW:
      identifier = wallet.info.hwType as string
      break
    case WalletType.HW_GROUP:
      identifier = wallet.info.hwType + ' Group'
      break
    case WalletType.REOWN:
    // pass through
    case WalletType.REOWN_GROUP:
      logo = walletConnectLogo
      break
    case WalletType.MULTI_SIG:
    // pass through
    case WalletType.MULTI_SIG_GROUP:
      logo = safeLogo
      logoDarkInvert = true
      logoHeight = '20px'
      break
    case WalletType.KEYLESS_HD:
      identifier = 'HD'
    // pass through
    case WalletType.KEYLESS:
    // pass through
    case WalletType.KEYLESS_GROUP:
      logo = web3authLogo
      logoHeight = '20px'
      break
  }
  return {
    identifier,
    logo,
    logoLight,
    logoDark,
    logoLightInvert,
    logoDarkInvert,
    logoHeight
  }
}

export function getWalletTypeTitle(wallet: {
  type: WalletType
  info: WalletInfo
}) {
  switch (wallet.type) {
    case WalletType.HD:
      return 'Hierarchical Deterministic (HD)'
    case WalletType.PRIVATE_KEY:
      return 'Private-key'
    case WalletType.PRIVATE_KEY_GROUP:
      return 'Private-key Group'
    case WalletType.WATCH:
      return 'Watch Address'
    case WalletType.WATCH_GROUP:
      return 'Watch Address Group'
    case WalletType.HW:
      return 'Connected ' + wallet.info.hwType
    case WalletType.HW_GROUP:
      return 'Connected ' + wallet.info.hwType
    case WalletType.REOWN:
      return 'WalletConnect'
    case WalletType.REOWN_GROUP:
      return 'WalletConnect Group'
    case WalletType.MULTI_SIG:
      return 'MultiSig'
    case WalletType.MULTI_SIG_GROUP:
      return 'MultiSig Group'
    case WalletType.KEYLESS_HD:
      return 'Keyless Hierarchical Deterministic (HD)'
    case WalletType.KEYLESS:
      return 'Keyless'
    case WalletType.KEYLESS_GROUP:
      return 'Keyless Group'
  }
}

export function getMultisigTypeTitle(wallet: {
  type: WalletType
  info: WalletInfo
}) {
  switch (wallet.info.multisigType) {
    case MultisigWalletType.SAFE:
      return 'Safe'
  }
}
