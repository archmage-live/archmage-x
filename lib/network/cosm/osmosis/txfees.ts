import { Dec } from '~lib/network/cosm/number'

export function computeOsmosisTxFeeAmount(
  gasPrice: number,
  gas: number,
  denom: string, // the fee token other than $OSMO
  spotPrice: Dec // the spot price of the fee token over $OSMO
): string {
  // https://docs.osmosis.zone/osmosis-core/modules/txfees
  // https://github.com/osmosis-labs/osmosis/blob/main/proto/osmosis/txfees/v1beta1/query.proto
  // https://github.com/chainapsis/keplr-wallet/blob/master/packages/hooks/src/tx/fee.ts

  const feeAmount = new Dec(gasPrice).mul(gas)
  if (spotPrice.gt(new Dec(0))) {
    // If you calculate only the spot price, slippage cannot be considered.
    // However, rather than performing the actual calculation here,
    // the slippage problem is avoided by simply giving an additional value of 1%.
    return feeAmount.div(spotPrice).mul(1.01).ceil().toString()
  } else {
    // 0 fee amount makes the simulation twice because there will be no zero fee immediately.
    // To reduce this problem, just set the fee amount as 1.
    return '1'
  }
}
