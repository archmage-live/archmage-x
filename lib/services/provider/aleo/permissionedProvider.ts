import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import assert from 'assert';
import { ethErrors } from 'eth-rpc-errors';



import { getActiveNetworkByKind } from '~lib/active';
import { Context } from '~lib/inject/client';
import { NetworkKind } from '~lib/network';
import { INetwork } from '~lib/schema';



import { BasePermissionedProvider } from '../base';
import { AleoNetworkClient } from './client';
import { arrayify, hexlify } from "@ethersproject/bytes";
import { CONSENT_SERVICE, ConsentType, SignMsgPayload } from "~lib/services/consentService";


export class AleoPermissionedProvider extends BasePermissionedProvider {
  client: AleoNetworkClient

  private constructor(network: INetwork, origin: string) {
    assert(network.kind === NetworkKind.ALEO)
    super(network, origin)

    this.client = new AleoNetworkClient(network)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<AleoPermissionedProvider> {
    const provider = await AleoPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<AleoPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.ALEO)
    if (!network) {
      return
    }

    const permissionedProvider = new AleoPermissionedProvider(
      network,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]): Promise<any> {
    try {
      switch (method) {
        case 'connect':
          return await this.connect(ctx, params[0], params[1], params[2])
        case 'disconnect':
          return await this.disconnect(ctx)
        case 'accounts':
          return await this.getAccounts(ctx)
        case 'signMessage':
          return await this.signMessage(ctx, params[0])
        case 'decrypt':
        case 'requestRecords':
        case 'requestTransaction':
        case 'requestExecution':
        case 'requestBulkTransactions':
        case 'requestDeploy':
        case 'transactionStatus':
        case 'getExecution':
        case 'requestRecordPlaintexts':
        case 'requestTransactionHistory':
        default:
          throw Error('not implemented')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async connect(
    ctx: Context,
    decryptPermission: DecryptPermission,
    network: WalletAdapterNetwork,
    programs?: string[]
  ) {
    switch (decryptPermission) {
      case DecryptPermission.NoDecrypt:
      case DecryptPermission.UponRequest:
      case DecryptPermission.AutoDecrypt:
      case DecryptPermission.OnChainHistory:
        break
      default:
        throw ethErrors.rpc.invalidParams('invalid decrypt permission')
    }

    let networkId
    switch (network) {
      case WalletAdapterNetwork.Testnet:
        networkId = 3
        break
    }
    if (networkId !== this.network.chainId) {
      throw ethErrors.rpc.invalidParams('network not supported')
    }

    for (const program of programs || []) {
      if (!program.endsWith('.aleo')) {
        throw new Error('invalid programs')
      }

      // check if the program exists
      await this.client.getProgram(program)
    }


    await this.requestAccounts(ctx, {
      decryptPermission,
      programs
    })

    return {
      network,
      accounts: await this.getAccounts(ctx)
    }
  }

  async disconnect(ctx: Context) {
    if (!this.account) {
      // not connected
      return
    }

    await this.disconnectConnectedAccounts()
  }

  async getAccounts(ctx: Context) {
    if (!this.account) {
      throw ethErrors.provider.unauthorized()
    }
    return [{
      address: this.account.address!,
    }]
  }

  async signMessage(ctx: Context, message: string) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    message = hexlify(arrayify(message))

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_MSG,
        origin: this.origin,
        payload: {
          message
        } as SignMsgPayload
      },
      ctx
    )
  }

  async requestRecords(ctx: Context, program: string) {}
}
