import { atom, useAtom } from 'jotai'
import { ReactNode, useState } from 'react'

import { WizardModal } from '~components/WizardModal'
import { useActiveAccount } from '~lib/active'
import { ITokenList } from '~lib/schema'
import { SearchedToken, useTokens } from '~lib/services/token'

import { ImportToken } from './ImportToken'
import { ImportTokenList } from './ImportTokenList'
import { ManageTokens } from './ManageTokens'

const manageTokensTitleAtom = atom<string>('')

export function useManageTokensTitleAtom() {
  return useAtom(manageTokensTitleAtom)
}

export const ManageTokensModal = ({
  isOpen,
  onClose,
  prelude
}: {
  isOpen: boolean
  onClose: () => void
  prelude?: ReactNode
}) => {
  const [title] = useManageTokensTitleAtom()

  const [newTokenList, setNewTokenList] = useState<ITokenList>()
  const [newToken, setNewToken] = useState<SearchedToken>()

  const account = useActiveAccount()
  const { fetchTokens } = useTokens(account)

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={async () => {
        onClose()
        await fetchTokens()
      }}
      title={title}>
      {prelude}
      <ManageTokens setTokenList={setNewTokenList} setToken={setNewToken} />
      <>
        {newTokenList && <ImportTokenList tokenList={newTokenList} />}
        {newToken && <ImportToken token={newToken.token} />}
      </>
    </WizardModal>
  )
}
