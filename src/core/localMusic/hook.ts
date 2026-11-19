import { useEffect, useState } from 'react'
import { event, state, type LocalMusicItem } from './index'

export const useLocalMusicList = () => {
  const [list, setList] = useState<LocalMusicItem[]>(state.list)
  useEffect(() => {
    const handleChange = () => { setList(state.list) }
    handleChange()
    event.on('listChanged', handleChange)
    return () => {
      event.off('listChanged', handleChange)
    }
  }, [])
  return list
}

export const useLocalMusicScanning = () => {
  const [isScanning, setIsScanning] = useState(state.isScanning)
  useEffect(() => {
    setIsScanning(state.isScanning)
    event.on('scanningChanged', setIsScanning)
    return () => {
      event.off('scanningChanged', setIsScanning)
    }
  }, [])
  return isScanning
}
