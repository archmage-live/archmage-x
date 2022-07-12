import { AptosAccount } from 'aptos'
import { WalletOpts } from "~lib/wallet/index";

export class AptosWallet {
  account: AptosAccount

  static async from({ id, type, path }: WalletOpts): Promise<AptosWallet> {
    new AptosAccount()
    return {} as AptosWallet
  }
}
