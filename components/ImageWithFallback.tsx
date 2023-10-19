import { Image, ImageProps, Skeleton } from '@chakra-ui/react'
import placeholder from 'data-base64:~assets/placeholder.png'

export const ImageWithFallback = (
  props: Omit<ImageProps, 'fallback' | 'fallbackSrc'>
) => {
  return (
    <Image
      {...props}
      src={props.src || placeholder}
      alt={props.alt}
      fallback={<Skeleton boxSize={props.boxSize} />}
    />
  )
}
