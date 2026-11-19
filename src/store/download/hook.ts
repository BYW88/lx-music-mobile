import { useEffect, useState } from 'react'
import state from './state'
import { event } from './event'
import { event as localMusicEvent, findLocalMusic } from '@/core/localMusic'

/**
 * 下载任务在核心中是原地修改的，直接把原对象交给列表组件会让 memo 比较始终相等而不刷新。
 * 这里为每个任务维护一份快照，任务有更新时替换成新的快照对象，列表才能正确重新渲染。
 */
const snapshot = (task: LX.Download.ListItem): LX.Download.ListItem => ({ ...task, metadata: { ...task.metadata } })

/**
 * 获取下载列表，列表增删或任务更新时刷新
 */
export const useDownloadList = () => {
  const [list, setList] = useState(() => state.list.map(snapshot))

  useEffect(() => {
    const snapshots = new Map<string, LX.Download.ListItem>()
    const build = () => state.list.map(task => {
      let item = snapshots.get(task.id)
      if (!item) snapshots.set(task.id, item = snapshot(task))
      return item
    })
    const handleListChanged = () => {
      const ids = new Set(state.list.map(task => task.id))
      for (const id of snapshots.keys()) if (!ids.has(id)) snapshots.delete(id)
      setList(build())
    }
    const handleTaskUpdated = (tasks: LX.Download.ListItem[]) => {
      for (const task of tasks) snapshots.set(task.id, snapshot(task))
      setList(build())
    }
    // 挂载期间可能已有更新，先同步一次
    for (const task of state.list) snapshots.set(task.id, snapshot(task))
    setList(build())
    event.on('listChanged', handleListChanged)
    event.on('taskUpdated', handleTaskUpdated)
    return () => {
      event.off('listChanged', handleListChanged)
      event.off('taskUpdated', handleTaskUpdated)
    }
  }, [])

  return list
}


/**
 * 已下载完成的歌曲 id 集合。所有歌曲行共享一份，只挂一组事件监听，避免每一行都去监听下载事件
 */
let downloadedIds = new Set<string>()
const downloadedListeners = new Set<() => void>()
let isDownloadedListening = false
const buildDownloadedIds = () => {
  const ids = new Set<string>()
  for (const task of state.list) if (task.isComplate) ids.add(task.metadata.musicInfo.id)
  return ids
}
const updateDownloadedIds = () => {
  const ids = buildDownloadedIds()
  if (ids.size == downloadedIds.size && [...ids].every(id => downloadedIds.has(id))) return
  downloadedIds = ids
  for (const listener of downloadedListeners) listener()
}
const handleDownloadTaskUpdated = (tasks: LX.Download.ListItem[]) => {
  // 只有完成状态变化才需要重建
  if (tasks.some(task => task.isComplate != downloadedIds.has(task.metadata.musicInfo.id))) updateDownloadedIds()
}
const startDownloadedListening = () => {
  if (isDownloadedListening) return
  isDownloadedListening = true
  downloadedIds = buildDownloadedIds()
  event.on('listChanged', updateDownloadedIds)
  event.on('taskUpdated', handleDownloadTaskUpdated)
  // 本地音乐变化时，按歌名 + 歌手匹配的结果也可能变化
  localMusicEvent.on('listChanged', () => {
    for (const listener of downloadedListeners) listener()
  })
}

const checkDownloaded = (musicInfo: LX.Music.MusicInfo) => downloadedIds.has(musicInfo.id) || !!findLocalMusic(musicInfo)

/**
 * 歌曲是否已下载完成，用于在歌曲列表中显示“已下载”标记。
 * 下载任务里有，或本地音乐里有同歌名同歌手的文件，都算已下载
 */
export const useIsDownloaded = (musicInfo: LX.Music.MusicInfo) => {
  startDownloadedListening()
  const [isDownloaded, setIsDownloaded] = useState(() => checkDownloaded(musicInfo))

  useEffect(() => {
    const handleChange = () => {
      setIsDownloaded(checkDownloaded(musicInfo))
    }
    handleChange()
    downloadedListeners.add(handleChange)
    return () => {
      downloadedListeners.delete(handleChange)
    }
  }, [musicInfo])

  return isDownloaded
}
