import { useRef, type ReactNode } from 'react'
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native'
import { togglePlay } from '@/core/player/player'
import usePicSwipe from './usePicSwipe'

// 两次点击间隔小于该值视为双击
const DOUBLE_PRESS_DELAY = 300

/**
 * 播放详情页海报手势：
 * - 上滑下一首，下滑上一首
 * - 双击播放/暂停
 */
export default ({ style, children }: {
  pic: string | null | undefined
  style: StyleProp<ViewStyle>
  children: ReactNode
}) => {
  const { panHandlers, translateY } = usePicSwipe()
  const lastPressTimeRef = useRef(0)

  const handlePress = () => {
    const now = Date.now()
    if (now - lastPressTimeRef.current < DOUBLE_PRESS_DELAY) {
      lastPressTimeRef.current = 0
      togglePlay()
    } else lastPressTimeRef.current = now
  }

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]} {...panHandlers}>
      <Pressable onPress={handlePress}>
        {children}
      </Pressable>
    </Animated.View>
  )
}
