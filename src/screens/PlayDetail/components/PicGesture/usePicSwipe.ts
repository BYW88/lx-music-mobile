import { useMemo, useRef } from 'react'
import { Animated, PanResponder } from 'react-native'
import { playNext, playPrev } from '@/core/player/player'

// 滑动超过该距离，或快速滑动超过 FLING_DISTANCE 时切歌
const SWIPE_DISTANCE = 60
const FLING_DISTANCE = 25
const FLING_VELOCITY = 0.6
// 手指移动超过该距离才判定为上下滑动，避免影响点击、长按和左右翻页
const START_DISTANCE = 10
// 海报跟随手指移动的最大距离
const MAX_OFFSET = 80

/**
 * 播放详情页海报的上下滑手势：上滑切到下一首，下滑切到上一首
 * 只接管以竖直方向为主的滑动，左右滑动仍交给翻页组件处理
 */
export default () => {
  const translateY = useRef(new Animated.Value(0)).current

  const panHandlers = useMemo(() => {
    const reset = () => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start()
    }
    return PanResponder.create({
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => {
        return Math.abs(dy) > START_DISTANCE && Math.abs(dy) > Math.abs(dx) * 1.5
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (evt, { dy }) => {
        translateY.setValue(Math.max(Math.min(dy / 2, MAX_OFFSET), -MAX_OFFSET))
      },
      onPanResponderRelease: (evt, { dx, dy, vy }) => {
        reset()
        if (Math.abs(dy) < Math.abs(dx)) return
        if (dy < -SWIPE_DISTANCE || (dy < -FLING_DISTANCE && vy < -FLING_VELOCITY)) {
          void playNext()
        } else if (dy > SWIPE_DISTANCE || (dy > FLING_DISTANCE && vy > FLING_VELOCITY)) {
          void playPrev()
        }
      },
      onPanResponderTerminate: reset,
    }).panHandlers
  }, [translateY])

  return { panHandlers, translateY }
}
