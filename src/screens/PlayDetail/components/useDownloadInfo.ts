import { useEffect, useState } from 'react'
import RNFS from 'react-native-fs'
import { usePlayMusicInfo } from '@/store/player/hook'
import downloadState from '@/store/download/state'
import { event as downloadEvent } from '@/store/download/event'
import { DOWNLOAD_STATUS } from '@/core/download'

export type DownloadInfoStatus = 'none' | 'local' | 'downloading' | 'paused' | 'completed'

export interface DownloadInfo {
  status: DownloadInfoStatus
  musicInfo: LX.Music.MusicInfo | null
  listId: string | null
  /** 当前歌曲对应的下载任务（同一首歌有多个音质时取状态最靠前的那个） */
  task: LX.Download.ListItem | null
}

const statusOrder: DownloadInfoStatus[] = ['completed', 'downloading', 'paused', 'none']

const getTaskStatus = (task: LX.Download.ListItem): DownloadInfoStatus => {
  switch (task.status) {
    case DOWNLOAD_STATUS.COMPLETED: return 'completed'
    case DOWNLOAD_STATUS.RUN:
    case DOWNLOAD_STATUS.WAITING: return 'downloading'
    default: return 'paused'
  }
}

const findTask = async(musicInfo: LX.Music.MusicInfo) => {
  let result: { status: DownloadInfoStatus, task: LX.Download.ListItem | null } = { status: 'none', task: null }
  for (const task of downloadState.list) {
    if (task.metadata.musicInfo.id != musicInfo.id) continue
    let status = getTaskStatus(task)
    // 已完成的任务要确认文件还在，文件被删了就当作没下载
    if (status == 'completed' && !(task.metadata.filePath && await RNFS.exists(task.metadata.filePath).catch(() => false))) status = 'none'
    if (statusOrder.indexOf(status) < statusOrder.indexOf(result.status)) result = { status, task }
    if (status == 'completed') break
  }
  return result
}

/**
 * 当前播放歌曲的下载状态，会随切歌和下载任务更新而刷新
 */
export const useDownloadInfo = () => {
  const playMusicInfo = usePlayMusicInfo()
  const [info, setInfo] = useState<DownloadInfo>({ status: 'none', musicInfo: null, listId: null, task: null })

  useEffect(() => {
    const rawInfo = playMusicInfo.musicInfo
    const musicInfo = rawInfo ? ('progress' in rawInfo ? rawInfo.metadata.musicInfo : rawInfo) : null
    const listId = playMusicInfo.listId
    let isUnmounted = false
    let checkId = 0

    const update = () => {
      if (!musicInfo) {
        setInfo({ status: 'none', musicInfo: null, listId: null, task: null })
        return
      }
      if (musicInfo.source == 'local') {
        setInfo({ status: 'local', musicInfo, listId, task: null })
        return
      }
      const id = ++checkId
      void findTask(musicInfo).then(({ status, task }) => {
        if (isUnmounted || id != checkId) return
        setInfo(prev => {
          if (prev.musicInfo == musicInfo && prev.status == status && prev.task?.id == task?.id) return prev
          return { status, musicInfo, listId, task }
        })
      })
    }
    const handleTaskUpdated = (tasks: LX.Download.ListItem[]) => {
      if (!musicInfo || !tasks.some(task => task.metadata.musicInfo.id == musicInfo.id)) return
      update()
    }

    update()
    downloadEvent.on('listChanged', update)
    downloadEvent.on('taskUpdated', handleTaskUpdated)
    return () => {
      isUnmounted = true
      downloadEvent.off('listChanged', update)
      downloadEvent.off('taskUpdated', handleTaskUpdated)
    }
  }, [playMusicInfo])

  return info
}
