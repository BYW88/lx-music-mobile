import { LIST_IDS } from '@/config/constant'
import { addListMusics } from '@/core/list'
import { playList } from '@/core/player/player'
import settingState from '@/store/setting/state'
import { getListMusicSync } from '@/utils/listManage'

/**
 * 播放已下载的歌曲：加入“试听列表”并播放，播放时会自动使用本地文件
 */
export const playDownloadedMusic = async(item: LX.Download.ListItem) => {
  const musicInfo = item.metadata.musicInfo
  await addListMusics(LIST_IDS.DEFAULT, [musicInfo], settingState.setting['list.addMusicLocationType'])
  const index = getListMusicSync(LIST_IDS.DEFAULT).findIndex(m => m.id == musicInfo.id)
  if (index < 0) return
  await playList(LIST_IDS.DEFAULT, index)
}
