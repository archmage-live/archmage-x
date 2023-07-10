// https://github.com/wbobeirne/eth-balance-checker
// A smart contract and library pair that allows you to check for multiple ERC20 and Ether balances across multiple addresses in a single RPC call.
import { AddressZero } from '@ethersproject/constants'
import { BaseProvider } from '@ethersproject/providers'
import {
  getAddressBalances,
  getAddressesBalances
} from 'eth-balance-checker/lib/ethers'

const NATIVE_TOKEN = AddressZero

class EthBalanceCheckerApi {
  private static chainContracts: Map<number, string> = new Map([
    [1, '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39'],
    [3, '0x8D9708f3F514206486D7E988533f770a16d074a7'],
    [4, '0x3183B673f4816C94BeF53958BaF93C671B7F8Cf2'],
    [5, '0x9788C4E93f9002a7ad8e72633b11E8d1ecd51f9b'],
    [56, '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'],
    [97, '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'],
    [137, '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'],
    [80001, '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'],
    [10, '0xB1c568e9C3E6bdaf755A60c7418C269eb11524FC'],
    [69, '0xB1c568e9C3E6bdaf755A60c7418C269eb11524FC'],
    [42161, '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c'],
    [43114, '0xD023D153a0DFa485130ECFdE2FAA7e612EF94818'],
    [250, '0x07f697424ABe762bB808c109860c04eA488ff92B'],
    [61, '0xfC701A6b65e1BcF59fb3BDbbe5cb41f35FC7E009']
  ])

  NATIVE_TOKEN = NATIVE_TOKEN

  async getAddressBalances(
    provider: BaseProvider,
    address: string,
    tokens: (string | typeof NATIVE_TOKEN)[] = [NATIVE_TOKEN] // '0x0' means native currency token
  ): Promise<Record<string, string> | undefined> {
    const network = await provider.getNetwork()
    const contractAddress = EthBalanceCheckerApi.chainContracts.get(
      network.chainId
    )
    if (!contractAddress) {
      return undefined
    }
    try {
      return await getAddressBalances(provider, address, tokens, {
        contractAddress
      })
    } catch (err) {
      console.error(err)
      return undefined
    }
  }

  async getAddressesBalances(
    provider: BaseProvider,
    addresses: string[],
    tokens: (string | typeof NATIVE_TOKEN)[] = [NATIVE_TOKEN] // '0x0' means native currency token
  ): Promise<Record<string, Record<string, string>> | undefined> {
    const network = await provider.getNetwork()
    const contractAddress = EthBalanceCheckerApi.chainContracts.get(
      network.chainId
    )
    if (!contractAddress) {
      return undefined
    }
    try {
      return await getAddressesBalances(provider, addresses, tokens, {
        contractAddress
      })
    } catch (err) {
      console.error(err)
      return undefined
    }
  }
}

export const ETH_BALANCE_CHECKER_API = new EthBalanceCheckerApi()
