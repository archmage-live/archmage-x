import { checkLockTime } from '~hooks/useLockTime'
import '~lib/inject'
import '~lib/keystore'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { initNetworks } from '~lib/services/network'
import '~lib/services/provider/evmService'
import '~lib/services/walletService'
import { WALLET_SERVICE } from '~lib/services/walletService'

SERVICE_WORKER_SERVER.listen()

checkLockTime(async () => {
  await WALLET_SERVICE.lock()
})

initNetworks()

export {}
