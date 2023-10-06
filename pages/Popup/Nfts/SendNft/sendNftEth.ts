import { NftTokenType } from '@archmagelive/alchemy-sdk'

import { ERC721__factory, ERC1155__factory } from '~lib/network/evm/abi'
import { IChainAccount, INft } from '~lib/schema'
import { EvmNftInfo } from '~lib/services/nft/evm'
import { Provider } from '~lib/services/provider'
import { EvmProvider, EvmTxParams } from '~lib/services/provider/evm'

export async function buildSendNftEthTx(
  provider: Provider,
  account: IChainAccount,
  to: string,
  nft: INft
): Promise<EvmTxParams> {
  const info = nft.info as EvmNftInfo

  if (info.tokenType === NftTokenType.ERC721) {
    const erc721 = ERC721__factory.connect(
      info.contract.address,
      (provider as EvmProvider).provider
    )
    // @ts-ignore
    return await erc721.populateTransaction.safeTransferFrom(
      account.address!,
      to,
      info.tokenId
    )
  } else if (info.tokenType === NftTokenType.ERC1155) {
    const erc1155 = ERC1155__factory.connect(
      info.contract.address,
      (provider as EvmProvider).provider
    )
    return await erc1155.populateTransaction.safeTransferFrom(
      account.address!,
      to,
      info.tokenId,
      1,
      '0x'
    )
  } else {
    throw new Error(`Unsupported NFT type: ${info.tokenType}`)
  }
}
