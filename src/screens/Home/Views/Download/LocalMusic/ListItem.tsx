import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import type { LocalMusicItem } from '@/core/localMusic'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT + 2)

export const getQualityLabel = (item: LocalMusicItem) => {
  const ext = (item.musicInfo.meta.ext || '').toLowerCase()
  if (ext == 'mp3' && item.bitrate) return `${item.bitrate >= 300 ? 320 : item.bitrate >= 180 ? 192 : 128}K`
  return ext.toUpperCase() || '?'
}

const formatSize = (size: number) => {
  if (!size) return ''
  if (size >= 1024 * 1024) return `${Math.round(size / 1024 / 1024)}MB`
  return `${Math.max(1, Math.round(size / 1024))}KB`
}

export interface ListItemProps {
  item: LocalMusicItem
  index: number
  isActive: boolean
  isSelected: boolean
  unknownSinger: string
  onPress: (item: LocalMusicItem, index: number) => void
  onLongPress: (item: LocalMusicItem, index: number) => void
  onShowMenu: (item: LocalMusicItem, index: number, position: { x: number, y: number, w: number, h: number }) => void
}

export default memo(({ item, index, isActive, isSelected, unknownSinger, onPress, onLongPress, onShowMenu }: ListItemProps) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }
  const musicInfo = item.musicInfo
  const subText = `${musicInfo.singer || unknownSinger}${musicInfo.meta.albumName ? ` · ${musicInfo.meta.albumName}` : ''}`
  const tagColor = isActive ? theme['c-primary-font'] : theme['c-500']

  return (
    <View style={{
      ...styles.listItem,
      height: ITEM_HEIGHT,
      backgroundColor: isSelected
        ? theme['c-primary-background-hover']
        : isActive ? theme['c-primary-alpha-900'] : 'rgba(0,0,0,0)',
    }}>
      <View style={{ ...styles.activeBar, backgroundColor: isActive ? theme['c-primary-font'] : 'transparent' }} />
      <TouchableOpacity style={styles.left} onPress={() => { onPress(item, index) }} onLongPress={() => { onLongPress(item, index) }}>
        <View style={styles.info}>
          <Text color={isActive ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{musicInfo.name}</Text>
          <Text style={styles.sub} size={11} color={isActive ? theme['c-primary-alpha-200'] : theme['c-500']} numberOfLines={1}>{subText}</Text>
        </View>
        <View style={{ ...styles.tag, borderColor: tagColor }}>
          <Text size={10} color={tagColor}>{getQualityLabel(item)}</Text>
        </View>
        <Text style={styles.size} size={11} color={theme['c-500']} numberOfLines={1}>{formatSize(item.size)}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
        <Icon name="dots-vertical" style={{ color: theme['c-350'] }} size={12} />
      </TouchableOpacity>
    </View>
  )
})

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
  },
  activeBar: {
    width: 3,
    height: '100%',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    height: '100%',
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  sub: {
    paddingTop: 3,
    fontWeight: '300',
  },
  tag: {
    borderWidth: 1,
    borderRadius: 3,
    paddingLeft: 3,
    paddingRight: 3,
    minWidth: 34,
    alignItems: 'center',
  },
  size: {
    width: 44,
    textAlign: 'right',
  },
  moreButton: {
    height: '80%',
    paddingLeft: 14,
    paddingRight: 14,
    justifyContent: 'center',
  },
})
