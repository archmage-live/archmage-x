import { Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { WALLET_SERVICE } from '~lib/services/walletService'

export default function PopupHome() {
  const navigate = useNavigate()

  useEffect(() => {
    const effect = async () => {
      if (!(await WALLET_SERVICE.isUnlocked())) {
        navigate(`/unlock?redirect=/`, { replace: true })
      }
    }
    effect()
  }, [navigate])

  return <Text>Hello</Text>
}
