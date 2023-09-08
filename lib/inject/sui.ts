// https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/dapp-interface/WalletStandardInterface.ts

import {
  SUI_CHAINS,
  registerWallet,
  StandardConnectFeature,
  StandardEventsFeature,
  StandardEventsListeners,
  SuiFeatures,
  type Wallet,
  WalletAccount,
  type WalletIcon,
  IdentifierString,
  StandardConnectMethod,
  SuiSignTransactionBlockMethod,
  SuiSignAndExecuteTransactionBlockMethod,
  SuiSignMessageMethod, SuiSignPersonalMessageMethod
} from "@mysten/wallet-standard";
import archmageLogo from 'data-base64:~assets/archmage.svg'
import { isBackgroundWorker } from "~lib/detect";
import { context, Context, EventEmitter, EventType, Listener, RpcClientInjected } from "~lib/inject/client";
import { arrayify, hexlify } from "@ethersproject/bytes";
import mitt, { Emitter } from "mitt";
import { isTransactionBlock } from "@mysten/sui.js/transactions";

export const SUI_PROVIDER_NAME = 'starknetProvider'

export interface ISuiProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

type StakeInput = { validatorAddress: string };
type SuiWalletStakeFeature = {
  'suiWallet:stake': {
    version: '0.0.1';
    stake: (input: StakeInput) => Promise<void>;
  };
};

export class SuiWallet implements Wallet {
  version = '1.0.0' as const
  name = 'Archmage'
  icon = archmageLogo as WalletIcon
  #accounts: WalletAccount[] = []
  #activeChain: IdentifierString | null = null;
  #events: Emitter<Record<EventType, any>> = mitt()

  constructor(private service: ISuiProviderService) {
    this.init().finally()
  }

  async init() {
    this.service.on(
      'networkChanged',
      ({network}: {network: string}) => {
        this.#activeChain = network as IdentifierString

      })

    this.service.on(
      'accountsChanged',
      async () => {
        const accounts = await this.service.request(
          { method: 'accounts' },
          context()
        )

        this.#setAccounts(accounts)

        this.#events.emit('change', { accounts: this.accounts })
      })
  }

  #connect: StandardConnectMethod = async (input) => {
    const {network, accounts} = await this.service.request({
      method: 'connect',
      params: [input?.silent],
    }, context())

    this.#activeChain = network
    this.#setAccounts(accounts)

    this.#events.emit('change', { accounts: this.accounts })

    return {
      accounts: this.accounts
    }
  }

  #setAccounts(accounts: {address: string, publicKey: string}[]) {
    this.#accounts = accounts.map(({address, publicKey}) => {
      return {
        address,
        publicKey: publicKey ? arrayify(publicKey) : new Uint8Array(),
        chains: this.#activeChain ? [this.#activeChain] : [],
        features: ['sui:signAndExecuteTransaction'],
      }
    })
  }

  #on = (event: EventType, listener: Listener) => {
    this.#events.on(event, listener);
    return () => this.#events.off(event, listener);
  }

  get chains() {
    return []
  }

  get accounts() {
    return this.#accounts
  }

  get features(): StandardConnectFeature &
    StandardEventsFeature &
    SuiFeatures &
    SuiWalletStakeFeature
    {
    return {
      'standard:connect': {
        version: '1.0.0',
        connect: this.#connect,
      },
      'standard:events': {
        version: '1.0.0',
        on: this.#on,
      },
      'sui:signTransactionBlock': {
        version: '1.0.0',
        signTransactionBlock: this.#signTransactionBlock,
      },
      'sui:signAndExecuteTransactionBlock': {
        version: '1.0.0',
        signAndExecuteTransactionBlock: this.#signAndExecuteTransactionBlock,
      },
      'suiWallet:stake': {
        version: '0.0.1',
        stake: this.#stake,
      },
      'sui:signMessage': {
        version: '1.0.0',
        signMessage: this.#signMessage,
      },
      'sui:signPersonalMessage': {
        version: '1.0.0',
        signPersonalMessage: this.#signPersonalMessage,
      },
    };
  }

  #signTransactionBlock: SuiSignTransactionBlockMethod = async (input) => {
    if (!isTransactionBlock(input.transactionBlock)) {
      throw new Error(
        'Unexpect transaction format found. Ensure that you are using the `Transaction` class.',
      );
    }
    return await this.service.request({
      method: 'signTransactionBlock',
      params: [input.transactionBlock.serialize()],
    })
  }

  #signAndExecuteTransactionBlock: SuiSignAndExecuteTransactionBlockMethod = async (input) => {
    if (!isTransactionBlock(input.transactionBlock)) {
      throw new Error(
        'Unexpect transaction format found. Ensure that you are using the `Transaction` class.',
      );
    }

    return await this.service.request({
      method: 'signAndExecuteTransactionBlock',
      params: [input.transactionBlock.serialize(), input.options],
    })
  }

  #stake = async (input: StakeInput) => {
    return await this.service.request({
      method: 'stake',
      params: [input.validatorAddress],
    })
  }

  #signMessage: SuiSignMessageMethod = async ({ message, account }) => {
    return await this.service.request({
      method: 'signMessage',
      params: [hexlify(message)],
    })
  }

  #signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
    return await this.service.request({
      method: 'signPersonalMessage',
      params: [hexlify(message)],
    })
  }
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_SUI &&
  !globalThis.archmage.sui
) {

  const service =
    RpcClientInjected.instance().service<ISuiProviderService>(
      SUI_PROVIDER_NAME
    )

  const sui = new SuiWallet(service)

  registerWallet(sui)

  globalThis.archmage.sui = sui
}
