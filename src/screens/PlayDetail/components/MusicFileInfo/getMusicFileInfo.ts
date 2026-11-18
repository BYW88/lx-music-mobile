import RNFS from 'react-native-fs'
import { getCurrentPlayUrl, getCacheInfo, type PlayerCacheInfo } from '@/plugins/player'
import { getDownloadedFilePath, getExt } from '@/core/download'
import downloadState from '@/store/download/state'
import { getMusicUrl as getStoreMusicUrl } from '@/utils/data'
import { readMetadata } from '@/utils/localMediaMetadata'

export type PlayType = 'local' | 'downloaded' | 'online' | 'none'

export interface MusicFileInfo {
  name: string
  singer: string
  albumName: string
  interval: string | null
  source: LX.Source
  /** 实际播放的换源歌曲 */
  toggleSource: LX.OnlineSource | null
  playType: PlayType
  url: string | null
  filePath: string | null
  quality: LX.Quality | null
  ext: string | null
  bitrate: string | null
  /** 文件大小（字节），未知为 null */
  sizeBytes: number | null
  /** 歌曲信息里给出的大小（例如 3.56M），在线播放且不知道准确大小时使用 */
  sizeText: string | null
  cache: PlayerCacheInfo | null
}

const QUALITYS: LX.Quality[] = ['flac24bit', 'flac', 'wav', 'ape', '320k', '192k', '128k']

const isFilePath = (url: string) => url.startsWith('/') || url.startsWith('file://')
const toFilePath = (url: string) => url.startsWith('file://') ? decodeURI(url.replace(/^file:\/\//, '')) : url

const findQualityByUrl = async(musicInfo: LX.Music.MusicInfoOnline, url: string) => {
  for (const quality of QUALITYS) {
    if (await getStoreMusicUrl(musicInfo, quality).catch(() => '') == url) return quality
  }
  return null
}

const formatBitrate = (bitrate: string | number | null | undefined) => {
  if (bitrate == null || bitrate === '') return null
  const num = Number(bitrate)
  if (Number.isNaN(num)) return String(bitrate)
  // 有的格式返回 bps，有的返回 kbps
  return `${Math.round(num > 10000 ? num / 1000 : num)} kbps`
}

export const getMusicFileInfo = async(rawMusicInfo: LX.Player.PlayMusic): Promise<MusicFileInfo> => {
  const musicInfo = 'progress' in rawMusicInfo ? rawMusicInfo.metadata.musicInfo : rawMusicInfo
  const info: MusicFileInfo = {
    name: musicInfo.name,
    singer: musicInfo.singer,
    albumName: musicInfo.meta.albumName ?? '',
    interval: musicInfo.interval,
    source: musicInfo.source,
    toggleSource: null,
    playType: 'none',
    url: null,
    filePath: null,
    quality: null,
    ext: null,
    bitrate: null,
    sizeBytes: null,
    sizeText: null,
    cache: null,
  }

  const url = await getCurrentPlayUrl(rawMusicInfo.id)
  info.url = url

  // 本地文件：本地音乐或已下载的歌曲
  let filePath: string | null = null
  if (url && isFilePath(url)) filePath = toFilePath(url)
  else if (!url) {
    if (musicInfo.source == 'local') filePath = musicInfo.meta.filePath
    else filePath = await getDownloadedFilePath(musicInfo)
  }

  if (musicInfo.source == 'local') {
    info.playType = 'local'
    filePath ??= musicInfo.meta.filePath
    info.ext = musicInfo.meta.ext || null
  } else if (filePath) {
    info.playType = 'downloaded'
    const task = downloadState.list.find(task => task.metadata.filePath == filePath)
    if (task) info.quality = task.metadata.quality
  } else if (url) {
    info.playType = 'online'
  }

  if (filePath) {
    info.filePath = filePath
    const [metadata, stat] = await Promise.all([
      readMetadata(filePath).catch(() => null),
      RNFS.stat(filePath).catch(() => null),
    ])
    if (metadata) {
      info.ext = metadata.ext || info.ext
      info.bitrate = formatBitrate(metadata.bitrate)
      if (metadata.size) info.sizeBytes = metadata.size
    }
    if (stat) info.sizeBytes = Number(stat.size)
    if (!info.ext) info.ext = filePath.split('.').pop()?.toLowerCase() ?? null
    return info
  }

  if (musicInfo.source == 'local' || !url) return info

  // 在线播放：根据链接缓存反查音质
  let quality = await findQualityByUrl(musicInfo, url)
  const toggleMusicInfo = musicInfo.meta.toggleMusicInfo
  if (toggleMusicInfo && (!quality || await findQualityByUrl(toggleMusicInfo, url))) {
    info.toggleSource = toggleMusicInfo.source
    quality ??= await findQualityByUrl(toggleMusicInfo, url)
  }
  info.quality = quality
  if (quality) {
    info.ext = getExt(quality)
    const targetMusicInfo = info.toggleSource && toggleMusicInfo ? toggleMusicInfo : musicInfo
    info.sizeText = targetMusicInfo.meta._qualitys[quality as keyof typeof targetMusicInfo.meta._qualitys]?.size ?? null
  }
  const cache = await getCacheInfo(url)
  info.cache = cache
  if (cache.contentLength > 0) info.sizeBytes = cache.contentLength
  return info
}
