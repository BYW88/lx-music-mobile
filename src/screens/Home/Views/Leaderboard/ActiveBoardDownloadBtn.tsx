import { useRef } from 'react'
import { TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import DownloadQualityModal, { type DownloadQualityModalType } from '@/components/DownloadQualityModal'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle, toast } from '@/utils/tools'
import { getListDetailAll } from '@/core/leaderboard'
import boardState from '@/store/leaderboard/state'

// 排行榜顶部行最右边的“下载全部”按钮，只下载当前打开的榜单
export default () => {
  const theme = useTheme()
  const t = useI18n()
  const downloadQualityModalRef = useRef<DownloadQualityModalType>(null)
  const isFetchingRef = useRef(false)

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

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={handleDownloadAll}>
        <Text size={14} numberOfLines={1} color={theme['c-button-font']}>{t('download_all')}</Text>
      </TouchableOpacity>
      <DownloadQualityModal ref={downloadQualityModalRef} />
    </>
  )
}

const styles = createStyle({
  btn: {
    height: '100%',
    paddingLeft: 10,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
})
