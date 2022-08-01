import { DB } from '~lib/db'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { EvmWallet } from '~lib/wallet'

console.log('Hello from background!')

SERVICE_WORKER_SERVER.listen()

WALLET_SERVICE.listWallets().then(console.log)

export {}
