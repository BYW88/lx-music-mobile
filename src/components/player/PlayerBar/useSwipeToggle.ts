import { useMemo, useRef } from 'react'
import { Animated, PanResponder } from 'react-native'
import { playNext, playPrev } from '@/core/player/player'
import playerState from '@/store/player/state'

const SWIPE_DISTANCE = 60
const FLING_DISTANCE = 25
const FLING_VELOCITY = 0.6
const START_DISTANCE = 10
const MAX_OFFSET = 60

/**
 * 迷你播放栏左右滑动切歌：左滑下一首，右滑上一首
 * 只接管以水平方向为主的滑动，点击、长按和按钮不受影响
 */
export default () => {
  const translateX = useRef(new Animated.Value(0)).current

  const panHandlers = useMemo(() => {
    const reset = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start()
    }
    return PanResponder.create({
      // 用捕获阶段，这样手指从播放按钮、封面上开始滑动也能切歌
      onMoveShouldSetPanResponderCapture: (evt, { dx, dy }) => {
        if (!playerState.playMusicInfo.musicInfo) return false
        return Math.abs(dx) > START_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (evt, { dx }) => {
        translateX.setValue(Math.max(Math.min(dx / 2, MAX_OFFSET), -MAX_OFFSET))
      },
      onPanResponderRelease: (evt, { dx, dy, vx }) => {
        reset()
        if (Math.abs(dx) < Math.abs(dy)) return
        if (dx < -SWIPE_DISTANCE || (dx < -FLING_DISTANCE && vx < -FLING_VELOCITY)) {
          void playNext()
        } else if (dx > SWIPE_DISTANCE || (dx > FLING_DISTANCE && vx > FLING_VELOCITY)) {
          void playPrev()
        }
      },
      onPanResponderTerminate: reset,
    }).panHandlers
  }, [translateX])

  return { panHandlers, translateX }
}
