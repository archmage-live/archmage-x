import { Image } from '@chakra-ui/react'

import { Badge } from '~components/Badge'

export const TypeBadge = ({
  identifier,
  logo
}: {
  identifier?: string
  logo?: string
}) => {
  return (
    <>
      {identifier && <Badge>{identifier}</Badge>}
      {logo && (
        <Image
          h={4}
          py="2px"
          display="inline-block"
          fit="cover"
          src={logo}
          alt={identifier}
        />
      )}
    </>
  )
}
