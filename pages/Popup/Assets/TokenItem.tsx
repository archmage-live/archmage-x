import {
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Stack,
  Text
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { BiQuestionMark } from 'react-icons/bi'
import { IoMdSwap } from 'react-icons/io'
import { MdDelete, MdMoreVert } from 'react-icons/md'

import { formatNumber } from '~lib/formatNumber'
import { IToken } from '~lib/schema'
import { TOKEN_SERVICE, getTokenBrief } from '~lib/services/token'

export const TokenItem = ({
  token,
  currencySymbol,
  price,
  change24Hour,
  onClick
}: {
  token: IToken
  currencySymbol?: string
  price?: number
  change24Hour?: number | null
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
      variant="solid-secondary"
      onClick={onClick}>
      <HStack w="full" justify="space-between" fontWeight="normal">
        <Image
          borderRadius="full"
          boxSize="28px"
          fit="cover"
          src={brief.iconUrl}
          fallback={
            <Center
              w={8}
              h={8}
              borderRadius="full"
              borderWidth="1px"
              borderColor="gray.500">
              <Icon as={BiQuestionMark} fontSize="xl" />
            </Center>
          }
          alt="Token Icon"
        />

        <HStack w="calc(100% - 56px)" justify="space-between" align="start">
          <Stack align="start" maxW="50%">
            <Text
              fontWeight="medium"
              fontSize="md"
              noOfLines={1}
              display="block"
              maxW="full">
              {brief.name}
            </Text>

            <Text
              fontWeight="medium"
              fontSize="sm"
              color="gray.500"
              noOfLines={1}
              display="block"
              maxW="full">
              {formatNumber(brief.balance.amount)}
              &nbsp;
              {brief.balance.symbol}
            </Text>
          </Stack>

          <Stack maxW="50%" align="end">
            <Text
              fontWeight="medium"
              fontSize="md"
              noOfLines={1}
              display="block"
              maxW="full">
              {currencySymbol}&nbsp;
              {formatNumber(
                price && new Decimal(price).mul(brief.balance.amount)
              )}
            </Text>

            <Text
              fontWeight="medium"
              fontSize="sm"
              noOfLines={1}
              display="block"
              maxW="full"
              color={
                typeof change24Hour !== 'number' || change24Hour === 0
                  ? 'gray.500'
                  : change24Hour > 0
                  ? 'green.500'
                  : 'red.500'
              }>
              {typeof change24Hour !== 'number'
                ? undefined
                : change24Hour >= 0
                ? '+'
                : '-'}
              {currencySymbol}&nbsp;
              {formatNumber(
                change24Hour &&
                  new Decimal(change24Hour)
                    .abs()
                    .mul(brief.balance.amount)
                    .div(100)
              )}
            </Text>
          </Stack>
        </HStack>

        <Menu autoSelect={false} placement="left">
          <MenuButton
            variant="link"
            minW={0}
            as={IconButton}
            icon={<Icon as={MdMoreVert} fontSize="xl" />}
          />
          <MenuList minW={32}>
            <MenuGroup title={brief.name}>
              <MenuItem
                icon={<Icon as={IoMdSwap} />}
                iconSpacing={2}
                onClick={() => {}}>
                Detail
              </MenuItem>
              <MenuItem
                icon={<Icon as={MdDelete} />}
                iconSpacing={2}
                onClick={() => {
                  TOKEN_SERVICE.setTokenVisibility(token.id, false)
                }}>
                Hide
              </MenuItem>
            </MenuGroup>
          </MenuList>
        </Menu>
      </HStack>
    </Button>
  )
}
