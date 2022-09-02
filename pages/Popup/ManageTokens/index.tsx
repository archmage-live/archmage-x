import { Stack } from '@chakra-ui/react'
import { useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { useTokenLists } from '~lib/services/token'
import { useSelectedNetwork } from '~pages/Popup/select'

const TABS = ['Lists', 'Tokens'] as const

export default function ManageTokens() {
  const { selectedNetwork: network } = useSelectedNetwork()

  const tokenLists = useTokenLists(network?.kind)

  const [tab, setTab] = useState<typeof TABS[number]>('Lists')

  return (
    <Stack>
      <SwitchBar targets={TABS} value={tab} onChange={setTab as any} />
    </Stack>
  )
}
