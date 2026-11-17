import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { getTempPlayList, saveTempPlayList } from '@/utils/data'
import { log } from '@/utils/log'

/**
 * 恢复上次的“稍后播放”列表，并在列表变化时保存，避免 App 重启后丢失
 */
export default async() => {
  try {
    const list = await getTempPlayList()
    const validList = list.filter(item => item?.musicInfo)
    if (validList.length) {
      playerActions.addTempPlayList(validList.map(({ listId, musicInfo }) => ({ listId, musicInfo })))
    }
  } catch (err) {
    log.warn('restore temp play list failed', (err as Error).message)
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  global.state_event.on('playTempPlayListChanged', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void saveTempPlayList([...playerState.tempPlayList])
    }, 500)
  })
}
