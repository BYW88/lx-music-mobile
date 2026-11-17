// if (targetSong.key) { // 如果是已下载的歌曲
//   const filePath = path.join(appSetting['download.savePath'], targetSong.metadata.fileName)
//   // console.log(filePath)

import {
  getMusicUrl as getOnlineMusicUrl,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import {
  getMusicUrl as getDownloadMusicUrl,
  getPicUrl as getDownloadPicUrl,
  getLyricInfo as getDownloadLyricInfo,
} from './download'
import {
  getMusicUrl as getLocalMusicUrl,
  getPicUrl as getLocalPicUrl,
  getLyricInfo as getLocalLyricInfo,
} from './local'
import { buildLyricInfo } from './utils'
import { getDownloadedFilePath } from '@/core/download'
import { readLyric, readPic } from '@/utils/localMediaMetadata'


export const getMusicUrl = async({
  musicInfo,
  quality,
  isRefresh = false,
  onToggleSource,
  allowToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  isRefresh?: boolean
  quality?: LX.Quality
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}): Promise<string> => {
  if ('progress' in musicInfo) {
    return getDownloadMusicUrl({ musicInfo, isRefresh, onToggleSource, allowToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalMusicUrl({ musicInfo, isRefresh, onToggleSource, allowToggleSource })
  } else {
    // 已下载的歌曲优先播放本地文件
    const filePath = await getDownloadedFilePath(musicInfo)
    if (filePath) return filePath
    return getOnlineMusicUrl({ musicInfo, isRefresh, quality, onToggleSource, allowToggleSource })
  }
}

export const getPicPath = async({
  musicInfo,
  isRefresh = false,
  listId,
  onToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  listId?: string | null
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if ('progress' in musicInfo) {
    return getDownloadPicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalPicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  } else {
    // 已下载的歌曲优先读取文件内嵌封面，离线时也能显示
    const filePath = await getDownloadedFilePath(musicInfo)
    if (filePath) {
      let pic = await readPic(filePath).catch(() => null)
      if (pic) {
        if (pic.startsWith('/')) pic = `file://${pic}`
        return pic
      }
    }
    return getOnlinePicUrl({ musicInfo, isRefresh, listId, onToggleSource })
  }
}

export const getLyricInfo = async({
  musicInfo,
  isRefresh = false,
  onToggleSource,
}: {
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  isRefresh?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if ('progress' in musicInfo) {
    return getDownloadLyricInfo({ musicInfo, isRefresh, onToggleSource })
  } else if (musicInfo.source == 'local') {
    return getLocalLyricInfo({ musicInfo, isRefresh, onToggleSource })
  } else {
    try {
      return await getOnlineLyricInfo({ musicInfo, isRefresh, onToggleSource })
    } catch (err) {
      // 获取失败（如离线）时读取已下载文件内嵌的歌词
      const filePath = await getDownloadedFilePath(musicInfo)
      if (filePath) {
        const lyric = await readLyric(filePath).catch(() => '')
        if (lyric) return buildLyricInfo({ lyric })
      }
      throw err
    }
  }
}
