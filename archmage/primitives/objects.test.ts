import { unnestObject } from '@/archmage/primitives/objects'

describe(unnestObject, () => {
  it('handles simple objects', () => {
    expect(unnestObject({ a: '1', b: 1 })).toEqual({ a: '1', b: 1 })
    expect(unnestObject({ a: { b: 1, c: '1' } })).toEqual({ 'a.b': 1, 'a.c': '1' })
  })

  it('handles arrays', () => {
    expect(unnestObject({ a: ['constructor', 2, 3], b: [{ c: 1 }, { d: 2 }] })).toEqual({
      'a.0': 'constructor',
      'a.1': 2,
      'a.2': 3,
      'b.0.c': 1,
      'b.1.d': 2
    })
  })
})
