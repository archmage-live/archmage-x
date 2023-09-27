import { DB } from '~lib/db'
import { IToken } from '~lib/schema'

export function reorderTokens(
  tokens: IToken[],
  startIndex: number,
  endIndex: number
): [IToken[], number, number] {
  const [startSortId, endSortId] = [
    tokens[startIndex].sortId,
    tokens[endIndex].sortId
  ]
  const result = tokens.slice()
  const [lower, upper] = [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex)
  ]
  const sortIds = result.slice(lower, upper + 1).map((token) => token.sortId)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  for (let index = lower; index <= upper; ++index) {
    result[index].sortId = sortIds[index - lower]
  }
  return [result, startSortId, endSortId]
}

export async function persistReorderTokens(
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.tokens], async () => {
    const items = await DB.tokens
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

      await DB.tokens.update(items[i], { sortId })
    }
  })
}
