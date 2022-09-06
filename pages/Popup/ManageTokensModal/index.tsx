import { useState } from 'react'

import { WizardModal } from '~components/WizardModal'
import { ITokenList } from '~lib/schema'
import { SearchedToken } from '~lib/services/token'

import { ImportToken } from './ImportToken'
import { ImportTokenList } from './ImportTokenList'
import { ManageTokens } from './ManageTokens'

export const ManageTokensModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const [title, setTitle] = useState('')

  const [newTokenList, setNewTokenList] = useState<ITokenList>()
  const [newToken, setNewToken] = useState<SearchedToken>()

  return (
    <WizardModal isOpen={isOpen} onClose={onClose} title={title}>
      <ManageTokens
        setTitle={setTitle}
        setTokenList={setNewTokenList}
        setToken={setNewToken}
      />
      <>
        {newTokenList && (
          <ImportTokenList setTitle={setTitle} tokenList={newTokenList} />
        )}
        {newToken && <ImportToken setTitle={setTitle} token={newToken.token} />}
      </>
    </WizardModal>
  )
}
