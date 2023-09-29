import { useLiveQuery } from 'dexie-react-hooks'

import { DB, getNextField } from '~lib/db'
import { isBackgroundWorker } from '~lib/detect'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IContact } from '~lib/schema'

interface IContactService {
  getContacts(): Promise<IContact[]>

  getContact(id: number): Promise<IContact | undefined>

  addContact(contact: IContact): Promise<IContact>

  updateContact(contact: IContact): Promise<void>

  deleteContact(id: number): Promise<void>
}

// @ts-ignore
class ContactServicePartial implements IContactService {
  getContact(id: number): Promise<IContact | undefined> {
    return DB.contacts.get(id)
  }

  getContacts(): Promise<IContact[]> {
    return DB.contacts.orderBy('sortId').toArray()
  }
}

class ContactService extends ContactServicePartial {
  async addContact(contact: IContact): Promise<IContact> {
    contact.sortId = await getNextField(DB.contacts)
    contact.id = await DB.contacts.add(contact)
    return contact
  }

  async updateContact(contact: IContact): Promise<void> {
    await DB.contacts.put(contact)
  }

  async deleteContact(id: number): Promise<void> {
    await DB.contacts.delete(id)
  }
}

function createContactService() {
  const serviceName = 'contactService'
  if (isBackgroundWorker()) {
    const service = new ContactService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IContactService>(
      serviceName,
      // @ts-ignore
      new ContactServicePartial()
    )
  }
}

export const CONTACT_SERVICE = createContactService()

export function useContacts() {
  return useLiveQuery(() => {
    return CONTACT_SERVICE.getContacts()
  }, [])
}
