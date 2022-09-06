import { TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { Children, ReactNode, useEffect, useState } from 'react'

export const LazyTabs = ({
  index,
  children
}: {
  index?: number
  children: ReactNode
}) => {
  const [indices, setIndices] = useState<boolean[]>([])
  const count = Children.count(children)
  useEffect(() => {
    setIndices(new Array(count).fill(false))
  }, [count])

  useEffect(() => {
    setIndices((indices) => {
      if (index === undefined || indices[index]) {
        return indices
      }
      indices = indices.slice()
      indices[index] = true
      return indices
    })
  }, [index])

  return (
    <Tabs index={index}>
      <TabPanels>
        {Children.map(children, (child, i) => {
          return <TabPanel p={0}>{indices[i] && child}</TabPanel>
        })}
      </TabPanels>
    </Tabs>
  )
}
