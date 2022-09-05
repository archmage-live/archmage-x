import { Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { useTransparentize } from '~hooks/useColor'

export type AlertLevel = 'info' | 'warning' | 'error'

interface AlertBoxProps {
  level?: AlertLevel
  children: ReactNode
}

export const AlertBox = ({ level = 'warning', children }: AlertBoxProps) => {
  let bgColor, borderColor
  switch (level) {
    case 'info':
      bgColor = 'blue.300'
      borderColor = 'blue.500'
      break
    case 'warning':
      bgColor = 'orange.300'
      borderColor = 'orange.500'
      break
    case 'error':
      bgColor = 'red.300'
      borderColor = 'red.500'
      break
  }

  const bg = useTransparentize(bgColor, bgColor, 0.1)
  return children ? (
    <Text
      py="2"
      px="4"
      borderRadius="4px"
      borderWidth="1px"
      borderColor={borderColor}
      bg={bg}>
      {children}
    </Text>
  ) : (
    <></>
  )
}
