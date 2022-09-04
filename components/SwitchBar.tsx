import { Button, HStack, useColorModeValue } from '@chakra-ui/react'

interface SwitchBarProps {
  targets: readonly string[]
  value: string

  onChange(value: string): void
}

export const SwitchBar = ({ targets, value, onChange }: SwitchBarProps) => {
  const btnColor = useColorModeValue('gray.500', 'gray.400')
  const btnActiveColor = useColorModeValue('purple.500', 'white')
  const btnActiveBg = useColorModeValue('gray.50', 'gray.800')

  return (
    <HStack
      bg={useColorModeValue('white', 'gray.900')}
      boxShadow={useColorModeValue('md', 'dark-lg')}
      borderRadius="3xl">
      {targets.map((target) => {
        return (
          <Button
            flex={1}
            key={target}
            variant="ghost"
            borderRadius="3xl"
            colorScheme="gray"
            color={btnColor}
            _active={{ bg: btnActiveBg, color: btnActiveColor }}
            _hover={{ bg: btnActiveBg, color: btnActiveColor }}
            isActive={value === target}
            onClick={() => onChange(target)}>
            {target}
          </Button>
        )
      })}
    </HStack>
  )
}
