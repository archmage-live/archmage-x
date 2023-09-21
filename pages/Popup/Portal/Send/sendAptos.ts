import { Types } from 'aptos'

import { IChainAccount, IToken } from '~lib/schema'
import { Provider } from '~lib/services/provider'

const APTOS_COIN = '0x1::aptos_coin::AptosCoin'

export async function buildSendAptosTx(
  provider: Provider,
  account: IChainAccount,
  to: string,
  amount: string | number,
  token?: IToken
) {
  if (!token) {
    // return new CoinClient(
    //   (provider as AptosProvider).client
    // ).transactionBuilder.buildTransactionPayload(
    //   '0x1::coin::transfer',
    //   [APTOS_COIN],
    //   [to, amount]
    // )
    return {
      type: 'entry_function_payload',
      function: '0x1::aptos_account::transfer', // or '0x1::coin::transfer'
      type_arguments: [], // or [APTOS_COIN]
      arguments: [to, amount]
    } as Types.TransactionPayload_EntryFunctionPayload
  } else {
    // TODO
    return
  }
}
