import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Stack,
  Text
} from '@chakra-ui/react'
import { FiSearch } from '@react-icons/all-files/fi/FiSearch'
import { MdOutlineFormatListBulleted } from '@react-icons/all-files/md/MdOutlineFormatListBulleted'
import * as React from 'react'
import { ReactNode, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { IToken } from '~lib/schema'
import { TokenItemStyle } from '~pages/Popup/Portal/TokenItem'
import { TokenList } from '~pages/Popup/Portal/TokenList'
import {
  ManageTokensModal,
  useManageTokensTitleAtom
} from '~pages/Popup/ManageTokensModal'

export const SelectTokenModal = ({
  isOpen,
  onClose,
  nativeTokenItem,
  onSelect
}: {
  isOpen: boolean
  onClose: () => void
  nativeTokenItem?: ReactNode
  onSelect: (token: IToken) => void
}) => {
  return (
    <ManageTokensModal
      isOpen={isOpen}
      onClose={onClose}
      prelude={
        <SelectToken
          nativeTokenItem={nativeTokenItem}
          onSelect={(token) => {
            onSelect(token)
            onClose()
          }}
        />
      }
    />
  )
}

const SelectToken = ({
  nativeTokenItem,
  onSelect
}: {
  nativeTokenItem?: ReactNode
  onSelect: (token: IToken) => void
}) => {
  const [, setTitle] = useManageTokensTitleAtom()
  useEffect(() => {
    setTitle('Select Token')
  }, [setTitle])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const { nextStep } = useWizard()

  return (
    <Stack h="calc(100% - 28px)" spacing={0} pt={8}>
      <Stack spacing={6}>
        <InputGroup w="full" size="lg">
          <InputLeftElement pointerEvents="none">
            {loading ? <Spinner size="xs" /> : <Icon as={FiSearch} />}
          </InputLeftElement>
          <Input
            placeholder="Search name or paste address"
            value={search}
            onChange={(e) => setSearch(e.target.value.trim())}
          />
        </InputGroup>

        <Divider />
      </Stack>

      <Box h="calc(100% - 114px)" overflowY="auto">
        <TokenList
          nativeTokenItem={nativeTokenItem}
          style={TokenItemStyle.DISPLAY_WITH_PRICE}
          placeholder
          onClick={onSelect}
        />
      </Box>

      <Divider />

      <HStack h={14} justify="center" align="end">
        <Button
          w="auto"
          size="md"
          leftIcon={<Icon color="gray.500" as={MdOutlineFormatListBulleted} />}
          variant="ghost"
          onClick={nextStep}>
          <Text color="gray.500">Manage Token Lists</Text>
        </Button>
      </HStack>
    </Stack>
  )
}
