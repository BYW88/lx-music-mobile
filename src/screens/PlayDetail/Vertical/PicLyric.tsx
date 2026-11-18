import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { setSpText } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'

const FONT_SIZE = 16
const TRANSLATION_FONT_SIZE = 13
const LINE_HEIGHT = setSpText(FONT_SIZE) * 1.4
const TRANSLATION_LINE_HEIGHT = setSpText(TRANSLATION_FONT_SIZE) * 1.4
const MARGIN_TOP = 18
// 主歌词最多 2 行 + 1 行翻译，高度固定，避免海报跳动
const CONTAINER_HEIGHT = MARGIN_TOP + LINE_HEIGHT * 2 + TRANSLATION_LINE_HEIGHT

/**
 * 海报下方的当前行歌词
 */
export default memo(({ autoUpdate }: { autoUpdate: boolean }) => {
  const theme = useTheme()
  const lines = useLrcSet()
  const { line } = useLrcPlay(autoUpdate)

  const lineInfo = useMemo(() => {
    const target = lines[line]
    if (!target) return null
    const text = target.text.trim()
    if (!text) return null
    const translation = target.extendedLyrics.find(lrc => lrc.trim())?.trim() ?? ''
    return { text, translation }
  }, [lines, line])

  return (
    <View style={styles.container}>
      {
        lineInfo ? (
          <>
            <Text
              style={{ ...styles.text, lineHeight: LINE_HEIGHT }}
              size={FONT_SIZE}
              color={theme['c-primary']}
              numberOfLines={2}
            >{lineInfo.text}</Text>
            {
              lineInfo.translation ? (
                <Text
                  style={{ ...styles.text, lineHeight: TRANSLATION_LINE_HEIGHT }}
                  size={TRANSLATION_FONT_SIZE}
                  color={theme['c-font-label']}
                  numberOfLines={1}
                >{lineInfo.translation}</Text>
              ) : null
            }
          </>
        ) : null
      }
    </View>
  )
})

const styles = createStyle({
  container: {
    flexGrow: 0,
    flexShrink: 0,
    height: CONTAINER_HEIGHT,
    paddingTop: MARGIN_TOP,
    paddingHorizontal: '8%',
    alignItems: 'stretch',
  },
  text: {
    textAlign: 'center',
  },
})
