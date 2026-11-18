import { memo } from 'react'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useIsDownloaded } from '@/store/download/hook'
import { createStyle } from '@/utils/tools'

/**
 * 歌曲行上的“已下载”小图标，歌曲未下载时不显示
 */
export default memo(({ musicId }: { musicId: string }) => {
  const theme = useTheme()
  const isDownloaded = useIsDownloaded(musicId)
  if (!isDownloaded) return null
  return <Icon style={styles.icon} name="download-2" size={10} color={theme['c-primary-font']} />
})

const styles = createStyle({
  icon: {
    marginRight: 5,
    alignSelf: 'center',
  },
})
