import { DB } from '~lib/db'
import { IContact } from '~lib/schema'

export function reorderContacts(
  contacts: IContact[],
  startIndex: number,
  endIndex: number
): [IContact[], number, number] {
  const [startSortId, endSortId] = [
    contacts[startIndex].sortId,
    contacts[endIndex].sortId
  ]
  const result = contacts.slice()
  const [lower, upper] = [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex)
  ]
  const sortIds = result
    .slice(lower, upper + 1)
    .map((contact) => contact.sortId)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  for (let index = lower; index <= upper; ++index) {
    result[index].sortId = sortIds[index - lower]
  }
  return [result, startSortId, endSortId]
}

export async function persistReorderContacts(
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.contacts], async () => {
    const items = await DB.contacts
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

      await DB.contacts.update(items[i], { sortId })
    }
  })
}
