import { QuestionIcon } from '@chakra-ui/icons'
import { BoxProps, HStack, Text, useColorModeValue } from '@chakra-ui/react'

export const TitleBar = (props: BoxProps) => {
  const activeColor = useColorModeValue('gray.800', 'whiteAlpha.900')

  return (
    <HStack
      justify="space-between"
      px="12"
      py="8"
      fontSize="xl"
      fontWeight="bold"
      {...props}>
      <Text cursor="pointer">Archmage X</Text>

      <HStack
        color="gray.500"
        _hover={{ color: activeColor }}
        transition="color 0.1s"
        cursor="pointer">
        <QuestionIcon />
        <Text>Help</Text>
      </HStack>
    </HStack>
  )
}
