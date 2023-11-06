import { Image, useColorModeValue } from '@chakra-ui/react'

import { Badge } from '~components/Badge'

export const TypeBadge = ({
  identifier,
  logo,
  logoLight,
  logoDark,
  logoLightInvert,
  logoDarkInvert,
  logoHeight
}: {
  identifier?: string
  logo?: string
  logoLight?: string
  logoDark?: string
  logoLightInvert?: boolean
  logoDarkInvert?: boolean
  logoHeight?: string | number
}) => {
  const themedLogo = useColorModeValue(logoLight, logoDark)

  const filter = useColorModeValue(
    logoLightInvert ? 'invert(100%)' : undefined,
    logoDarkInvert ? 'invert(100%)' : undefined
  )

  return (
    <>
      {(logo || themedLogo) && (
        <Image
          h={logoHeight || 4}
          py="2px"
          display="inline-block"
          fit="cover"
          filter={filter}
          src={logo || themedLogo}
          alt={identifier}
        />
      )}

      {identifier && <Badge>{identifier}</Badge>}
    </>
  )
}
