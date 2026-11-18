import { useRef, useState } from 'react'
import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Menu, { type MenuType } from '@/components/common/Menu'
import DownloadQualityModal, { type DownloadQualityModalType } from '@/components/DownloadQualityModal'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle, toast } from '@/utils/tools'
import { getListDetailAll } from '@/core/leaderboard'
import boardState from '@/store/leaderboard/state'

// 排行榜顶部行最右边的更多按钮，菜单只作用于当前打开的榜单
export default () => {
  const theme = useTheme()
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const btnRef = useRef<TouchableOpacity>(null)
  const menuRef = useRef<MenuType>(null)
  const downloadQualityModalRef = useRef<DownloadQualityModalType>(null)
  const isFetchingRef = useRef(false)

  const menus = [
    { action: 'download', label: t('download_all') },
  ] as const

  const showMenu = () => {
    btnRef.current?.measure((fx, fy, width, height, px, py) => {
      const position = { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) }
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    })
  }

  const handleDownloadAll = () => {
    const id = boardState.listDetailInfo.id
    if (!id || isFetchingRef.current) return
    isFetchingRef.current = true
    toast(t('download_all_fetching'))
    // 排行榜分页加载，下载前先获取完整榜单
    void getListDetailAll(id).then(list => {
      if (!list.length) {
        toast(t('download_all_empty'))
        return
      }
      downloadQualityModalRef.current?.show({ list })
    }).catch(() => {
      toast(t('download_all_fetch_failed'))
    }).finally(() => {
      isFetchingRef.current = false
    })
  }

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    switch (action) {
      case 'download':
        handleDownloadAll()
        break
      default:
        break
    }
  }

  return (
    <>
      <TouchableOpacity ref={btnRef} style={styles.btn} onPress={showMenu}>
        <Icon name="dots-vertical" color={theme['c-button-font']} size={16} />
      </TouchableOpacity>
      { visible ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} /> : null }
      <DownloadQualityModal ref={downloadQualityModalRef} />
    </>
  )
}

const styles = createStyle({
  btn: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
