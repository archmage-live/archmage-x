import { setUnlockTime } from '~hooks/useLockTime'
import { ENV } from '~lib/env'
import { KEYSTORE } from '~lib/keystore'
import { PASSWORD } from '~lib/password'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'

export interface IPasswordService {
  createPassword(password: string): Promise<void>

  checkPassword(password: string): Promise<boolean>

  existsPassword(): Promise<boolean>

  isLocked(): Promise<boolean>

  isUnlocked(): Promise<boolean>

  unlock(password: string): Promise<boolean>

  lock(): Promise<void>
}

class PasswordService implements IPasswordService {
  async createPassword(password: string) {
    await PASSWORD.create(password)
    await setUnlockTime()
  }

  async checkPassword(password: string): Promise<boolean> {
    return PASSWORD.check(password)
  }

  async existsPassword() {
    return PASSWORD.exists()
  }

  async isLocked() {
    return PASSWORD.isLocked()
  }

  async isUnlocked() {
    return PASSWORD.isUnlocked()
  }

  async unlock(password: string) {
    const unlocked = await PASSWORD.unlock(password)

    if (unlocked) {
      await setUnlockTime()
      KEYSTORE.unlock()
    }

    return unlocked
  }

  async lock() {
    await PASSWORD.lock()
    await KEYSTORE.lock()
  }
}

function createPasswordService() {
  const serviceName = 'passwordService'
  if (ENV.inServiceWorker) {
    const service = new PasswordService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IPasswordService>(serviceName)
  }
}

export const PASSWORD_SERVICE = createPasswordService()
