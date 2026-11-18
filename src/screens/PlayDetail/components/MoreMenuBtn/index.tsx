import { memo, useRef, useState, type ComponentType } from 'react'
import { View } from 'react-native'
import Menu, { type MenuType } from '@/components/common/Menu'
import DownloadQualityModal from '@/components/DownloadQualityModal'
import playerState from '@/store/player/state'
import { useI18n } from '@/lang'
import { useDownloadAction } from '../useDownloadAction'
import MusicFileInfoModal, { type MusicFileInfoModalType } from '../MusicFileInfo'

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
  const { downloadInfo, label, disabled, canDownloadOther, download, downloadOther, qualityModalRef } = useDownloadAction()
  const btnWrapRef = useRef<View>(null)
  const menuRef = useRef<MenuType>(null)
  const fileInfoModalRef = useRef<MusicFileInfoModalType>(null)
  const [menuVisible, setMenuVisible] = useState(false)

  const menus: Array<{ action: MenuAction, label: string, disabled?: boolean }> = [
    { action: 'download', label, disabled },
  ]
  if (canDownloadOther) menus.push({ action: 'downloadOther', label: t('play_detail_download_other') })
  menus.push({ action: 'fileInfo', label: t('music_file_info_title'), disabled: !downloadInfo.musicInfo })

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    switch (action) {
      case 'download':
        download()
        break
      case 'downloadOther':
        downloadOther()
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
        <Btn icon="more" onPress={showMenu} />
      </View>
      {menuVisible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} width={200} /> : null}
      <DownloadQualityModal ref={qualityModalRef} />
      <MusicFileInfoModal ref={fileInfoModalRef} />
    </>
  )
})
