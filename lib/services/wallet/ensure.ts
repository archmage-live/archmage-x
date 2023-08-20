import assert from 'assert'
import PQueue from 'p-queue'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { getSafeAccountAddress } from '~lib/safe'
import {
  ChainId,
  IChainAccount,
  IHdPath,
  IWallet,
  Index,
  PSEUDO_INDEX,
  getAddressFromInfo
} from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  KeystoreSigningWallet,
  MultisigWalletType,
  WalletType,
  getDerivePosition,
  getStructuralSigningWallet,
  isAccountAbstractionWallet,
  isHdWallet,
  isKeylessWallet,
  isWalletGroup
} from '~lib/wallet'

import { WALLET_SERVICE } from '.'

export async function ensureChainAccounts(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: ChainId
) {
  if (!isWalletGroup(wallet.type)) {
    await ensureChainAccount(wallet, PSEUDO_INDEX, networkKind, chainId)
    return
  }

  const masterId = wallet.id

  const subWalletsNum = await DB.subWallets
    .where('masterId')
    .equals(masterId)
    .count()
  if (!subWalletsNum) {
    return
  }

  const chainAccountsNum = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .count()
  if (
    chainAccountsNum === subWalletsNum &&
    !(isKeylessWallet(wallet.type) || isAccountAbstractionWallet(wallet))
  ) {
    return
  }
  assert(chainAccountsNum <= subWalletsNum)

  const subWallets = await DB.subWallets
    .where('masterId')
    .equals(masterId)
    .toArray()

  const chainAccounts = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .toArray()

  let signingHdWallet: KeystoreSigningWallet | undefined
  let hdPath: IHdPath | undefined
  if (isHdWallet(wallet.type)) {
    signingHdWallet = await getStructuralSigningWallet(
      wallet,
      undefined,
      networkKind,
      chainId
    )

    hdPath = await WALLET_SERVICE.getOrAddHdPath(masterId, networkKind, false)
    if (!hdPath) {
      return
    }
  }

  const existing = new Map<Index, IChainAccount>()
  for (const acc of chainAccounts) {
    existing.set(acc.index, acc)
  }

  const bulkAdd: IChainAccount[] = []
  const bulkPut: IChainAccount[] = []

  const tick = Date.now()
  const queue = new PQueue({ concurrency: 4 })
  for (const subWallet of subWallets) {
    const acc = existing.get(subWallet.index)
    if (!acc) {
      queue
        .add(async () => {
          let address
          switch (wallet.type) {
            case WalletType.HD:
            // pass through
            case WalletType.KEYLESS_HD: {
              assert(hdPath)
              const subSigningWallet = await signingHdWallet?.derive(
                hdPath.path,
                subWallet.index,
                getDerivePosition(hdPath, networkKind)
              )
              address = subSigningWallet?.address
              break
            }
            case WalletType.PRIVATE_KEY_GROUP:
            // pass through
            case WalletType.KEYLESS_GROUP: {
              const signingWallet = await getStructuralSigningWallet(
                wallet,
                subWallet,
                networkKind,
                chainId
              )
              address = signingWallet?.address
              break
            }
            case WalletType.WATCH_GROUP:
            // pass through
            case WalletType.WALLET_CONNECT_GROUP:
            // pass through
            case WalletType.HW_GROUP: {
              const network = await NETWORK_SERVICE.getNetwork({
                kind: networkKind,
                chainId
              })
              if (!network) {
                return
              }
              address = getAddressFromInfo(subWallet, network)
              break
            }
          }
          bulkAdd.push({
            masterId,
            index: subWallet.index,
            networkKind,
            chainId,
            address
          } as IChainAccount)
        })
        .then()
    } else if (
      !acc.address &&
      (isKeylessWallet(wallet.type) || isAccountAbstractionWallet(wallet))
    ) {
      queue
        .add(async () => {
          switch (wallet.type) {
            case WalletType.HD:
            // pass through
            case WalletType.KEYLESS_HD: {
              assert(hdPath)
              const subSigningWallet = await signingHdWallet?.derive(
                hdPath.path,
                subWallet.index,
                getDerivePosition(hdPath, networkKind)
              )
              if (subSigningWallet) {
                acc.address = subSigningWallet.address
                bulkPut.push(acc)
              }
              break
            }
            case WalletType.PRIVATE_KEY_GROUP:
            // pass through
            case WalletType.KEYLESS_GROUP: {
              const signingWallet = await getStructuralSigningWallet(
                wallet,
                subWallet,
                networkKind,
                chainId
              )
              if (signingWallet) {
                acc.address = signingWallet.address
                bulkPut.push(acc)
              }
              break
            }
            case WalletType.MULTI_SIG_GROUP: {
              const network = await NETWORK_SERVICE.getNetwork({
                kind: networkKind,
                chainId
              })
              if (!network) {
                return
              }
              switch (wallet.info.multisigType) {
                case MultisigWalletType.SAFE: {
                  acc.address = await getSafeAccountAddress(
                    network,
                    wallet,
                    subWallet
                  )
                  bulkPut.push(acc)
                  break
                }
              }
              break
            }
            case WalletType.WATCH_GROUP:
            // pass through
            case WalletType.WALLET_CONNECT_GROUP:
            // pass through
            case WalletType.HW_GROUP: {
              const network = await NETWORK_SERVICE.getNetwork({
                kind: networkKind,
                chainId
              })
              if (!network) {
                return
              }
              const address = getAddressFromInfo(subWallet, network)
              if (address) {
                acc.address = address
                bulkPut.push(acc)
              }
              break
            }
          }
        })
        .then()
    }
  }
  await queue.onIdle()

  if (!bulkAdd.length && !bulkPut.length) {
    return
  }

  console.log(`derive chain accounts: ${(Date.now() - tick) / 1000}s`)

  await DB.transaction('rw', [DB.subWallets, DB.chainAccounts], async () => {
    {
      // check sub wallet existence, to avoid issue of deletion before add
      const subWalletsNum = await DB.subWallets
        .where('[masterId+index]')
        .anyOf(bulkAdd.map((account) => [account.masterId, account.index]))
        .count()
      if (bulkAdd.length !== subWalletsNum) {
        return
      }
    }

    {
      // check sub wallet existence, to avoid issue of deletion before put
      const subWalletsNum = await DB.subWallets
        .where('[masterId+index]')
        .anyOf(bulkPut.map((account) => [account.masterId, account.index]))
        .count()
      if (bulkPut.length !== subWalletsNum) {
        return
      }
    }

    if (bulkAdd.length) {
      await DB.chainAccounts.bulkAdd(bulkAdd)
    }
    if (bulkPut.length) {
      await DB.chainAccounts.bulkPut(bulkPut)
    }
  })
  console.log(
    `ensured chain accounts for sub wallets: master wallet ${wallet.id}, network: ${networkKind}, chainID: ${chainId}`
  )
}

export async function ensureChainAccount(
  wallet: IWallet,
  index: Index,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<IChainAccount | undefined> {
  const existing = await getChainAccount(wallet, index, networkKind, chainId)
  if (
    existing &&
    (!(isKeylessWallet(wallet.type) || isAccountAbstractionWallet(wallet)) ||
      existing.address)
  ) {
    return existing
  }

  const subWallet = await WALLET_SERVICE.getSubWallet({
    masterId: wallet.id,
    index
  })
  if (!subWallet) {
    return
  }

  let address
  switch (wallet.type) {
    case WalletType.HD:
    // pass through
    case WalletType.KEYLESS_HD: {
      const signingWallet = await getStructuralSigningWallet(
        wallet,
        undefined,
        networkKind,
        chainId
      )
      const hdPath = await WALLET_SERVICE.getOrAddHdPath(
        wallet.id,
        networkKind,
        false
      )
      if (!hdPath) {
        return
      }
      const subSigningWallet = await signingWallet?.derive(
        hdPath.path,
        index,
        getDerivePosition(hdPath, networkKind)
      )
      address = subSigningWallet?.address
      break
    }
    case WalletType.PRIVATE_KEY:
    // pass through
    case WalletType.KEYLESS: {
      const signingWallet = await getStructuralSigningWallet(
        wallet,
        subWallet,
        networkKind,
        chainId
      )
      address = signingWallet?.address
      break
    }
    case WalletType.PRIVATE_KEY_GROUP:
    // pass through
    case WalletType.KEYLESS_GROUP: {
      const signingWallet = await getStructuralSigningWallet(
        wallet,
        subWallet,
        networkKind,
        chainId
      )
      address = signingWallet?.address
      break
    }
    case WalletType.MULTI_SIG:
    // pass through
    case WalletType.MULTI_SIG_GROUP: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      if (!network) {
        return
      }
      switch (wallet.info.multisigType) {
        case MultisigWalletType.SAFE: {
          address = await getSafeAccountAddress(network, wallet, subWallet)
          break
        }
      }
      break
    }
    case WalletType.WATCH:
    // pass through
    case WalletType.WALLET_CONNECT:
    // pass through
    case WalletType.HW: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      if (!network) {
        return
      }
      address = getAddressFromInfo(subWallet, network)
      break
    }
    case WalletType.WATCH_GROUP:
    // pass through
    case WalletType.WALLET_CONNECT_GROUP:
    // pass through
    case WalletType.HW_GROUP: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      if (!network) {
        return
      }
      address = getAddressFromInfo(subWallet, network)
      break
    }
  }

  let account: IChainAccount
  if (!existing) {
    account = {
      masterId: wallet.id,
      index,
      networkKind,
      chainId,
      address,
      info: {}
    } as IChainAccount
  } else {
    if (!address) {
      return existing
    }
    account = {
      ...existing,
      address
    }
  }

  return DB.transaction('rw', [DB.subWallets, DB.chainAccounts], async () => {
    // check sub wallet existence, to avoid issue of deletion before add
    if (!(await WALLET_SERVICE.getSubWallet({ masterId: wallet.id, index }))) {
      return
    }

    if (!existing) {
      account.id = await DB.chainAccounts.add(account)
    } else {
      await DB.chainAccounts.put(account)
    }
    return account
  })
}

export async function getChainAccount(
  wallet: IWallet,
  index: Index,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<IChainAccount | undefined> {
  assert(
    index !== PSEUDO_INDEX
      ? isWalletGroup(wallet.type)
      : !isWalletGroup(wallet.type)
  )

  return DB.chainAccounts
    .where({
      masterId: wallet.id,
      index: index,
      networkKind,
      chainId
    })
    .first()
}
