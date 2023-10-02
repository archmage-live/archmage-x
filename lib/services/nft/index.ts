import { isBackgroundWorker } from '~lib/detect'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, INft, NftVisibility } from '~lib/schema'
import { Synchronizer } from '~lib/utils/synchronizer'

import { BaseNftService } from './base'
import { EVM_NFT_SERVICE } from './evm'

interface INftService {
  getNftCount(account: IChainAccount): Promise<number>

  getNfts(account: IChainAccount): Promise<INft[]>

  getNft(
    id: number | { account: IChainAccount; collection: string; tokenId: string }
  ): Promise<INft | undefined>

  addNft(
    args:
      | INft
      | {
          account: IChainAccount
          collection: string
          tokenId: string
          info: any
        }
  ): Promise<INft>

  setNftVisibility(id: number, visible: NftVisibility): Promise<void>

  fetchNfts(account: IChainAccount): Promise<void>
}

// @ts-ignore
class NftServicePartial extends BaseNftService implements INftService {}

class NftService extends NftServicePartial {
  private synchronizer = new Synchronizer()

  async fetchNfts(account: IChainAccount): Promise<void> {
    if (!account.address) {
      return
    }

    const waitKey = `${account.networkKind}-${account.chainId}-${account.address}`
    const { promise, resolve } = this.synchronizer.get(waitKey)
    if (promise) {
      return promise
    }

    switch (account.networkKind) {
      case NetworkKind.EVM:
        await EVM_NFT_SERVICE.fetchNfts(account)
        break
    }

    resolve()
  }
}

function createNftService(): INftService {
  const serviceName = 'nftService'
  let service
  if (isBackgroundWorker()) {
    service = new NftService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<INftService>(
      serviceName,
      // @ts-ignore
      new NftServicePartial()
    )
  }
  return service
}

export const NFT_SERVICE = createNftService()
