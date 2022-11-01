import { DB } from '~lib/db'
import { SubWalletEntry, WalletEntry } from '~lib/services/wallet/tree'

export function localReorderWallets(
  wallets: WalletEntry[],
  startIndex: number,
  endIndex: number
): [WalletEntry[], number, number] {
  const [startSortId, endSortId] = [
    wallets[startIndex].wallet.sortId,
    wallets[endIndex].wallet.sortId
  ]
  const ws = wallets.slice()
  const [lower, upper] = [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex)
  ]
  const sortIds = ws.slice(lower, upper + 1).map((w) => w.wallet.sortId)
  const [removed] = ws.splice(startIndex, 1)
  ws.splice(endIndex, 0, removed)
  for (let index = lower; index <= upper; ++index) {
    ws[index].wallet.sortId = sortIds[index - lower]
  }
  return [ws, startSortId, endSortId]
}

export async function persistReorderWallets(
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.wallets], async () => {
    const items = await DB.wallets
      .where('sortId')
      .between(lower, upper, true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.wallets.update(items[i], { sortId })
    }
  })
}

export function localReorderSubWallets(
  wallets: SubWalletEntry[],
  startIndex: number,
  endIndex: number
): [SubWalletEntry[], number, number] {
  const [startSortId, endSortId] = [
    wallets[startIndex].subWallet.sortId,
    wallets[endIndex].subWallet.sortId
  ]
  const ws = wallets.slice()
  const [lower, upper] = [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex)
  ]
  const sortIds = ws.slice(lower, upper + 1).map((w) => w.subWallet.sortId)
  const [removed] = ws.splice(startIndex, 1)
  ws.splice(endIndex, 0, removed)
  for (let index = lower; index <= upper; ++index) {
    ws[index].subWallet.sortId = sortIds[index - lower]
  }
  return [ws, startSortId, endSortId]
}

export async function persistReorderSubWallets(
  masterId: number,
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.subWallets], async () => {
    const items = await DB.subWallets
      .where('[masterId+sortId]')
      .between([masterId, lower], [masterId, upper], true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.subWallets.update(items[i], { sortId })
    }
  })
}
