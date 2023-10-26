import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  HStack,
  Icon,
  IconButton,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { FiCopy } from '@react-icons/all-files/fi/FiCopy'
import browser from 'webextension-polyfill'

import { shortenString } from '~lib/utils'

export const TextLink = ({
  text,
  name,
  url,
  urlLabel,
  leadingChars,
  prefixChars = 4,
  suffixChars
}: {
  text: string
  name: string
  url?: string
  urlLabel?: string
} & Parameters<typeof shortenString>[1]) => {
  const { hasCopied, onCopy } = useClipboard(text)

  return (
    <HStack fontSize="sm" color="gray.500" spacing={1}>
      <Text>
        {shortenString(text, { leadingChars, prefixChars, suffixChars })}
      </Text>
      <Tooltip
        label={!hasCopied ? `Copy ${name}` : 'Copied'}
        placement="top"
        closeOnClick={false}>
        <IconButton
          variant="ghost"
          aria-label={`Copy ${name}`}
          size="xs"
          icon={<Icon as={!hasCopied ? FiCopy : FiCheckCircle} />}
          onClick={onCopy}
        />
      </Tooltip>
      {url && urlLabel && (
        <Tooltip label={urlLabel} placement="top">
          <IconButton
            variant="ghost"
            aria-label={urlLabel}
            size="xs"
            icon={<ExternalLinkIcon />}
            onClick={() => {
              browser.tabs.create({ url }).finally()
            }}
          />
        </Tooltip>
      )}
    </HStack>
  )
}
