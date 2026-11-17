import { useEffect, useState } from 'react'
import state from './state'
import { event } from './event'

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
