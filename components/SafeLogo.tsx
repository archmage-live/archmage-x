import { Image, ImageProps, useColorModeValue } from '@chakra-ui/react'
import safeLogo from 'data-base64:~assets/thirdparty/Safe_Logos_H-Lockup_Black.svg'

export const SafeLogo = ({ w }: { w: ImageProps['w'] }) => {
  const filter = useColorModeValue(undefined, 'invert(100%)')

  return (
    <Image w={w} fit="cover" filter={filter} src={safeLogo} alt="Safe Logo" />
  )
}
