import { Stack } from '@chakra-ui/react'
import { useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { useActiveNetwork } from '~lib/active'
import { useTokenLists } from '~lib/services/token'

const TABS = ['Lists', 'Tokens'] as const

export default function ManageTokens() {
  const { network } = useActiveNetwork()

  const tokenLists = useTokenLists(network?.kind)

  const [tab, setTab] = useState<typeof TABS[number]>('Lists')

  return (
    <Stack>
      <SwitchBar targets={TABS} value={tab} onChange={setTab as any} />
    </Stack>
  )
}
