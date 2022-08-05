import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface SettingItemProps {
  title: string
  description?: string
  setting: ReactNode
}

export const SettingItem = ({
  title,
  description,
  setting
}: SettingItemProps) => {
  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Text
          fontSize="xl"
          color={useColorModeValue('purple.600', 'purple.400')}>
          {title}
        </Text>
        {description && <Text fontSize="md">{description}</Text>}
      </Stack>
      <Box>{setting}</Box>
    </Stack>
  )
}
