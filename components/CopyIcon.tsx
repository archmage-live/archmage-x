import {
  Button,
  HStack,
  Icon,
  IconButton,
  StackProps,
  Tooltip,
  chakra,
  useClipboard,
  useColorModeValue
} from '@chakra-ui/react'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'

interface CopyProps {
  name: string
  copy: string
}

export const CopyButton = ({ name, copy }: CopyProps) => {
  const { hasCopied, onCopy } = useClipboard(copy)
  return !hasCopied ? (
    <Button variant="ghost" size="xs" leftIcon={<FiCopy />} onClick={onCopy}>
      Copy {name}
    </Button>
  ) : (
    <Button variant="ghost" size="xs" leftIcon={<FiCheckCircle />}>
      Copied
    </Button>
  )
}

export const CopyIcon = ({ name, copy }: CopyProps) => {
  const { hasCopied, onCopy } = useClipboard(copy)
  const label = !hasCopied ? `Copy ${name}` : 'Copied'
  return (
    <Tooltip label={label}>
      <IconButton
        variant="ghost"
        aria-label={label}
        size="xs"
        icon={!hasCopied ? <FiCopy /> : <FiCheckCircle />}
        onClick={!hasCopied ? onCopy : () => {}}
      />
    </Tooltip>
  )
}

export const CopyArea = ({
  name,
  copy,
  area,
  props
}: CopyProps & { area?: string; props?: StackProps }) => {
  const { hasCopied, onCopy } = useClipboard(copy)
  const label = !hasCopied ? `Copy ${name}` : 'Copied'
  return (
    <Tooltip label={label} placement="top">
      <HStack
        px={4}
        py={2}
        color={useColorModeValue('gray.600', 'gray.300')}
        bg={useColorModeValue('blackAlpha.50', 'blackAlpha.500')}
        _hover={{ bg: useColorModeValue('blackAlpha.100', 'blackAlpha.400') }}
        transition="bg 0.2s"
        borderRadius="4px"
        cursor="pointer"
        noOfLines={10}
        {...props}
        onClick={!hasCopied ? onCopy : () => {}}>
        <chakra.span fontFamily="monospace" fontWeight="medium">
          {area || copy}
        </chakra.span>
        <Icon as={!hasCopied ? FiCopy : FiCheckCircle} />
      </HStack>
    </Tooltip>
  )
}
