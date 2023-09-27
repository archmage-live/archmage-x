import { DB } from '~lib/db'
import { INetwork } from '~lib/schema'

export function reorderNetworks(
  networks: INetwork[],
  startIndex: number,
  endIndex: number
): [INetwork[], number, number] {
  const [startSortId, endSortId] = [
    networks[startIndex].sortId,
    networks[endIndex].sortId
  ]
  const nets = networks.slice()
  const [lower, upper] = [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex)
  ]
  const sortIds = nets.slice(lower, upper + 1).map((net) => net.sortId)
  const [removed] = nets.splice(startIndex, 1)
  nets.splice(endIndex, 0, removed)
  for (let index = lower; index <= upper; ++index) {
    nets[index].sortId = sortIds[index - lower]
  }
  return [nets, startSortId, endSortId]
}

export async function persistReorderNetworks(
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.networks], async () => {
    const items = await DB.networks
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

      await DB.networks.update(items[i], { sortId })
    }
  })
}
