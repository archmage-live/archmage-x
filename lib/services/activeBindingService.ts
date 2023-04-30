import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { ActiveBindingAccount, IActiveBinding, TAB_ID_NONE } from '~lib/schema'

interface IActiveBindingService {
  getActiveBinding(
    origin: string,
    tabId: number | typeof TAB_ID_NONE
  ): Promise<IActiveBinding | undefined>

  setActiveBinding(
    origin: string,
    tabId: number,
    account: ActiveBindingAccount
  ): Promise<void>
}

// @ts-ignore
class ActiveBindingServicePartial implements IActiveBindingService {
  async getActiveBinding(origin: string, tabId: number | typeof TAB_ID_NONE) {
    return DB.activeBindings
      .where('[origin, tabId]')
      .equals([origin, tabId])
      .first()
  }
}

class ActiveBindingService extends ActiveBindingServicePartial {
  async setActiveBinding(
    origin: string,
    tabId: number,
    account: ActiveBindingAccount
  ) {
    const binding = await this.getActiveBinding(origin, tabId)
    if (binding) {
      await DB.activeBindings.update(binding.id, { account })
    } else {
      if (!(await this.getActiveBinding(origin, TAB_ID_NONE))) {
        await DB.activeBindings.add({
          origin,
          tabId: TAB_ID_NONE,
          account
        } as IActiveBinding)
      }
      await DB.activeBindings.add({ origin, tabId, account } as IActiveBinding)
    }
  }

  async removeActiveBinding(origin: string, tabId?: number) {
    if (typeof tabId === 'number') {
      await DB.activeBindings
        .where('[origin, tabId]')
        .equals([origin, tabId])
        .delete()
    } else {
      await DB.activeBindings.where('origin').equals(origin).delete()
    }
  }

  async clearActiveBindingsForTabs() {
    await DB.activeBindings.where('tabId').notEqual(TAB_ID_NONE).delete()
  }
}

function createActiveBindingService() {
  const serviceName = 'ActiveBindingService'
  if (ENV.inServiceWorker) {
    const service = new ActiveBindingService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IActiveBindingService>(
      serviceName,
      // @ts-ignore
      new ActiveBindingServicePartial()
    )
  }
}

export const ACTIVE_BINDING_SERVICE = createActiveBindingService()

export function useActiveBinding(origin?: string, tabId?: number) {
  const activeBinding = useLiveQuery(async () => {
    if (origin === undefined || tabId === undefined) {
      return undefined
    }
    return ACTIVE_BINDING_SERVICE.getActiveBinding(origin, tabId)
  }, [origin, tabId])

  const setActiveBinding = useCallback(
    async (origin: string, tabId: number, account: ActiveBindingAccount) => {
      await ACTIVE_BINDING_SERVICE.setActiveBinding(origin, tabId, account)
    },
    []
  )

  return {
    activeBinding,
    setActiveBinding
  }
}
