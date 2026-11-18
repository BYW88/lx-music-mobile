import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { getAppRxBytes } from '@/utils/nativeModules/utils'


export const setIsPlay = (val: boolean) => {
  if (playerState.isPlay == val) return
  playerActions.setIsPlay(val)
}


const updateStatusText = (val: string) => {
  if (playerState.statusText == val) return
  playerActions.setStatusText(val)
}


// 加载/缓冲时在状态文字后面显示当前下载速度
const SPEED_INTERVAL = 1000
let speedTimer: ReturnType<typeof setInterval> | null = null
let speedBaseText = ''
let prevRxBytes = -1
let prevTime = 0

const formatSpeed = (bytesPerSecond: number) => {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
  return `${Math.round(bytesPerSecond / 1024)} KB/s`
}

const stopSpeedMonitor = () => {
  if (!speedTimer) return
  clearInterval(speedTimer)
  speedTimer = null
  speedBaseText = ''
}

const startSpeedMonitor = (baseText: string) => {
  if (speedTimer && speedBaseText == baseText) return
  stopSpeedMonitor()
  prevRxBytes = getAppRxBytes()
  if (prevRxBytes < 0) return
  prevTime = Date.now()
  speedBaseText = baseText
  speedTimer = setInterval(() => {
    const bytes = getAppRxBytes()
    const now = Date.now()
    if (bytes < 0) {
      stopSpeedMonitor()
      return
    }
    const duration = (now - prevTime) / 1000
    if (duration <= 0) return
    const speed = Math.max(0, bytes - prevRxBytes) / duration
    prevRxBytes = bytes
    prevTime = now
    updateStatusText(`${speedBaseText} ${formatSpeed(speed)}`)
  }, SPEED_INTERVAL)
}

const isSpeedStatus = (val: string) => {
  return val == global.i18n.t('player__buffering') || val == global.i18n.t('player__loading')
}


export const setStatusText = (val: string) => {
  if (isSpeedStatus(val)) {
    if (speedTimer && speedBaseText == val) return
    startSpeedMonitor(val)
  } else stopSpeedMonitor()
  updateStatusText(val)
}

/**
 * 停止刷新下载速度，状态文字恢复为不带速度的原文字
 */
export const stopStatusTextSpeed = () => {
  if (!speedTimer) return
  const baseText = speedBaseText
  stopSpeedMonitor()
  updateStatusText(baseText)
}
