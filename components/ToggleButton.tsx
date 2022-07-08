import { Box, useColorModeValue } from '@chakra-ui/react'
import { MotionProps, VariantLabels, motion } from 'framer-motion'
import React, { FunctionComponent } from 'react'

const Path: FunctionComponent<MotionProps | { d: string }> = (props) => (
  <motion.path
    fill="transparent"
    strokeWidth="2"
    strokeLinecap="round"
    {...props}
  />
)

interface ToggleIconProps {
  animate: VariantLabels
}

// eslint-disable-next-line react/display-name
export const ToggleIcon = ({ animate }: ToggleIconProps) => {
  const color = useColorModeValue('hsl(0, 0%, 18%)', 'hsl(360, 0%, 82%)')
  const hoverColor = useColorModeValue('hsl(0, 0%, 0%)', 'hsl(360, 0%, 100%)')

  return (
    <motion.svg
      viewBox="0 0 20 20"
      animate={animate}
      stroke={color}
      whileHover={{ stroke: hoverColor }}>
      <Path
        variants={{
          closed: { d: 'M 3 4 L 17 4' },
          open: { d: 'M 3 4 L 17 16' }
        }}
        initial={{
          d: 'M 3 4 L 17 4'
        }}
      />
      <Path
        d="M 3 10 L 17 10"
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 }
        }}
        initial={{
          opacity: 1
        }}
        transition={{ duration: 0.1 }}
      />
      <Path
        variants={{
          closed: { d: 'M 3 16 L 17 16' },
          open: { d: 'M 3 16 L 17 4' }
        }}
        initial={{
          d: 'M 3 16 L 17 16'
        }}
      />
    </motion.svg>
  )
}

interface ToggleButtonProps {
  isOpen: boolean

  onClick(): void
}

export const ToggleButton = ({ isOpen, onClick }: ToggleButtonProps) => {
  return (
    <Box w="1.5rem" h="1.5rem" cursor="pointer" onClick={onClick}>
      <ToggleIcon animate={isOpen ? 'open' : 'closed'} />
    </Box>
  )
}
