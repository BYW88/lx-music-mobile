/**
 * 本地音乐：直接扫描下载保存位置里的音频文件，不依赖下载任务列表。
 * 清空下载任务后，只要文件还在，这里照样能列出、播放；
 * 在线歌曲也会按“歌名 + 歌手”匹配到这里的文件，从而继续播放本地文件、显示已下载标记。
 */
import { readDir, unlink, existsFile, type FileType } from '@/utils/fs'
import { readMetadata, type MusicMetadataFull } from '@/utils/localMediaMetadata'
import { formatPlayTime2 } from '@/utils/common'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'
import { getSavePath } from '@/core/download/savePath'
import { event as downloadEvent } from '@/store/download/event'
import { log } from '@/utils/log'
import Event from '@/event/Event'

export interface LocalMusicItem {
  musicInfo: LX.Music.MusicInfoLocal
  /** 文件大小（字节） */
  size: number
  /** 文件修改时间 */
  mtime: number
  /** 码率（kbps），未知为 0 */
  bitrate: number
}

interface CacheData {
  dir: string
  list: LocalMusicItem[]
}

class LocalMusicEvent extends Event {
  listChanged() {
    this.emit('listChanged')
  }

  scanningChanged(isScanning: boolean) {
    this.emit('scanningChanged', isScanning)
  }
}
type EventMethods = Omit<EventType, keyof Event>
declare class EventType extends LocalMusicEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
}
export const event: Omit<EventType, keyof Omit<Event, 'on' | 'off'>> = new LocalMusicEvent()

export const state = {
  list: [] as LocalMusicItem[],
  dir: '',
  isScanning: false,
  isInited: false,
}

const AUDIO_EXTS = ['mp3', 'flac', 'ogg', 'wav', 'ape', 'm4a', 'aac', 'wma', 'opus']
const getExt = (name: string) => name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : ''
const isAudioFile = (file: FileType) => {
  if (!file.isFile) return false
  if (file.mimeType?.startsWith('audio/')) return true
  return AUDIO_EXTS.includes(getExt(file.name))
}

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, '')
const normalizeSinger = (singer: string) => normalizeText(singer).replace(/[、/&,，;；]+/g, '、')
/**
 * 用于在线歌曲与本地文件匹配的键：歌名 + 歌手
 */
export const getMatchKey = (name: string, singer: string) => `${normalizeText(name)}\u0000${normalizeSinger(singer)}`

let matchMap = new Map<string, LocalMusicItem>()
const buildMatchMap = () => {
  const map = new Map<string, LocalMusicItem>()
  for (const item of state.list) {
    if (!item.musicInfo.singer) continue
    map.set(getMatchKey(item.musicInfo.name, item.musicInfo.singer), item)
  }
  matchMap = map
}

const setList = (list: LocalMusicItem[]) => {
  state.list = list
  buildMatchMap()
  event.listChanged()
}

const saveCache = async() => {
  await saveData(storageDataPrefix.localMusic, { dir: state.dir, list: state.list } satisfies CacheData)
}

const parseBitrate = (bitrate: string | number | undefined | null) => {
  const num = Number(bitrate)
  if (!num || Number.isNaN(num)) return 0
  return Math.round(num > 10000 ? num / 1000 : num)
}

const buildItem = (file: FileType, metadata: MusicMetadataFull | null): LocalMusicItem => {
  const ext = getExt(file.name)
  const fileName = file.name.lastIndexOf('.') > 0 ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name
  return {
    musicInfo: {
      id: file.path,
      name: metadata?.name ? metadata.name : fileName,
      singer: metadata?.singer ?? '',
      source: 'local',
      interval: metadata?.interval ? formatPlayTime2(metadata.interval) : null,
      meta: {
        albumName: metadata?.albumName ?? '',
        filePath: file.path,
        songId: file.path,
        picUrl: '',
        ext: metadata?.ext ? metadata.ext : ext,
      },
    },
    size: Number(file.size) || Number(metadata?.size) || 0,
    mtime: Number(file.lastModified) || 0,
    bitrate: parseBitrate(metadata?.bitrate),
  }
}

/**
 * 启动时读取缓存，并在后台刷新一次
 */
export const initLocalMusic = async() => {
  if (state.isInited) return
  state.isInited = true
  const cache = await getData<CacheData>(storageDataPrefix.localMusic).catch(() => null)
  if (cache && cache.dir == getSavePath()) {
    state.dir = cache.dir
    setList(cache.list ?? [])
  }
  // 下载完成后自动加入本地音乐
  let timer: ReturnType<typeof setTimeout> | null = null
  downloadEvent.on('taskUpdated', (tasks: LX.Download.ListItem[]) => {
    if (!tasks.some(task => task.isComplate && task.metadata.filePath && !state.list.some(i => i.musicInfo.meta.filePath == task.metadata.filePath))) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void scanLocalMusic()
    }, 2000)
  })
  setTimeout(() => { void scanLocalMusic() }, 3000)
}

let scanPromise: Promise<void> | null = null
let needRescan = false
/**
 * 扫描下载保存位置（只扫这一层，不进子文件夹）。
 * 文件大小和修改时间都没变的直接用缓存，不重新读标签。
 */
export const scanLocalMusic = async(): Promise<void> => {
  if (scanPromise) {
    needRescan = true
    return scanPromise
  }
  scanPromise = (async() => {
    state.isScanning = true
    event.scanningChanged(true)
    try {
      do {
        needRescan = false
        await doScan()
      } while (needRescan)
    } finally {
      state.isScanning = false
      event.scanningChanged(false)
      scanPromise = null
    }
  })()
  return scanPromise
}

const doScan = async() => {
  const dir = getSavePath()
  let files: FileType[]
  try {
    files = (await readDir(dir)).filter(isAudioFile)
  } catch (err: any) {
    // 文件夹不存在或没有权限
    log.warn('Scan local music failed: ' + (err?.message ?? String(err)))
    files = []
  }
  const oldMap = new Map<string, LocalMusicItem>()
  if (dir == state.dir) for (const item of state.list) oldMap.set(item.musicInfo.meta.filePath, item)

  const list: LocalMusicItem[] = []
  const needRead: FileType[] = []
  for (const file of files) {
    const old = oldMap.get(file.path)
    if (old && old.size == Number(file.size) && old.mtime == Number(file.lastModified)) list.push(old)
    else needRead.push(file)
  }
  while (needRead.length) {
    const tasks = needRead.splice(0, 5)
    const items = await Promise.all(tasks.map(async file => {
      const metadata = await readMetadata(file.path).catch(() => null)
      return buildItem(file, metadata)
    }))
    list.push(...items)
  }
  state.dir = dir
  setList(list)
  await saveCache()
}

/**
 * 按“歌名 + 歌手”找到对应的本地文件
 */
export const findLocalMusic = (musicInfo: LX.Music.MusicInfo): LocalMusicItem | null => {
  if (musicInfo.source == 'local' || !musicInfo.singer) return null
  return matchMap.get(getMatchKey(musicInfo.name, musicInfo.singer)) ?? null
}

export const findLocalMusicFilePath = async(musicInfo: LX.Music.MusicInfo): Promise<string | null> => {
  const item = findLocalMusic(musicInfo)
  if (!item) return null
  if (await existsFile(item.musicInfo.meta.filePath).catch(() => false)) return item.musicInfo.meta.filePath
  return null
}

/**
 * 删除本地文件（同时删除同名的 lrc 歌词文件）
 */
export const removeLocalMusicFiles = async(items: LocalMusicItem[]) => {
  const paths = new Set(items.map(i => i.musicInfo.meta.filePath))
  for (const path of paths) {
    await unlink(path).catch(() => {})
    const lrcPath = path.replace(/\.[^./]+$/, '.lrc')
    if (lrcPath != path && await existsFile(lrcPath).catch(() => false)) await unlink(lrcPath).catch(() => {})
  }
  setList(state.list.filter(i => !paths.has(i.musicInfo.meta.filePath)))
  await saveCache()
  return paths
}
