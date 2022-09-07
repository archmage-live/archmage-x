import { Box, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { Children, ReactNode, useEffect, useState } from 'react'

export const LazyTabs = ({
  index,
  children
}: {
  index: number
  children: ReactNode
}) => {
  const [indices, setIndices] = useState<boolean[]>([])
  const count = Children.count(children)
  useEffect(() => {
    setIndices(new Array(count).fill(false))
  }, [count])

  useEffect(() => {
    setIndices((indices) => {
      if (indices[index]) {
        return indices
      }
      indices = indices.slice()
      indices[index] = true
      return indices
    })
  }, [index])

  return (
    <Tabs index={index} h="full">
      <TabPanels h="full" position="relative">
        {Children.map(children, (child, i) => {
          const animate =
            index === i ? 'visible' : index > i ? 'exitLeft' : 'exitRight'
          return (
            <TabPanel p={0} _hidden={{ display: 'block!important' }}>
              <Box
                as={motion.div}
                variants={motionVariants}
                animate={animate}
                position="absolute"
                w="full"
                h="full"
                zIndex={index === i ? 1 : 0}
                overflowY="auto">
                {indices[i] && child}
              </Box>
            </TabPanel>
          )
        })}
      </TabPanels>
    </Tabs>
  )
}

const motionVariants = {
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.1,
      duration: 0.2
    }
  },
  exitLeft: {
    x: '-50px',
    opacity: 0,
    transition: {
      duration: 0.1,
      x: {
        delay: 0.1
      }
    }
  },
  exitRight: {
    x: '50px',
    opacity: 0,
    transition: {
      duration: 0.1,
      x: {
        delay: 0.1
      }
    }
  }
}
