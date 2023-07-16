import { Provider } from '@ethersproject/abstract-provider'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { BytesLike, arrayify, hexlify } from '@ethersproject/bytes'
import { Contract } from '@ethersproject/contracts'
import assert from 'assert'

const MULTISEND_ADDR = '0x8ae01fcf7c655655ff2c6ef907b8b4718ab4e17c'

export class Erc4337CallDataDecoder {
  constructor(private provider: Provider, private address: string) {}

  decodeSimpleAccountExecute(data: BytesLike): {
    dest: string
    value: BigNumber
    func: string
  } {
    const simpleAccount = new Contract(
      this.address,
      ['function execute(address dest, uint256 value, bytes calldata func)'],
      this.provider
    )
    const decoded = simpleAccount.interface.decodeFunctionData('execute', data)
    return {
      dest: decoded.dest,
      value: BigNumber.from(decoded.value),
      func: decoded.func
    }
  }

  decodeSimpleAccountExecuteBatch(data: BytesLike): {
    dest: string[]
    func: string[]
  } {
    const simpleAccount = new Contract(
      this.address,
      ['function executeBatch(address[] calldata dest, bytes[] calldata func)'],
      this.provider
    )
    const decoded = simpleAccount.interface.decodeFunctionData(
      'executeBatch',
      data
    )
    return {
      dest: decoded.dest,
      func: decoded.func
    }
  }

  decodeKernelAccountExecute(data: BytesLike): {
    to: string
    value: BigNumber
    data: string
    operation: number // 0 -> call; 1 -> delegatecall
  } {
    const kernelAccount = new Contract(
      this.address,
      [
        'function executeAndRevert(address to, uint256 value, bytes calldata data, Operation operation)'
      ],
      this.provider
    )
    const decoded = kernelAccount.interface.decodeFunctionData(
      'executeAndRevert',
      data
    )
    return {
      to: decoded.to,
      value: BigNumber.from(decoded.value),
      data: decoded.data,
      operation: BigNumber.from(decoded.operation).toNumber()
    }
  }

  decodeKernelAccountExecuteBatch(data: BytesLike): {
    to: string
    value: BigNumber
    data: string
    operation: number
    transactions: {
      to: string
      value: BigNumber
      data: string
      delegateCall: boolean
    }[]
  } {
    const {
      to,
      value,
      data: multiSendData,
      operation
    } = this.decodeKernelAccountExecute(data)
    assert(value.isZero())
    assert(operation === 1)

    // https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/MultiSend.sol
    const multiSend = new Contract(MULTISEND_ADDR, [
      'function multiSend(bytes memory transactions)'
    ])
    const decoded = multiSend.interface.decodeFunctionData(
      'multiSend',
      multiSendData
    )

    const result = []
    let transactions = arrayify(decoded.transactions)
    while (transactions.length > 0) {
      const delegateCall = BigNumber.from(transactions[0]).toNumber()
      const to = getAddress(hexlify(transactions.slice(1, 21)))
      const value = BigNumber.from(transactions.slice(21, 53))
      const dataLength = BigNumber.from(transactions.slice(53, 85)).toNumber()
      const data = hexlify(transactions.slice(85, 85 + dataLength))

      transactions = transactions.slice(85 + dataLength)

      result.push({
        to,
        value,
        data,
        delegateCall: delegateCall === 1
      })
    }

    return {
      to,
      value,
      data: multiSendData,
      operation,
      transactions: result
    }
  }

  decodeKernelAccountV2Execute(data: BytesLike): {
    to: string
    value: BigNumber
    data: string
    operation?: number
  } {
    const kernel2Account = new Contract(
      this.address,
      [
        'function execute(address to, uint256 value, bytes calldata data, Operation operation)'
      ],
      this.provider
    )

    // TODO
    const sig = kernel2Account.interface.getSighash('execute')
    if (hexlify(data).slice(2, 10) !== sig.slice(2, 10)) {
      return {
        to: this.address,
        value: BigNumber.from(0),
        data: hexlify(data)
      }
    }

    const decoded = kernel2Account.interface.decodeFunctionData('execute', data)
    return {
      to: decoded.to,
      value: BigNumber.from(decoded.value),
      data: decoded.data,
      operation: BigNumber.from(decoded.operation).toNumber()
    }
  }

  decodeKernelAccountV2ExecuteBatch(data: BytesLike) {
    return this.decodeKernelAccountExecuteBatch(data)
  }
}
