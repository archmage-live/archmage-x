import { Network, Tenderly } from '@tenderly/sdk'

class TenderlyApi {
  api(chainId: number) {
    if (!Network[chainId]) {
      return
    }

    return new Tenderly({
      accountName: process.env.PLASMO_PUBLIC_TENDERLY_ACCOUNT_NAME || '',
      projectName: process.env.PLASMO_PUBLIC_TENDERLY_PROJECT_NAME || '',
      accessKey: process.env.PLASMO_PUBLIC_TENDERLY_ACCESS_KEY || '',
      network: chainId
    })
  }
}

export const TENDERLY_API = new TenderlyApi()
