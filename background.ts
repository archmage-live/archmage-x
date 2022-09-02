import { checkLockTime } from '~hooks/useLockTime'
import '~lib/inject'
import '~lib/keystore'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import '~lib/services/passwordService'
import '~lib/services/provider/evmService'
import '~lib/services/token'
import '~lib/services/transaction'
import '~lib/services/walletService'

SERVICE_WORKER_SERVER.listen()

checkLockTime(async () => {
  await PASSWORD_SERVICE.lock()
})

export {}
