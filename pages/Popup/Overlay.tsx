import { Center, Image, Stack, useColorModeValue } from '@chakra-ui/react'
import archmageImage from 'data-base64:~assets/archmage.svg'
import { ReactNode } from 'react'
import HashLoader from 'react-spinners/HashLoader'
import { useTimeout } from 'react-use'

import { useColor } from '~hooks/useColor'
import { useCheckUnlocked } from '~lib/password'

interface OverlayProps {
  isLoading?: boolean
  subtitle?: ReactNode
  children?: ReactNode
}

export const Overlay = ({ isLoading, subtitle, children }: OverlayProps) => {
  const spinnerColor = useColor('purple.500', 'purple.500')

  return (
    <Stack
      p="4"
      pt="32"
      spacing="12"
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      zIndex={9999}
      bg={useColorModeValue('purple.50', 'gray.800')}>
      <Stack align="center">
        <Image w="128px" h="128px" src={archmageImage} alt="Archmage Logo" />

        {subtitle}
      </Stack>

      {isLoading && (
        <Center>
          <HashLoader color={spinnerColor.toHexString()} speedMultiplier={3} />
        </Center>
      )}

      {children}
    </Stack>
  )
}

export const OverlayCheckUnlocked = ({ isLoading }: OverlayProps) => {
  useCheckUnlocked()

  const [isReady] = useTimeout(50)

  if (isLoading === false) {
    return <></>
  }

  return <Overlay isLoading={isLoading && !!isReady()} />
}
