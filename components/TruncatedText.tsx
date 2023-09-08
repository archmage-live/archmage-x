import { Text, TextProps, Tooltip } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

interface TruncatedTextProps extends TextProps {}

export const TruncatedText = ({
  noOfLines = 1,
  children,
  ...props
}: TruncatedTextProps) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) {
      setIsTruncated(false)
    } else {
      setIsTruncated(
        element.offsetWidth < element.scrollWidth ||
          element.offsetHeight < element.scrollHeight
      )
    }
  }, [])

  return (
    <Tooltip label={children} isDisabled={!isTruncated}>
      <Text ref={textRef} noOfLines={noOfLines} {...props}>
        {children}
      </Text>
    </Tooltip>
  )
}
