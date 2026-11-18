import { useEffect, useState } from 'react'
import playerState from '@/store/player/state'
import { getMusicFileInfo } from '../MusicFileInfo/getMusicFileInfo'

export interface PlayQuality {
  /** 格式，例如 FLAC、MP3 */
  format: string
  /** 比特率（kbps），算不出来时为 null */
  bitrate: number | null
}

const QUALITY_BITRATE: Partial<Record<LX.Quality, number>> = {
  '128k': 128,
  '192k': 192,
  '320k': 320,
}

const parseBitrate = (bitrate: string | null) => {
  if (!bitrate) return null
  const num = parseInt(bitrate)
  return Number.isNaN(num) || num <= 0 ? null : num
}

/** 解析 “3.56M”、“23.5MB”、“980K” 之类的大小，返回字节数 */
const parseSizeText = (size: string | null) => {
  if (!size) return null
  const match = /^([\d.]+)\s*([KMG]?)B?$/i.exec(size.trim())
  if (!match) return null
  const num = parseFloat(match[1])
  if (Number.isNaN(num)) return null
  const unit = match[2].toUpperCase()
  return num * (unit == 'G' ? 1024 ** 3 : unit == 'M' ? 1024 ** 2 : unit == 'K' ? 1024 : 1)
}

/** 解析 “04:30”、“1:02:03” 格式的时长，返回秒数 */
const parseInterval = (interval: string | null) => {
  if (!interval) return null
  const seconds = interval.split(':').reduce((total, part) => total * 60 + Number(part), 0)
  return Number.isNaN(seconds) || seconds <= 0 ? null : seconds
}

const getPlayQuality = async(musicInfo: LX.Player.PlayMusic): Promise<PlayQuality | null> => {
  const info = await getMusicFileInfo(musicInfo)
  if (!info.ext) return null

  let bitrate = parseBitrate(info.bitrate)
  if (bitrate == null && info.quality) bitrate = QUALITY_BITRATE[info.quality] ?? null
  if (bitrate == null) {
    // 无损等可变码率：按 文件大小 ÷ 时长 估算
    const size = info.sizeBytes ?? parseSizeText(info.sizeText)
    const duration = parseInterval(info.interval) ?? (playerState.progress.maxPlayTime || null)
    if (size && duration) bitrate = Math.round(size * 8 / duration / 1000)
  }
  return { format: info.ext.toUpperCase(), bitrate }
}

/**
 * 当前播放歌曲的格式和比特率，拿不到时为 null
 */
export const usePlayQuality = () => {
  const [quality, setQuality] = useState<PlayQuality | null>(null)

  useEffect(() => {
    let id = 0
    let currentKey: string | null = null
    let isUnmounted = false

    const update = () => {
      const musicInfo = playerState.playMusicInfo.musicInfo
      const key = musicInfo?.id ?? null
      if (key != currentKey) {
        currentKey = key
        setQuality(null)
      }
      const currentId = ++id
      if (!musicInfo) return
      void getPlayQuality(musicInfo).then(result => {
        if (isUnmounted || currentId != id) return
        // 已经拿到结果时，不要因为一次失败的刷新把徽标清掉
        if (result) setQuality(result)
      }).catch(() => {})
    }

    update()
    global.state_event.on('playMusicInfoChanged', update)
    global.app_event.on('playerPlaying', update)
    global.app_event.on('playerLoadstart', update)
    return () => {
      isUnmounted = true
      global.state_event.off('playMusicInfoChanged', update)
      global.app_event.off('playerPlaying', update)
      global.app_event.off('playerLoadstart', update)
    }
  }, [])

  return quality
}
