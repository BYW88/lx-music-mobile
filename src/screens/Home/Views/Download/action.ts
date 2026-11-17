import { LIST_IDS } from '@/config/constant'
import { DOWNLOAD_STATUS } from '@/core/download'
import { setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import downloadState from '@/store/download/state'

/**
 * 播放已下载的歌曲：把所有已下载完成的歌曲作为播放队列，从这首开始播放，播放时会自动使用本地文件
 */
export const playDownloadedMusic = async(item: LX.Download.ListItem) => {
  const list = downloadState.list.filter(i => i.status == DOWNLOAD_STATUS.COMPLETED).map(i => i.metadata.musicInfo)
  const index = list.findIndex(m => m.id == item.metadata.musicInfo.id)
  if (index < 0) return
  await setTempList('download__completed', list, global.i18n.t('play_queue_downloaded'))
  await playList(LIST_IDS.TEMP, index)
}
