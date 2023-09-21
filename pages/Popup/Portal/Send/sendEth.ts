import { ERC20__factory } from '~lib/network/evm/abi'
import { IChainAccount, IToken } from '~lib/schema'
import { Provider } from '~lib/services/provider'
import { EvmProvider, EvmTxParams } from '~lib/services/provider/evm'

export async function buildSendEthTx(
  provider: Provider,
  account: IChainAccount,
  to: string,
  amount: string | number,
  token?: IToken
) {
  if (!token) {
    return {
      from: account.address,
      to,
      value: amount
    } as EvmTxParams
  } else {
    const tokenContract = ERC20__factory.connect(
      token.token,
      (provider as EvmProvider).provider
    )
    return await tokenContract.populateTransaction.transfer(to, amount, {
      from: account.address
    })
  }
}
