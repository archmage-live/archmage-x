import { SUI_TYPE_ARG } from '@mysten/sui.js'
import type {
  CoinStruct,
  PaginatedCoins,
  SuiClient
} from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'

import { IChainAccount, IToken } from '~lib/schema'
import { Provider } from '~lib/services/provider'
import { SuiProvider } from '~lib/services/provider/sui/provider'
import { SuiTokenInfo } from '~lib/services/token/sui'

export async function buildSendSuiTx(
  provider: Provider,
  account: IChainAccount,
  to: string,
  amount: string | number,
  token?: IToken,
  isSendAll?: boolean
) {
  const client = (provider as SuiProvider).client

  const coinType = !token ? SUI_TYPE_ARG : token.token

  const coins = await getAllCoins(client, account, coinType)

  const tokenInfo = token?.info as SuiTokenInfo | undefined

  const tx = createTokenTransferTransaction({
    to,
    amount: amount.toString(),
    coins,
    coinType,
    isPayAllSui: isSendAll || false
  })

  tx.setSender(account.address!)
  await tx.build({ client })

  return tx
}

const MAX_COINS_PER_REQUEST = 100

async function getAllCoins(
  client: SuiClient,
  account: IChainAccount,
  coinType: string
) {
  let cursor: string | undefined | null = null
  const allData: CoinStruct[] = []
  // keep fetching until cursor is null or undefined
  do {
    const { data, nextCursor }: PaginatedCoins = await client.getCoins({
      owner: account.address!,
      coinType,
      cursor,
      limit: MAX_COINS_PER_REQUEST
    })
    if (!data || !data.length) {
      break
    }

    allData.push(...data)
    cursor = nextCursor
  } while (cursor)

  return allData
}

interface Options {
  coinType: string
  to: string
  amount: string
  isPayAllSui: boolean
  coins: CoinStruct[]
}

// https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/ui/app/pages/home/transfer-coin/utils/transaction.ts
function createTokenTransferTransaction({
  to,
  amount,
  coins,
  coinType,
  isPayAllSui
}: Options) {
  const tx = new TransactionBlock()

  if (isPayAllSui && coinType === SUI_TYPE_ARG) {
    tx.transferObjects([tx.gas], tx.pure(to))
    tx.setGasPayment(
      coins
        .filter((coin) => coin.coinType === coinType)
        .map((coin) => ({
          objectId: coin.coinObjectId,
          digest: coin.digest,
          version: coin.version
        }))
    )

    return tx
  }

  const bigIntAmount = BigInt(amount)
  const [primaryCoin, ...mergeCoins] = coins.filter(
    (coin) => coin.coinType === coinType
  )

  if (coinType === SUI_TYPE_ARG) {
    const coin = tx.splitCoins(tx.gas, [tx.pure(bigIntAmount)])
    tx.transferObjects([coin], tx.pure(to))
  } else {
    const primaryCoinInput = tx.object(primaryCoin.coinObjectId)
    if (mergeCoins.length) {
      // TODO: This could just merge a subset of coins that meet the balance requirements instead of all of them.
      tx.mergeCoins(
        primaryCoinInput,
        mergeCoins.map((coin) => tx.object(coin.coinObjectId))
      )
    }
    const coin = tx.splitCoins(primaryCoinInput, [tx.pure(bigIntAmount)])
    tx.transferObjects([coin], tx.pure(to))
  }

  return tx
}
