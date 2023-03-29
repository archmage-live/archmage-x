import { ArrowForwardIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { Center, HStack, Text, Tooltip } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { useActiveWallet } from '~lib/active'
import { ISubWallet } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const FromTo = ({
  from,
  to,
  leadingChars,
  leadingChars2,
  checkFrom = undefined
}: {
  from?: string
  to?: string
  leadingChars?: number | string
  leadingChars2?: number | string
  checkFrom?: ReactNode
}) => {
  return (
    <HStack justify="space-between">
      <HStack minW={36}>
        {from && <AccountAvatar text={from} scale={0.8} />}
        <Text fontSize="md">
          {from ? shortenAddress(from, { leadingChars }) : 'n/a'}
        </Text>
        {checkFrom}
      </HStack>

      <Center
        w={8}
        h={8}
        borderRadius="full"
        borderWidth="1px"
        borderColor="gray.500">
        <ArrowForwardIcon w={6} h={6} color="gray.500" />
      </Center>

      <HStack minW={36} justify="end">
        {to && <AccountAvatar text={to} scale={0.8} />}
        <Text fontSize="md">
          {to
            ? shortenAddress(to, {
                leadingChars:
                  leadingChars2 === undefined ? leadingChars : leadingChars2
              })
            : 'n/a'}
        </Text>
      </HStack>
    </HStack>
  )
}

export const FromToWithCheck = ({
  from,
  to,
  leadingChars,
  subWallet: { id: subWalletId }
}: {
  from?: string
  to?: string
  leadingChars?: number | string
  subWallet: ISubWallet
}) => {
  const { subWallet } = useActiveWallet()

  return (
    <FromTo
      from={from}
      to={to}
      leadingChars={leadingChars}
      checkFrom={
        subWallet !== undefined &&
        subWallet.id !== subWalletId && (
          <Tooltip label="Is this the correct account? It's different from the currently selected account in your wallet">
            <InfoOutlineIcon color="orange.500" />
          </Tooltip>
        )
      }
    />
  )
}
