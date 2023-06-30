import { ReactNode } from 'react'

import { useColorModeEffect } from '~lib/hooks/useColorModeEffect'

export const ColorModeEffectProvider = ({
  children
}: {
  children: ReactNode
}) => {
  useColorModeEffect()

  return <>{children}</>
}
