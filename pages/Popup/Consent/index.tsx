import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCheckUnlocked } from '~lib/password'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  useConsentRequests
} from '~lib/services/consentService'

import { RequestPermission } from './RequestPermission'
import { SignMessage } from './SignMessage'
import { SignTypedData } from './SignTypedData'
import { Transaction } from './Transaction'
import { WatchAsset } from './WatchAsset'

export default function Consent() {
  const { isUnlocked } = useCheckUnlocked()

  const navigate = useNavigate()

  const requests = useConsentRequests()

  console.log(requests)
  useEffect(() => {
    if (!requests) {
      return
    }
    if (!requests.length) {
      navigate('/', { replace: true })
    }
  }, [navigate, requests])

  const [type, setType] = useState<ConsentType>()
  useEffect(() => {
    setType(!requests?.length ? undefined : requests[0].type)
  }, [requests])

  const filtered = useFilterRequests(requests, type)

  const onComplete = useCallback(async () => {
    const requests = await CONSENT_SERVICE.getRequests()
    if (!requests.length) {
      window.close()
    }
  }, [])

  if (!requests?.length || !filtered?.length) {
    return <></>
  }

  const req = requests[0]
  switch (type) {
    case ConsentType.UNLOCK: {
      if (isUnlocked) {
        CONSENT_SERVICE.processRequest(req, true).finally(() => {
          window.close()
        })
      }
      return <></>
    }
    case ConsentType.REQUEST_PERMISSION:
      return <RequestPermission request={req} />
    case ConsentType.TRANSACTION:
      return <Transaction requests={filtered} onComplete={onComplete} />
    case ConsentType.SIGN_MSG:
      return <SignMessage request={req} />
    case ConsentType.SIGN_TYPED_DATA:
      return <SignTypedData request={req} />
    case ConsentType.WATCH_ASSET:
      return <WatchAsset request={req} />
  }

  return <></>
}

function useFilterRequests(requests?: ConsentRequest[], type?: ConsentType) {
  return useMemo(() => {
    if (!requests?.length || !type) {
      return
    }
    return requests.filter((request) => request.type === type)
  }, [requests, type])
}
