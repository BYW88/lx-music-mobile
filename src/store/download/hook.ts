import { useEffect, useState } from 'react'
import state from './state'
import { event } from './event'


/**
 * 获取下载列表，列表增删或任务更新时刷新
 */
export const useDownloadList = () => {
  const [list, setList] = useState([...state.list])

  useEffect(() => {
    const handleUpdate = () => {
      setList([...state.list])
    }
    event.on('listChanged', handleUpdate)
    event.on('taskUpdated', handleUpdate)
    return () => {
      event.off('listChanged', handleUpdate)
      event.off('taskUpdated', handleUpdate)
    }
  }, [])

  return list
}
