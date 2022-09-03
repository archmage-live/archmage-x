import { ArrowForwardIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { Box, Center, HStack, Text, Tooltip } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { useActiveWallet } from '~lib/active'
import { ISubWallet } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const FromTo = ({
  from,
  to,
  checkFrom = undefined
}: {
  from: string
  to: string
  checkFrom?: ReactNode
}) => {
  return (
    <HStack justify="space-between">
      <HStack>
        <AccountAvatar text={from} scale={0.8} />
        <Text fontSize="md">{shortenAddress(from)}</Text>
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

      <HStack>
        <AccountAvatar text={to} scale={0.8} />
        <Text fontSize="md">{shortenAddress(to)}</Text>
      </HStack>
    </HStack>
  )
}

export const FromToWithCheck = ({
  from,
  to,
  subWallet: { id: subWalletId }
}: {
  subWallet: ISubWallet
  from: string
  to: string
}) => {
  const { subWallet } = useActiveWallet()

  return (
    <FromTo
      from={from}
      to={to}
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
