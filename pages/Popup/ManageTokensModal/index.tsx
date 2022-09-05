import { useState } from 'react'

import { WizardModal } from '~components/WizardModal'
import { ITokenList } from '~lib/schema'

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

  return (
    <WizardModal isOpen={isOpen} onClose={onClose} title={title}>
      <ManageTokens setTitle={setTitle} setTokenList={setNewTokenList} />
      <ImportTokenList setTitle={setTitle} tokenList={newTokenList} />
    </WizardModal>
  )
}
