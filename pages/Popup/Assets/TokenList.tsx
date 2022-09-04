import {
  Button,
  Center,
  HStack,
  Icon,
  Image,
  Stack,
  Text
} from '@chakra-ui/react'
import { BiQuestionMark } from 'react-icons/bi'
import { MdOutlineFormatListBulleted } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'

import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { IToken } from '~lib/schema'
import { getTokenBrief, useTokens } from '~lib/services/token'

export const TokenList = () => {
  const { account } = useActive()
  const tokens = useTokens(account)

  const navigate = useNavigate()

  return (
    <Stack align="center">
      {tokens?.map((token) => {
        return (
          <TokenItem
            key={token.id}
            token={token}
            onClick={() => {
              navigate(token.id)
            }}
          />
        )
      })}

      <Button
        w={56}
        size="md"
        leftIcon={<Icon color="gray.500" as={MdOutlineFormatListBulleted} />}
        variant="ghost">
        <Text color="gray.500">Manage Token Lists</Text>
      </Button>
    </Stack>
  )
}

const TokenItem = ({
  token,
  onClick
}: {
  token: IToken
  onClick: () => void
}) => {
  const brief = getTokenBrief(token)

  return (
    <Button
      size="lg"
      w="full"
      h="63px"
      px={4}
      justifyContent="start"
      onClick={onClick}>
      <HStack w="full" justify="space-between" fontWeight="normal">
        <Center
          w={8}
          h={8}
          borderRadius="full"
          borderWidth="1px"
          borderColor="gray.500">
          <Image
            borderRadius="full"
            boxSize="24px"
            fit="cover"
            src={brief.iconUrl}
            fallback={<Icon as={BiQuestionMark} fontSize="xl" />}
            alt="Token Icon"
          />
        </Center>

        <HStack w="calc(100% - 35px)" justify="space-between" align="start">
          <Stack align="start" maxW="50%">
            <Text fontWeight="medium" noOfLines={1} display="block" maxW="full">
              {brief.name}
            </Text>
          </Stack>

          <Stack maxW="50%">
            <Text
              fontWeight="medium"
              fontSize="md"
              noOfLines={1}
              display="block"
              maxW="full">
              {formatNumber(brief.balance.amount)}
              &nbsp;
              {brief.balance.symbol}
            </Text>
          </Stack>
        </HStack>
      </HStack>
    </Button>
  )
}
