import { Image, ImageProps, useColorModeValue } from '@chakra-ui/react'
import web3authLogoDark from 'data-base64:~assets/thirdparty/web3auth-logo-Dark.svg'
import web3authLogoLight from 'data-base64:~assets/thirdparty/web3auth-logo.svg'

export const Web3AuthLogo = ({ w }: { w: ImageProps['w'] }) => {
  const web3authLogo = useColorModeValue(web3authLogoLight, web3authLogoDark)

  return <Image w={w} fit="cover" src={web3authLogo} alt="web3auth Logo" />
}
