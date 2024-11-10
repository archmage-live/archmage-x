import { assert } from '@/archmage/errors'

const storeKeys = new Set<string>()

export function storeKey(key: string) {
  assert(!storeKeys.has(key), `Store key '${key}' already registered`)
  storeKeys.add(key)
  return key
}
