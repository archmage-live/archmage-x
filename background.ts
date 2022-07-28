import { DB } from '~lib/db'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { EvmWallet } from '~lib/wallet'

console.log('Hello from background script!')

SERVICE_WORKER_SERVER.listen()

export {}
