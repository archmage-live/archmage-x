import Decimal from 'decimal.js'

import { Coin } from './coin'
import { Coins } from './coins'

export const DEC_PRECISION = 18

export interface Number<T> {
  add(other: any): T

  sub(other: any): T

  mul(other: any): T

  div(other: any): T

  mod(other: any): T
}

export namespace Number {
  export type Input = string | number | Decimal
  export type Output = Int | Dec

  export function parse(value: Input): Output {
    if (value instanceof Dec) {
      return value
    } else if (typeof value === 'string') {
      if (value.includes('.')) {
        return new Dec(value)
      } else {
        return new Int(value)
      }
    } else {
      const _value = new Decimal(value)
      if (_value.isInt()) {
        return new Int(_value)
      } else {
        return new Dec(_value.toString())
      }
    }
  }
}

/**
 * Represents decimal values serialized with 18 digits of precision. This implementation
 * is based on the `decimal.js` library, and returns {@link Dec} values for only {@link Dec.add},
 * {@link Dec.sub}, {@link Dec.mul}, {@link Dec.div}, and {@link Dec.mod}. For other methods inherited
 * from {@link Decimal}, you will need to convert back to {@link Dec} to remain compatible for
 * submitting information that requires {@link Dec} format back to the blockchain.
 *
 * Example:
 *
 * ```ts
 * const dec = new Dec(1.5);
 *
 * const decimal = dec.sqrt();
 * const dec2 = new Dec(decimal);
 */

export class Dec extends Decimal implements Number<Dec> {
  constructor(arg?: Number.Input) {
    super(
      new Decimal((arg || 0).toString()).toDecimalPlaces(
        DEC_PRECISION,
        Decimal.ROUND_DOWN
      )
    )
  }

  public static withPrecision(value: Decimal.Value, precision: number): Dec {
    return new Dec(value).div(new Decimal(10).pow(precision))
  }

  public static fromProto(value: string): Dec {
    const val = new Dec(value)
    if (val.decimalPlaces() > 0) {
      throw new Error('invalid proto Dec value')
    }
    return val.div(new Decimal(10).pow(DEC_PRECISION))
  }

  public toProto(): string {
    return this.mul(new Decimal(10).pow(DEC_PRECISION)).toString()
  }

  public override toString(): string {
    return this.toFixed()
  }

  // type conversion
  public toInt(): Int {
    return new Int(this)
  }

  // arithmetic

  public override add(other: Number.Input): Dec {
    const val = new Dec(Number.parse(other))
    return new Dec(super.add(val))
  }

  public override sub(other: Number.Input): Dec {
    const val = new Dec(Number.parse(other))
    return new Dec(super.sub(val))
  }

  public override mul(other: Number.Input): Dec {
    const val = new Dec(Number.parse(other))
    return new Dec(super.mul(val))
  }

  public override div(other: Number.Input): Dec {
    const val = new Dec(Number.parse(other))
    return new Dec(super.div(val))
  }

  public override mod = (other: Number.Input): Dec => {
    const val = new Dec(Number.parse(other))
    return new Dec(super.mod(val))
  }

  public mulPow = (other: Number.Input, base: Number.Input = 10): Dec => {
    const val = new Dec(Number.parse(other))
    return new Dec(super.mul(new Dec(base).pow(val)))
  }

  public divPow = (other: Number.Input, base: Number.Input = 10): Dec => {
    const val = new Dec(Number.parse(other))
    return new Dec(super.div(new Dec(base).pow(val)))
  }
}

const _Int = Decimal.clone()

/**
 * Represents Integer values. Used mainly to store integer values of {@link Coin} and {@link Coins}.
 *
 * Note: Do not use to work with values greater than 9999999999999999999. This
 * implementation is based on the `decimal.js` library, and returns Int values for only
 * [[Int.add]], [[Int.sub]], [[Int.mul]], [[Int.div]], and [[Int.mod]]. For other
 * methods inherited from `Decimal`, you will need to convert back to `Int` to remain
 * compatible for submitting information that requires `Int` format back to the
 * blockchain.
 *
 * Example:
 *
 * ```ts
 * const int = new Int(1.5);
 *
 * const decimal = int.pow(3);
 * const int2 = new Int(decimal);
 */
export class Int extends _Int implements Number<Number.Output> {
  constructor(arg?: Number.Input) {
    const _arg = new Decimal((arg || 0).toString())
    super(_arg.divToInt(1))
  }

  public static fromProto(value: string): Int {
    return new Int(value)
  }

  public toProto(): string {
    return this.toString()
  }

  public override toString(): string {
    return this.toFixed()
  }

  // type conversion
  public toDec(): Dec {
    return new Dec(this)
  }

  // arithmetic

  public override add(other: Number.Input): Number.Output {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).add(val)
    } else {
      return new Int(this.plus(val))
    }
  }

  public override sub(other: Number.Input): Number.Output {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).sub(val)
    } else {
      return new Int(this.minus(val))
    }
  }

  public override mul(other: Number.Input): Number.Output {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).mul(val)
    } else {
      return new Int(this.times(val))
    }
  }

  public override div(other: Number.Input): Number.Output {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).div(val)
    } else {
      return new Int(super.div(val))
    }
  }

  public override mod(other: Number.Input): Number.Output {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).mod(val)
    } else {
      return new Int(super.mod(val))
    }
  }

  public mulPow = (
    other: Number.Input,
    base: Number.Input = 10
  ): Number.Output => {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).mulPow(val, base)
    } else {
      return new Int(super.mul(new Int(base).pow(val)))
    }
  }

  public divPow = (
    other: Number.Input,
    base: Number.Input = 10
  ): Number.Output => {
    const val = Number.parse(other)
    if (val instanceof Dec) {
      return new Dec(this).divPow(val, base)
    } else {
      return new Int(super.div(new Int(base).pow(val)))
    }
  }
}

/**
 * Template tagged literal for creating new Dec objects out of literal string.
 * This does not support literal string interpolation  with `${}`.
 *
 * Usage is:
 *
 * ```ts
 * import { dec } from "@merlionzone/merlionjs";
 *
 * const dec1 = dec`234.12312`;
 * const dec2 = new Dec("234.12312");
 *
 * dec1.equals(dec2);
 * ```
 * @param strings
 */
export function dec(strings: TemplateStringsArray): Dec {
  return new Dec(strings[0])
}

/**
 * Template tagged literal for creating new Int objects out of literal string.
 * This does not support literal string interpolation  with `${}`.
 *
 * Usage is:
 *
 * ```ts
 * import { int } from "@merlionzone/merlionjs";
 *
 * const int1 = int`234`;
 * const int2 = new Int("234");
 *
 * int1.equals(int2);
 * ```
 * @param strings
 */

export function int(strings: TemplateStringsArray): Int {
  return new Int(strings[0])
}
