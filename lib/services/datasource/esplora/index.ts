import {
  getAddress,
  getAddressTxs,
  getAddressTxsChain,
  getAddressTxsMempool,
  getAddressTxsUtxo,
  getScriphash
} from './addresses'
import {
  getAsset,
  getAssetRegistry,
  getAssetSupply,
  getAssetSupplyDecimal,
  getAssetTxs,
  getAssetTxsChain,
  getAssetTxsMempool
} from './assets'
import {
  getBlock,
  getBlockHeader,
  getBlockHeight,
  getBlockRaw,
  getBlockStatus,
  getBlockTxid,
  getBlockTxids,
  getBlockTxs,
  getBlocks,
  getBlocksTipHash,
  getBlocksTipHeight
} from './blocks'
import { getFeeEstimates } from './fees'
import {
  getTx,
  getTxHex,
  getTxMerkleBlockProof,
  getTxMerkleProof,
  getTxOutspend,
  getTxOutspends,
  getTxRaw,
  getTxStatus,
  postTx
} from './transactions'

export const ESPLORA_API = {
  getTx,
  getTxStatus,
  getTxHex,
  getTxRaw,
  getTxMerkleBlockProof,
  getTxMerkleProof,
  getTxOutspend,
  getTxOutspends,
  postTx,
  getAddress,
  getAddressTxs,
  getAddressTxsChain,
  getAddressTxsMempool,
  getAddressTxsUtxo,
  getScriphash,
  getBlock,
  getBlocks,
  getBlockStatus,
  getBlockTxs,
  getBlockTxid,
  getBlockTxids,
  getBlockRaw,
  getBlockHeader,
  getBlockHeight,
  getBlocksTipHash,
  getBlocksTipHeight,
  getFeeEstimates,
  getAsset,
  getAssetTxs,
  getAssetTxsMempool,
  getAssetTxsChain,
  getAssetSupply,
  getAssetSupplyDecimal,
  getAssetRegistry
}
