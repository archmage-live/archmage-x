import { useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export function useTabsHeaderScroll() {
  const scrollRef = useRef(null)
  const anchorRef = useRef(null)
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: anchorRef,
    offset: ['start start', 'end end']
  })
  const [tabsHeaderSx, setTabsHeaderSx] = useState<any>()
  useEffect(() => {
    return scrollYProgress.onChange((progress) => {
      setTabsHeaderSx(
        progress <= 0 ? { position: 'sticky', top: -1 } : undefined
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    scrollRef,
    anchorRef,
    tabsHeaderSx
  }
}
