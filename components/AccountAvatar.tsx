import { Box, BoxProps } from '@chakra-ui/react'
import Blockies from 'react-blockies'

interface AccountAvatarProps extends BoxProps {
  text?: string
  scale?: number
}

export const AccountAvatar = ({
  text,
  scale,
  ...props
}: AccountAvatarProps) => {
  // avoid random seed for empty text
  const seed = text || 'placeholder'

  return (
    <Box
      borderRadius="full"
      overflow="hidden"
      transform={
        scale !== undefined && scale < 1 ? `scale(${scale})` : undefined
      }
      width="fit-content"
      {...props}>
      <Blockies
        seed={seed}
        size={10}
        scale={scale !== undefined && scale > 1 ? scale : 3}
      />
    </Box>
  )
}
