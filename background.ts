import '~lib/inject'
import '~lib/keystore'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import '~lib/services/provider/evmService'
import '~lib/services/walletService'

SERVICE_WORKER_SERVER.listen()

export {}
