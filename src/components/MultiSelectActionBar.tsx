import { forwardRef, useImperativeHandle, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { scaleSizeH } from '@/utils/pixelRatio'

export const MULTI_SELECT_ACTION_BAR_HEIGHT = scaleSizeH(44)

export interface MultiSelectAction {
  id: string
  label: string
}

export interface MultiSelectActionBarProps {
  actions: MultiSelectAction[]
  onAction: (id: string) => void
  /**
   * 距离容器底部的距离，用于叠放在其他底部栏之上
   */
  bottom?: number
}
export interface MultiSelectActionBarType {
  show: () => void
  hide: () => void
}

/**
 * 多选模式下显示在列表底部的批量操作栏
 */
export default forwardRef<MultiSelectActionBarType, MultiSelectActionBarProps>(({ actions, onAction, bottom = 0 }, ref) => {
  const theme = useTheme()
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    show() {
      setVisible(true)
    },
    hide() {
      setVisible(false)
    },
  }))

  if (!visible) return null

  return (
    <View style={{ ...styles.container, bottom, height: MULTI_SELECT_ACTION_BAR_HEIGHT, backgroundColor: theme['c-content-background'], borderTopColor: theme['c-border-background'] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
        {
          actions.map(action => (
            <Button key={action.id} onPress={() => { onAction(action.id) }} style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}>
              <Text size={13} color={theme['c-button-font']}>{action.label}</Text>
            </Button>
          ))
        }
      </ScrollView>
    </View>
  )
})

const styles = createStyle({
  container: {
    position: 'absolute',
    left: 0,
    width: '100%',
    borderTopWidth: BorderWidths.normal,
    zIndex: 3,
  },
  content: {
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  btn: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 7,
    paddingBottom: 7,
    marginRight: 8,
    borderRadius: 4,
  },
})
