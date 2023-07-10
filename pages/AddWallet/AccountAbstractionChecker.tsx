import { Checkbox, Radio, RadioGroup, Stack, chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { AccountAbstractionType } from '~lib/wallet'

import { useAccountAbstraction } from './addWallet'

export const AccountAbstractionChecker = ({}: {}) => {
  const [, setAccountAbstraction] = useAccountAbstraction()

  const [isAa, setIsAa] = useState(false)
  const [aaType, setAaType] = useState(AccountAbstractionType.ERC4337)

  useEffect(() => {
    setAaType(AccountAbstractionType.ERC4337)
  }, [isAa])

  useEffect(() => {
    if (!isAa) {
      setAccountAbstraction(undefined)
    } else {
      setAccountAbstraction({
        type: aaType
      })
    }
  }, [isAa, aaType, setAccountAbstraction])

  return (
    <Stack spacing={4}>
      <Checkbox
        size="lg"
        colorScheme="purple"
        isChecked={isAa}
        onChange={(e) => setIsAa(e.target.checked)}>
        <chakra.span color="gray.500" fontSize="lg">
          Create Account Abstraction wallet
        </chakra.span>
      </Checkbox>

      {isAa && (
        <RadioGroup ml={4} onChange={setAaType as any} value={aaType}>
          <Stack direction="row">
            <Radio value={AccountAbstractionType.ERC4337}>ERC-4337</Radio>
          </Stack>
        </RadioGroup>
      )}
    </Stack>
  )
}
