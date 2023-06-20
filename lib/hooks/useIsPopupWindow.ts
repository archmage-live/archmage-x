import { atom, useAtom } from 'jotai'
import { useLocation } from 'react-router-dom'

const isPopupWindowAtom = atom<boolean>(false)

export function useIsPopupWindow() {
  const location = useLocation()
  const [isPopupWindow, setIsPopupWindowAtom] = useAtom(isPopupWindowAtom)
  if (isPopupWindow) {
    return true
  }

  if (new URLSearchParams(location.search).get('popup') === 'window') {
    setIsPopupWindowAtom(true)
    return true
  }

  return false
}
