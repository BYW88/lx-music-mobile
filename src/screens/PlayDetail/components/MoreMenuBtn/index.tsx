import { memo, useRef, useState, type ComponentType } from 'react'
import { View } from 'react-native'
import Menu, { type MenuType } from '@/components/common/Menu'
import DownloadQualityModal, { type DownloadQualityModalType } from '@/components/DownloadQualityModal'
import { startDownloadTasks } from '@/core/download'
import playerState from '@/store/player/state'
import { useI18n } from '@/lang'
import { toast } from '@/utils/tools'
import { useDownloadInfo, type DownloadInfo } from '../useDownloadInfo'
import MusicFileInfoModal, { type MusicFileInfoModalType } from '../MusicFileInfo'

const qualityLabelKeys = {
  '128k': 'download_quality_128k',
  '320k': 'download_quality_320k',
  flac: 'download_quality_flac',
  flac24bit: 'download_quality_flac24bit',
} as const

export interface MoreMenuBtnProps {
  Btn: ComponentType<{
    icon: string
    color?: string
    onPress: () => void
    onLongPress?: () => void
  }>
}

type MenuAction = 'download' | 'downloadOther' | 'fileInfo'

export default memo(({ Btn }: MoreMenuBtnProps) => {
  const t = useI18n()
  const downloadInfo = useDownloadInfo()
  const btnWrapRef = useRef<View>(null)
  const menuRef = useRef<MenuType>(null)
  const qualityModalRef = useRef<DownloadQualityModalType>(null)
  const fileInfoModalRef = useRef<MusicFileInfoModalType>(null)
  const [menuVisible, setMenuVisible] = useState(false)

  const getQualityLabel = (quality: LX.Quality) => {
    const key = qualityLabelKeys[quality as keyof typeof qualityLabelKeys]
    return key ? t(key) : quality
  }

  const getDownloadLabel = (info: DownloadInfo) => {
    switch (info.status) {
      case 'local': return t('play_detail_download_local')
      case 'completed': return t('play_detail_download_completed', { quality: getQualityLabel(info.task!.metadata.quality) })
      case 'downloading': return t('play_detail_download_running', { progress: Math.floor(info.task!.progress) })
      case 'paused': return t('play_detail_download_resume')
      default: return t('download')
    }
  }

  const menus: Array<{ action: MenuAction, label: string, disabled?: boolean }> = [
    {
      action: 'download',
      label: getDownloadLabel(downloadInfo),
      disabled: !downloadInfo.musicInfo || downloadInfo.status == 'local' || downloadInfo.status == 'completed' || downloadInfo.status == 'downloading',
    },
  ]
  if (downloadInfo.status == 'completed') menus.push({ action: 'downloadOther', label: t('play_detail_download_other') })
  menus.push({ action: 'fileInfo', label: t('music_file_info_title'), disabled: !downloadInfo.musicInfo })

  const showQualityModal = () => {
    if (!downloadInfo.musicInfo) return
    qualityModalRef.current?.show({ list: [downloadInfo.musicInfo], listId: downloadInfo.listId ?? undefined })
  }

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    switch (action) {
      case 'download':
        if (downloadInfo.status == 'paused') {
          startDownloadTasks([downloadInfo.task!.id])
          toast(t('play_detail_download_resumed'))
        } else showQualityModal()
        break
      case 'downloadOther':
        showQualityModal()
        break
      case 'fileInfo': {
        const musicInfo = playerState.playMusicInfo.musicInfo
        if (musicInfo) fileInfoModalRef.current?.show(musicInfo)
        break
      }
    }
  }

  const showMenu = () => {
    btnWrapRef.current?.measure((fx, fy, width, height, px, py) => {
      const position = { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) }
      if (menuVisible) menuRef.current?.show(position)
      else {
        setMenuVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    })
  }

  return (
    <>
      <View ref={btnWrapRef} collapsable={false}>
        <Btn icon="dots-vertical" onPress={showMenu} />
      </View>
      {menuVisible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} width={200} /> : null}
      <DownloadQualityModal ref={qualityModalRef} />
      <MusicFileInfoModal ref={fileInfoModalRef} />
    </>
  )
})
