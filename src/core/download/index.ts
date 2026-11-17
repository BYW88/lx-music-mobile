/**
 * 下载核心：任务创建、队列调度、暂停/继续、失败重试、链接过期刷新与持久化
 * 参考 lx-music-desktop 的 src/renderer/store/download/action.ts 与 worker/download
 */
import RNFS, { type DownloadResult } from 'react-native-fs'
import downloadState from '@/store/download/state'
import { event as downloadEvent } from '@/store/download/event'
import settingState from '@/store/setting/state'
import { getMusicUrl } from '@/core/music/online'
import { getPlayQuality } from '@/core/music/utils'
import { getDownloadList, saveDownloadList } from '@/utils/data'
import { filterFileName, throttle } from '@/utils/common'
import { externalStorageDirectoryPath, downloadFile, stopDownload } from '@/utils/fs'
import { formatMusicName, requestStoragePermission, toast } from '@/utils/tools'
import { log } from '@/utils/log'

export const DOWNLOAD_STATUS = {
  RUN: 'run',
  WAITING: 'waiting',
  PAUSE: 'pause',
  ERROR: 'error',
  COMPLETED: 'completed',
} as const

const TEMP_FILE_EXT = '.lxdownload'
const MAX_RETRY_NUM = 2

interface RunningTask {
  jobId: number | null
  // 用于在暂停/删除后忽略旧回调
  isCancelled: boolean
}

const runningTasks = new Map<string, RunningTask>()
const retryNums = new Map<string, number>()

const t: typeof global.i18n.t = (key, data) => global.i18n.t(key, data)

export const getDefaultSavePath = () => `${externalStorageDirectoryPath}/Music/lx-music`
export const getSavePath = () => settingState.setting['download.savePath'] || getDefaultSavePath()

const joinPath = (dir: string, name: string) => `${dir.replace(/\/+$/, '')}/${name}`

const saveListThrottle = throttle(() => {
  void saveDownloadList(downloadState.list)
}, 1000)

const pendingUpdateTasks = new Map<string, LX.Download.ListItem>()
let updateTimer: ReturnType<typeof setTimeout> | null = null
const emitTaskUpdate = (task: LX.Download.ListItem) => {
  pendingUpdateTasks.set(task.id, task)
  saveListThrottle()
  if (updateTimer) return
  updateTimer = setTimeout(() => {
    updateTimer = null
    const tasks = Array.from(pendingUpdateTasks.values())
    pendingUpdateTasks.clear()
    downloadEvent.taskUpdated(tasks)
  }, 200)
}

const formatSpeed = (bytesPerSecond: number) => {
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`
}

export const getExt = (quality: LX.Quality): LX.Download.FileExt => {
  switch (quality) {
    case 'ape':
      return 'ape'
    case 'flac':
    case 'flac24bit':
      return 'flac'
    case 'wav':
      return 'wav'
    default:
      return 'mp3'
  }
}

const getStatusText = (status: LX.Download.DownloadTaskStatus) => {
  switch (status) {
    case DOWNLOAD_STATUS.RUN: return t('download_status_running')
    case DOWNLOAD_STATUS.WAITING: return t('download_status_waiting')
    case DOWNLOAD_STATUS.PAUSE: return t('download_status_paused')
    case DOWNLOAD_STATUS.ERROR: return t('download_status_error')
    case DOWNLOAD_STATUS.COMPLETED: return t('download_status_completed')
    default: return ''
  }
}

const setStatus = (task: LX.Download.ListItem, status: LX.Download.DownloadTaskStatus, statusText?: string) => {
  task.status = status
  task.statusText = statusText ?? getStatusText(status)
  if (status == DOWNLOAD_STATUS.COMPLETED) {
    task.isComplate = true
    task.progress = 100
    task.speed = ''
  } else if (status != DOWNLOAD_STATUS.RUN) {
    task.speed = ''
  }
  emitTaskUpdate(task)
}

const setStatusText = (task: LX.Download.ListItem, statusText: string) => {
  task.statusText = statusText
  emitTaskUpdate(task)
}

const createDownloadInfo = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality, listId?: string): LX.Download.ListItem => {
  const ext = getExt(quality)
  const fileName = filterFileName(`${formatMusicName(settingState.setting['download.fileName'], musicInfo.name, musicInfo.singer)}.${ext}`)
  return {
    id: `${musicInfo.id}_${quality}_${ext}`,
    isComplate: false,
    status: DOWNLOAD_STATUS.WAITING,
    statusText: getStatusText(DOWNLOAD_STATUS.WAITING),
    downloaded: 0,
    total: 0,
    progress: 0,
    speed: '',
    metadata: {
      musicInfo,
      url: null,
      quality,
      ext,
      fileName,
      filePath: '',
      listId,
    },
  }
}

const fetchUrl = async(task: LX.Download.ListItem, isRefresh: boolean) => {
  return getMusicUrl({
    musicInfo: task.metadata.musicInfo,
    quality: task.metadata.quality,
    isRefresh,
    allowToggleSource: settingState.setting['download.isUseOtherSource'],
  })
}

const handleError = (task: LX.Download.ListItem, message: string) => {
  log.warn('download error', task.metadata.musicInfo.name, message)
  runningTasks.delete(task.id)
  retryNums.delete(task.id)
  setStatus(task, DOWNLOAD_STATUS.ERROR, `${t('download_status_error')}: ${message}`)
  checkStartTask()
}

const handleComplete = async(task: LX.Download.ListItem, tempPath: string) => {
  try {
    if (await RNFS.exists(task.metadata.filePath)) await RNFS.unlink(task.metadata.filePath)
    await RNFS.moveFile(tempPath, task.metadata.filePath)
  } catch (err) {
    handleError(task, (err as Error).message)
    return
  }
  runningTasks.delete(task.id)
  retryNums.delete(task.id)
  setStatus(task, DOWNLOAD_STATUS.COMPLETED)
  // 让媒体库能扫描到新文件
  RNFS.scanFile(task.metadata.filePath).catch(() => {})
  checkStartTask()
}

const runTask = async(task: LX.Download.ListItem) => {
  const runInfo: RunningTask = { jobId: null, isCancelled: false }
  runningTasks.set(task.id, runInfo)
  setStatus(task, DOWNLOAD_STATUS.RUN)

  const savePath = getSavePath()
  task.metadata.filePath = joinPath(savePath, task.metadata.fileName)

  try {
    if (!await RNFS.exists(savePath)) await RNFS.mkdir(savePath)
  } catch (err) {
    handleError(task, t('download_status_error_check_path'))
    return
  }
  if (runInfo.isCancelled) return

  if (settingState.setting['download.skipExistFile'] && await RNFS.exists(task.metadata.filePath).catch(() => false)) {
    const stat = await RNFS.stat(task.metadata.filePath).catch(() => null)
    if (stat && Number(stat.size) > 100) {
      runningTasks.delete(task.id)
      setStatus(task, DOWNLOAD_STATUS.COMPLETED, t('download_status_exist'))
      checkStartTask()
      return
    }
  }

  const isRefresh = (retryNums.get(task.id) ?? 0) > 0
  if (!task.metadata.url || isRefresh) {
    setStatusText(task, isRefresh ? t('download_status_url_refreshing') : t('download_status_url_getting'))
    try {
      task.metadata.url = await fetchUrl(task, isRefresh)
    } catch (err) {
      if (runInfo.isCancelled) return
      handleError(task, t('download_status_error_url_failed'))
      return
    }
    if (runInfo.isCancelled) return
    emitTaskUpdate(task)
  }

  const tempPath = task.metadata.filePath + TEMP_FILE_EXT
  let lastTime = Date.now()
  let lastBytes = 0
  setStatusText(task, t('download_status_start'))
  const { jobId, promise } = downloadFile(task.metadata.url, tempPath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin() {},
    progress(res) {
      if (runInfo.isCancelled) return
      const now = Date.now()
      const duration = (now - lastTime) / 1000
      if (duration > 0) task.speed = formatSpeed((res.bytesWritten - lastBytes) / duration)
      lastTime = now
      lastBytes = res.bytesWritten
      task.downloaded = res.bytesWritten
      task.total = res.contentLength
      task.progress = res.contentLength > 0 ? Math.min(99.99, res.bytesWritten / res.contentLength * 100) : 0
      task.statusText = getStatusText(DOWNLOAD_STATUS.RUN)
      emitTaskUpdate(task)
    },
  })
  runInfo.jobId = jobId

  let result: DownloadResult
  try {
    result = await promise
  } catch (err) {
    if (runInfo.isCancelled) return
    await RNFS.unlink(tempPath).catch(() => {})
    handleRetry(task, (err as Error).message)
    return
  }
  if (runInfo.isCancelled) return

  if (result.statusCode >= 200 && result.statusCode < 300 && result.bytesWritten > 100) {
    await handleComplete(task, tempPath)
  } else {
    await RNFS.unlink(tempPath).catch(() => {})
    handleRetry(task, `HTTP ${result.statusCode}`)
  }
}

/**
 * 下载失败时刷新链接重试（链接可能已过期）
 */
const handleRetry = (task: LX.Download.ListItem, message: string) => {
  const num = (retryNums.get(task.id) ?? 0) + 1
  if (num > MAX_RETRY_NUM) {
    handleError(task, message)
    return
  }
  retryNums.set(task.id, num)
  log.info('download retry', task.metadata.musicInfo.name, num, message)
  void runTask(task)
}

const checkStartTask = () => {
  const maxNum = Math.max(1, settingState.setting['download.maxDownloadNum'])
  for (const task of downloadState.list) {
    if (runningTasks.size >= maxNum) break
    if (task.status != DOWNLOAD_STATUS.WAITING || runningTasks.has(task.id)) continue
    void runTask(task)
  }
}

const cancelRunningTask = (id: string) => {
  const runInfo = runningTasks.get(id)
  if (!runInfo) return
  runInfo.isCancelled = true
  if (runInfo.jobId != null) stopDownload(runInfo.jobId)
  runningTasks.delete(id)
  retryNums.delete(id)
}


/**
 * 初始化下载列表（应用启动时调用），未完成的任务恢复为暂停状态
 */
export const initDownloadList = async() => {
  const list = await getDownloadList()
  for (const task of list) {
    if (task.status == DOWNLOAD_STATUS.RUN || task.status == DOWNLOAD_STATUS.WAITING) {
      task.status = DOWNLOAD_STATUS.PAUSE
      task.speed = ''
      task.statusText = getStatusText(DOWNLOAD_STATUS.PAUSE)
    }
  }
  downloadState.list = list
  downloadEvent.listChanged()
}

/**
 * 创建下载任务
 * @param list 要下载的歌曲
 * @param quality 下载音质，不传则使用播放音质设置
 */
export const createDownloadTasks = async(list: LX.Music.MusicInfo[], quality?: LX.Quality, listId?: string) => {
  const onlineList = list.filter(m => m.source != 'local')
  if (!onlineList.length) {
    if (list.length) toast(t('download_tip_local_music'))
    return 0
  }
  if (!await requestStoragePermission()) {
    toast(t('download_tip_no_permission'))
    return 0
  }

  const ids = new Set(downloadState.list.map(task => task.id))
  const tasks: LX.Download.ListItem[] = []
  for (const musicInfo of onlineList) {
    const task = createDownloadInfo(musicInfo, quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo), listId)
    if (ids.has(task.id)) continue
    ids.add(task.id)
    tasks.push(task)
  }
  if (tasks.length) {
    if (settingState.setting['list.addMusicLocationType'] == 'top') downloadState.list = [...tasks, ...downloadState.list]
    else downloadState.list = [...downloadState.list, ...tasks]
    await saveDownloadList(downloadState.list)
    downloadEvent.listChanged()
    checkStartTask()
  }
  toast(tasks.length ? t('download_tip_added', { num: tasks.length }) : t('download_tip_exists'))
  return tasks.length
}

/**
 * 开始（继续）下载任务
 */
export const startDownloadTasks = (ids: string[]) => {
  const idSet = new Set(ids)
  for (const task of downloadState.list) {
    if (!idSet.has(task.id)) continue
    if (task.status == DOWNLOAD_STATUS.PAUSE || task.status == DOWNLOAD_STATUS.ERROR) {
      retryNums.delete(task.id)
      // 重新开始时重新获取链接，避免使用已过期的链接
      task.metadata.url = null
      setStatus(task, DOWNLOAD_STATUS.WAITING)
    }
  }
  checkStartTask()
}

/**
 * 暂停下载任务（安卓端不支持断点续传，继续时会重新下载）
 */
export const pauseDownloadTasks = (ids: string[]) => {
  const idSet = new Set(ids)
  for (const task of downloadState.list) {
    if (!idSet.has(task.id)) continue
    if (task.status == DOWNLOAD_STATUS.RUN || task.status == DOWNLOAD_STATUS.WAITING) {
      cancelRunningTask(task.id)
      task.progress = 0
      task.downloaded = 0
      setStatus(task, DOWNLOAD_STATUS.PAUSE)
    }
  }
  checkStartTask()
}

/**
 * 删除下载任务
 * @param ids 任务id
 * @param isRemoveFile 是否同时删除已下载的文件
 */
export const removeDownloadTasks = async(ids: string[], isRemoveFile = false) => {
  const idSet = new Set(ids)
  const removed: LX.Download.ListItem[] = []
  downloadState.list = downloadState.list.filter(task => {
    if (!idSet.has(task.id)) return true
    removed.push(task)
    return false
  })
  for (const task of removed) {
    cancelRunningTask(task.id)
    if (task.metadata.filePath) {
      void RNFS.unlink(task.metadata.filePath + TEMP_FILE_EXT).catch(() => {})
      if (isRemoveFile) void RNFS.unlink(task.metadata.filePath).catch(() => {})
    }
  }
  await saveDownloadList(downloadState.list)
  downloadEvent.listChanged()
  checkStartTask()
}

/**
 * 查找歌曲已下载完成的本地文件路径
 */
export const getDownloadedFilePath = async(musicInfo: LX.Music.MusicInfo): Promise<string | null> => {
  for (const task of downloadState.list) {
    if (!task.isComplate || task.metadata.musicInfo.id != musicInfo.id || !task.metadata.filePath) continue
    if (await RNFS.exists(task.metadata.filePath).catch(() => false)) return task.metadata.filePath
  }
  return null
}
