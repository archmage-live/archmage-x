import { checkLockTime } from '~lib/hooks/useLockTime'
import '~lib/keystore'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { NetworkService } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import '~lib/services/provider/aptos/providerService'
import '~lib/services/provider/evm/providerService'
import { TokenService } from '~lib/services/token'
import '~lib/services/transaction'
import '~lib/services/walletService'

async function init() {
  SERVICE_WORKER_SERVER.listen()

  checkLockTime(async () => {
    await PASSWORD_SERVICE.lock()
  })

  await NetworkService.init()
  await TokenService.init()
}

init()

export {}
