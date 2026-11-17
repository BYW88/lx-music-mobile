import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { DOWNLOAD_STATUS } from '@/core/download'
import { scaleSizeH } from '@/utils/pixelRatio'

export const ITEM_HEIGHT = scaleSizeH(66)

export interface ListItemProps {
  item: LX.Download.ListItem
  index: number
  onPress: (item: LX.Download.ListItem) => void
  onShowMenu: (item: LX.Download.ListItem, position: { x: number, y: number, w: number, h: number }) => void
}

export default memo(({ item, onPress, onShowMenu }: ListItemProps) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }

  const musicInfo = item.metadata.musicInfo
  const isError = item.status == DOWNLOAD_STATUS.ERROR
  const isCompleted = item.status == DOWNLOAD_STATUS.COMPLETED
  const isRunning = item.status == DOWNLOAD_STATUS.RUN
  const statusIcon = isCompleted
    ? 'play-outline'
    : isRunning || item.status == DOWNLOAD_STATUS.WAITING ? 'pause' : 'play'
  const progress = isCompleted ? 100 : item.progress

  return (
    <View style={{ ...styles.listItem, height: ITEM_HEIGHT }}>
      <TouchableOpacity style={styles.left} onPress={() => { onPress(item) }} onLongPress={handleShowMenu}>
        <View style={styles.statusIcon}>
          <Icon name={statusIcon} size={14} color={isError ? theme['c-font-label'] : theme['c-primary-font']} />
        </View>
        <View style={styles.info}>
          <Text numberOfLines={1}>{musicInfo.name}</Text>
          <View style={styles.row}>
            <Badge>{musicInfo.source.toUpperCase()}</Badge>
            <Badge type="secondary">{item.metadata.quality.toUpperCase()}</Badge>
            <Text style={styles.singer} size={11} color={theme['c-500']} numberOfLines={1}>{musicInfo.singer}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.status} size={11} color={isError ? theme['c-font-label'] : theme['c-primary-alpha-200']} numberOfLines={1}>{item.statusText}</Text>
            {isRunning && item.speed ? <Text size={11} color={theme['c-500']}>{item.speed}</Text> : null}
          </View>
          {
            isCompleted ? null : (
              <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary-light-100-alpha-800'] }}>
                <View style={{ ...styles.progress, width: `${progress}%`, backgroundColor: theme['c-primary-light-100-alpha-300'] }} />
              </View>
            )
          }
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
        <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
      </TouchableOpacity>
    </View>
  )
}, (prev, next) => prev.item === next.item && prev.index === next.index && prev.item.statusText === next.item.statusText && prev.item.progress === next.item.progress && prev.item.speed === next.item.speed && prev.item.status === next.item.status)

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 38,
    alignItems: 'center',
  },
  info: {
    flex: 1,
    paddingRight: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  singer: {
    flexShrink: 1,
    fontWeight: '300',
  },
  status: {
    flexShrink: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 2,
    marginTop: 4,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
  moreButton: {
    height: '80%',
    paddingLeft: 16,
    paddingRight: 16,
    justifyContent: 'center',
  },
})
