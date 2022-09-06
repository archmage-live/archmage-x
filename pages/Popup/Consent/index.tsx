import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType
} from '~lib/services/consentService'

import { RequestPermission } from './RequestPermission'
import { SignMessage } from './SignMessage'
import { SignTypedData } from './SignTypedData'
import { Transaction } from './Transaction'
import { WatchAsset } from './WatchAsset'

export default function Consent() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ConsentRequest[]>()

  useEffect(() => {
    const effect = async () => {
      const requests = await CONSENT_SERVICE.getRequests()
      if (!requests.length) {
        navigate('/home', { replace: true })
      } else {
        setRequests(requests)
      }
    }
    effect()
  }, [navigate])

  if (!requests?.length) {
    return <></>
  }
  const req = requests[0]
  switch (req.type) {
    case ConsentType.REQUEST_PERMISSION:
      return <RequestPermission request={req} />
    case ConsentType.TRANSACTION:
      return <Transaction request={req} />
    case ConsentType.SIGN_MSG:
      return <SignMessage request={req} />
    case ConsentType.SIGN_TYPED_DATA:
      return <SignTypedData request={req} />
    case ConsentType.WATCH_ASSET:
      return <WatchAsset request={req} />
  }

  return <></>
}
