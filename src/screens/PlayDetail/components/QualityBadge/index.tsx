import { memo } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { usePlayQuality } from './usePlayQuality'

/**
 * 播放详情页：当前播放歌曲的格式和比特率徽标
 */
export default memo(() => {
  const theme = useTheme()
  const quality = usePlayQuality()
  if (!quality) return null

  return (
    <View style={styles.container}>
      <View style={{ ...styles.badge, backgroundColor: theme['c-primary'], borderColor: theme['c-primary'] }}>
        <Text style={styles.formatText} size={10} color="#fff">{quality.format}</Text>
      </View>
      {
        quality.bitrate
          ? (
              <View style={{ ...styles.badge, borderColor: theme['c-primary-font'] }}>
                <Text style={styles.text} size={10} color={theme['c-primary-font']}>{quality.bitrate}kbps</Text>
              </View>
            )
          : null
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 3,
    marginRight: 4,
    justifyContent: 'center',
  },
  formatText: {
    fontWeight: 'bold',
    lineHeight: 13,
  },
  text: {
    lineHeight: 13,
  },
})
