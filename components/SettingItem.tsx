import { Box, Stack, SystemProps, Text, TextProps } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface SettingItemProps {
  title: string
  description?: string
  setting: ReactNode
  titleProps?: TextProps
  descriptionProps?: TextProps
  spacing?: SystemProps['margin']
}

export const SettingItem = ({
  title,
  description,
  setting,
  titleProps,
  descriptionProps,
  spacing
}: SettingItemProps) => {
  return (
    <Stack spacing={spacing !== undefined ? spacing : 6}>
      <Stack spacing={1}>
        <Text {...titleProps}>{title}</Text>
        {description && <Text {...descriptionProps}>{description}</Text>}
      </Stack>
      <Box>{setting}</Box>
    </Stack>
  )
}
