import { LIST_IDS } from '@/config/constant'
import { setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { addTempPlayList } from '@/core/player/tempPlayList'
import { removeDownloadTasks } from '@/core/download'
import { removeLocalMusicFiles, type LocalMusicItem } from '@/core/localMusic'
import downloadState from '@/store/download/state'
import { confirmDialog, toast } from '@/utils/tools'

export type SortType = 'recent' | 'name' | 'singer'

export const filterList = (list: LocalMusicItem[], keyword: string) => {
  const text = keyword.trim().toLowerCase()
  if (!text) return list
  return list.filter(({ musicInfo }) => musicInfo.name.toLowerCase().includes(text) ||
    musicInfo.singer.toLowerCase().includes(text) ||
    musicInfo.meta.albumName.toLowerCase().includes(text))
}

export const sortList = (list: LocalMusicItem[], type: SortType) => {
  const newList = [...list]
  switch (type) {
    case 'recent':
      return newList.sort((a, b) => b.mtime - a.mtime)
    case 'name':
      return newList.sort((a, b) => a.musicInfo.name.localeCompare(b.musicInfo.name, 'zh-CN'))
    case 'singer':
      return newList.sort((a, b) => a.musicInfo.singer.localeCompare(b.musicInfo.singer, 'zh-CN') || a.musicInfo.name.localeCompare(b.musicInfo.name, 'zh-CN'))
  }
}

/**
 * 把当前显示的本地音乐作为播放队列，从第 index 首开始播放
 */
export const playLocalMusic = async(list: LocalMusicItem[], index: number) => {
  if (!list.length) return
  await setTempList('local_music__all', list.map(i => i.musicInfo), global.i18n.t('local_music_play_queue'))
  await playList(LIST_IDS.TEMP, index)
}

export const playLocalMusicLater = (list: LocalMusicItem[]) => {
  addTempPlayList(list.map(i => ({ listId: null, musicInfo: i.musicInfo })))
}

/**
 * 删除文件（先确认），同时清掉指向这些文件的下载任务
 */
export const removeLocalMusic = async(list: LocalMusicItem[]) => {
  const confirm = await confirmDialog({
    message: list.length == 1
      ? global.i18n.t('local_music_remove_file_tip', { name: list[0].musicInfo.name })
      : global.i18n.t('local_music_remove_file_multi_tip', { num: list.length }),
    confirmButtonText: global.i18n.t('local_music_remove_file'),
  })
  if (!confirm) return false
  const paths = await removeLocalMusicFiles(list)
  const taskIds = downloadState.list.filter(task => paths.has(task.metadata.filePath)).map(task => task.id)
  if (taskIds.length) await removeDownloadTasks(taskIds)
  toast(global.i18n.t('local_music_remove_file_done', { num: paths.size }))
  return true
}
