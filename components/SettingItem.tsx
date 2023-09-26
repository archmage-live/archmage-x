import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface SettingItemProps {
  title: string
  description?: string
  setting: ReactNode
  forPopup?: boolean
}

export const SettingItem = ({
  title,
  description,
  setting,
  forPopup
}: SettingItemProps) => {
  const titleColor = useColorModeValue('purple.600', 'purple.400')

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Text
          fontSize="xl"
          fontWeight={forPopup ? 'medium' : undefined}
          color={!forPopup ? titleColor : undefined}>
          {title}
        </Text>
        {description && (
          <Text fontSize="md" color={forPopup ? 'gray.500' : undefined}>
            {description}
          </Text>
        )}
      </Stack>
      <Box>{setting}</Box>
    </Stack>
  )
}
