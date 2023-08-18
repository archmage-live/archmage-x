import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
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
  const [forPopupSettings] = useForPopupSettings()

  const titleColor = useColorModeValue('purple.600', 'purple.400')

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Text
          fontSize="xl"
          fontWeight={forPopupSettings ? 'medium' : undefined}
          color={!forPopupSettings ? titleColor : undefined}>
          {title}
        </Text>
        {description && (
          <Text fontSize="md" color={forPopupSettings ? 'gray.500' : undefined}>
            {description}
          </Text>
        )}
      </Stack>
      <Box>{setting}</Box>
    </Stack>
  )
}

const forPopupSettingsAtom = atom(false)

export function useForPopupSettings() {
  return useAtom(forPopupSettingsAtom)
}
