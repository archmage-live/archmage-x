import {
  Coin as CosmCoin,
  DecCoin as CosmDecCoin
} from 'cosmjs-types/cosmos/base/v1beta1/coin'

import { Dec, Int, Number } from './number'

/**
 * Analogous to `sdk.Coin` and `sdk.DecCoin` from Cosmos SDK. A composite value that combines
 * a denomination with an amount value. Immutable once created, and operations
 * that return {@link Coin} will return a new {@link Coin} object. See {@link Coins} for
 * a collection of {@link Coin} objects.
 */
export class Coin implements Number<Coin> {
  public readonly amount: Number.Output

  /**
   * Creates a new coin. Depending on the type of amount, it will be converted to an
   * integer coin or decimal coin.
   *
   * @param denom denomination
   * @param amount coin's amount
   */
  constructor(public readonly denom: string, amount: Number.Input) {
    this.amount = Number.parse(amount)
  }

  /**
   * Checks whether the Coin is an Integer coin.
   */
  public isIntCoin(): boolean {
    return this.amount instanceof Int
  }

  /**
   * Checks whether the Coin is a Decimal coin.
   */
  public isDecCoin(): boolean {
    return this.amount instanceof Dec
  }

  /**
   * Turns the Coin into an Integer coin.
   */
  public toIntCoin(): Coin {
    return new Coin(this.denom, new Int(this.amount))
  }

  /**
   * Turns the Coin into an Integer coin with ceiling the amount.
   */
  public toIntCeilCoin(): Coin {
    return new Coin(this.denom, new Int(this.amount.ceil()))
  }

  /**
   * Turns the Coin into a Decimal coin.
   */
  public toDecCoin(): Coin {
    return new Coin(this.denom, new Dec(this.amount))
  }

  /**
   * Outputs `<amount><denom>`.
   *
   * Eg: `Coin('alion', 1500) -> 1500alion`
   */
  public toString(): string {
    const amount = this.amount.toFixed()
    if (this.isDecCoin() && amount.indexOf('.') === -1) {
      return `${amount}.0${this.denom}`
    }
    return `${amount}${this.denom}`
  }

  public static fromString(str: string): Coin {
    const m = str.match(
      /^(\d+(?:\.\d+)?|\.\d+)\s*([a-zA-Z][a-zA-Z\d/-]{2,127})$/
    )
    if (m === null) {
      throw new Error(`failed to parse to Coin: ${str}`)
    }
    const amount = m[1]
    const denom = m[2]
    return new Coin(denom, amount)
  }

  /**
   * Creates a new Coin adding to the current value.
   *
   * @param other
   */
  public add(other: Number.Input | Coin): Coin {
    let otherAmount
    if (other instanceof Coin) {
      if (other.denom !== this.denom) {
        throw new Coin.ArithmeticError(
          `cannot add two Coins of different denoms: ${this.denom} and ${other.denom}`
        )
      }
      otherAmount = other.amount
    } else {
      otherAmount = other
    }

    otherAmount = Number.parse(otherAmount)
    return new Coin(this.denom, this.amount.add(otherAmount))
  }

  /**
   * Creates a new Coin subtracting from the current value.
   * @param other
   */
  public sub(other: Number.Input | Coin): Coin {
    let otherAmount
    if (other instanceof Coin) {
      if (other.denom !== this.denom) {
        throw new Coin.ArithmeticError(
          `cannot subtract two Coins of different denoms: ${this.denom} and ${other.denom}`
        )
      }
      otherAmount = other.amount
    } else {
      otherAmount = other
    }

    otherAmount = Number.parse(otherAmount)
    return new Coin(this.denom, this.amount.sub(otherAmount))
  }

  /**
   * Multiplies the current value with an amount.
   * @param other
   */
  public mul(other: Number.Input): Coin {
    const otherAmount = Number.parse(other)
    return new Coin(this.denom, this.amount.mul(otherAmount))
  }

  /**
   * Divides the current value with an amount.
   * @param other
   */
  public div(other: Number.Input): Coin {
    const otherAmount = Number.parse(other)
    return new Coin(this.denom, this.amount.div(otherAmount))
  }

  /**
   * Modulo the current value with an amount.
   * @param other
   */
  public mod(other: Number.Input): Coin {
    const otherAmount = Number.parse(other)
    return new Coin(this.denom, this.amount.mod(otherAmount))
  }

  public static fromProto(proto: CosmCoin): Coin {
    return new Coin(proto.denom, Number.parse(proto.amount))
  }

  public toProto(): CosmCoin {
    return CosmCoin.fromPartial({
      denom: this.denom,
      amount: this.amount.toString()
    })
  }

  public static fromProtoDec(proto: CosmDecCoin): Coin {
    return new Coin(proto.denom, Dec.fromProto(proto.amount))
  }

  public toProtoDec(): CosmDecCoin {
    return CosmDecCoin.fromPartial({
      denom: this.denom,
      amount: this.amount.toProto()
    })
  }
}

export namespace Coin {
  export class ArithmeticError {
    constructor(public readonly message: string) {}
  }
}
