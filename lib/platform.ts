export enum Platform {
  CHROME = 'Chrome',
  FIREFOX = 'Firefox',
  BRAVE = 'Brave',
  EDGE = 'Edge',
  OPERA = 'Opera'
}

export function getPlatform(): Platform {
  const { navigator } = window
  const { userAgent } = navigator

  if (userAgent.includes('Firefox')) {
    return Platform.FIREFOX
  } else if ('brave' in navigator) {
    return Platform.BRAVE
  } else if (userAgent.includes('Edg/')) {
    return Platform.EDGE
  } else if (userAgent.includes('OPR')) {
    return Platform.OPERA
  }
  return Platform.CHROME
}
