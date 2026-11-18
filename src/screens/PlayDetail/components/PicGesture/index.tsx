import { useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native'
import Menu, { type MenuType } from '@/components/common/Menu'
import DownloadQualityModal from '@/components/DownloadQualityModal'
import { togglePlay } from '@/core/player/player'
import { useI18n } from '@/lang'
import { useDownloadAction } from '../useDownloadAction'
import usePicSwipe from './usePicSwipe'
import PicViewModal, { type PicViewModalType } from './PicViewModal'
import { savePic } from './savePic'

// 两次点击间隔小于该值视为双击
const DOUBLE_PRESS_DELAY = 300

type MenuAction = 'view' | 'save' | 'download' | 'downloadOther'

/**
 * 播放详情页海报手势：
 * - 上滑下一首，下滑上一首
 * - 双击播放/暂停
 * - 长按弹出菜单（查看大图、保存封面、下载）
 */
export default ({ pic, style, children }: {
  pic: string | null | undefined
  style: StyleProp<ViewStyle>
  children: ReactNode
}) => {
  const t = useI18n()
  const { panHandlers, translateY } = usePicSwipe()
  const { downloadInfo, label, disabled, canDownloadOther, download, downloadOther, qualityModalRef } = useDownloadAction()
  const menuRef = useRef<MenuType>(null)
  const picViewModalRef = useRef<PicViewModalType>(null)
  const [menuVisible, setMenuVisible] = useState(false)
  const lastPressTimeRef = useRef(0)

  const handlePress = () => {
    const now = Date.now()
    if (now - lastPressTimeRef.current < DOUBLE_PRESS_DELAY) {
      lastPressTimeRef.current = 0
      togglePlay()
    } else lastPressTimeRef.current = now
  }

  const menus: Array<{ action: MenuAction, label: string, disabled?: boolean }> = [
    { action: 'view', label: t('play_detail_pic_view'), disabled: !pic },
    { action: 'save', label: t('play_detail_pic_save'), disabled: !pic },
    { action: 'download', label, disabled },
  ]
  if (canDownloadOther) menus.push({ action: 'downloadOther', label: t('play_detail_download_other') })

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    switch (action) {
      case 'view':
        if (pic) picViewModalRef.current?.show(pic)
        break
      case 'save':
        if (pic && downloadInfo.musicInfo) void savePic(pic, downloadInfo.musicInfo)
        break
      case 'download':
        download()
        break
      case 'downloadOther':
        downloadOther()
        break
    }
  }

  const handleLongPress = ({ nativeEvent }: GestureResponderEvent) => {
    lastPressTimeRef.current = 0
    const position = { x: Math.ceil(nativeEvent.pageX), y: Math.ceil(nativeEvent.pageY), w: 0, h: 0 }
    if (menuVisible) menuRef.current?.show(position)
    else {
      setMenuVisible(true)
      requestAnimationFrame(() => {
        menuRef.current?.show(position)
      })
    }
  }

  return (
    <>
      <Animated.View style={[style, { transform: [{ translateY }] }]} {...panHandlers}>
        <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={500}>
          {children}
        </Pressable>
      </Animated.View>
      {menuVisible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} width={180} /> : null}
      <PicViewModal ref={picViewModalRef} />
      <DownloadQualityModal ref={qualityModalRef} />
    </>
  )
}
