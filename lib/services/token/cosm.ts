import { BaseTokenService } from './base'

export class CosmTokenService extends BaseTokenService {
  async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_COSMOS) {
      return
    }
  }
}

export const COSM_TOKEN_SERVICE = new CosmTokenService()
