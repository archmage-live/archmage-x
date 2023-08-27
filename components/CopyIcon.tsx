import {
  Button,
  HStack,
  Icon,
  IconButton,
  StackProps,
  Text,
  Tooltip,
  chakra,
  useClipboard,
  useColorModeValue
} from '@chakra-ui/react'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { FiCopy } from '@react-icons/all-files/fi/FiCopy'

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
  noWrap,
  props
}: CopyProps & {
  area?: string
  noWrap?: boolean
  props?: StackProps
}) => {
  const { hasCopied, onCopy } = useClipboard(copy)
  const label = !hasCopied ? `Copy ${name}` : 'Copied'

  const color = useColorModeValue('gray.600', 'gray.300')
  const bg = useColorModeValue('blackAlpha.50', 'blackAlpha.500')
  const hoverBg = useColorModeValue('blackAlpha.100', 'blackAlpha.400')

  const content = (
    <>
      <chakra.span fontWeight="medium" sx={{ fontFeatureSettings: '"tnum"' }}>
        {area || copy}
      </chakra.span>
      &nbsp;
      <Icon as={!hasCopied ? FiCopy : FiCheckCircle} />
    </>
  )

  const onClick = !hasCopied ? onCopy : undefined

  return (
    <Tooltip label={label} placement="top" closeOnClick={false}>
      {!noWrap ? (
        <HStack
          px={4}
          py={2}
          color={color}
          bg={bg}
          _hover={{ bg: hoverBg }}
          transition="bg 0.2s"
          borderRadius="4px"
          cursor="pointer"
          noOfLines={10}
          {...props}
          onClick={onClick}>
          {content}
        </HStack>
      ) : (
        <HStack cursor="pointer" {...props} onClick={onClick}>
          {content}
        </HStack>
      )}
    </Tooltip>
  )
}
