import { Image, useColorModeValue } from '@chakra-ui/react'

import { Badge } from '~components/Badge'

export const TypeBadge = ({
  identifier,
  logo,
  logoLight,
  logoDark,
  logoHeight
}: {
  identifier?: string
  logo?: string
  logoLight?: string
  logoDark?: string
  logoHeight?: string | number
}) => {
  const themedLogo = useColorModeValue(logoLight, logoDark)

  return (
    <>
      {(logo || themedLogo) && (
        <Image
          h={logoHeight || 4}
          py="2px"
          display="inline-block"
          fit="cover"
          src={logo || themedLogo}
          alt={identifier}
        />
      )}

      {identifier && <Badge>{identifier}</Badge>}
    </>
  )
}
