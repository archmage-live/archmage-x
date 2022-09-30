import { Center } from '@chakra-ui/react'
import * as React from 'react'
import HashLoader from 'react-spinners/HashLoader'

import { useColor } from '~hooks/useColor'

export const SpinningOverlay = ({ loading }: { loading?: boolean }) => {
  const spinnerColor = useColor('purple.500', 'purple.500')
  if (!loading) {
    return <></>
  }

  return (
    <Center
      position="absolute"
      top={0}
      left={0}
      bottom={0}
      right={0}
      bg="blackAlpha.600"
      zIndex={1}>
      <HashLoader color={spinnerColor.toHexString()} speedMultiplier={3} />
    </Center>
  )
}
