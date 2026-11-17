import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { FlatList, ScrollView, TouchableOpacity, View, type FlatListProps } from 'react-native'
import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'
import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import { LIST_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { getList } from '@/core/player/playInfo'
import { playQueueListIndex, playQueueTempItem } from '@/core/player/player'
import { clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'

type MusicInfo = LX.Music.MusicInfo | LX.Download.ListItem

const ITEM_HEIGHT = 48

const getMusicName = (musicInfo: MusicInfo) => 'progress' in musicInfo ? musicInfo.metadata.musicInfo.name : musicInfo.name
const getMusicSinger = (musicInfo: MusicInfo) => 'progress' in musicInfo ? musicInfo.metadata.musicInfo.singer : musicInfo.singer

const getListName = (listId: string | null) => {
  if (!listId) return ''
  switch (listId) {
    case LIST_IDS.DEFAULT: return global.i18n.t('list_name_default')
    case LIST_IDS.LOVE: return global.i18n.t('list_name_love')
    case LIST_IDS.TEMP: return listState.tempListMeta.name ?? global.i18n.t('list_name_temp')
    default: return listState.userList.find(l => l.id == listId)?.name ?? listId
  }
}

const getModeName = (mode: LX.AppSetting['player.togglePlayMethod']) => {
  switch (mode) {
    case MUSIC_TOGGLE_MODE.listLoop: return global.i18n.t('play_list_loop')
    case MUSIC_TOGGLE_MODE.random: return global.i18n.t('play_list_random')
    case MUSIC_TOGGLE_MODE.list: return global.i18n.t('play_list_order')
    case MUSIC_TOGGLE_MODE.singleLoop: return global.i18n.t('play_single_loop')
    default: return global.i18n.t('play_single')
  }
}

interface QueueInfo {
  listId: string | null
  listName: string
  list: MusicInfo[]
  /** 当前播放歌曲在播放列表中的位置，正在播放稍后播放的歌曲时为 -1 */
  activeIndex: number
  tempPlayList: LX.Player.PlayMusicInfo[]
}

const getQueueInfo = (): QueueInfo => {
  const listId = playerState.playInfo.playerListId
  const list = getList(listId)
  const isTempPlay = playerState.playMusicInfo.isTempPlay
  const currentId = playerState.playMusicInfo.musicInfo?.id
  let activeIndex = -1
  if (!isTempPlay && currentId) {
    activeIndex = list[playerState.playInfo.playerPlayIndex]?.id == currentId
      ? playerState.playInfo.playerPlayIndex
      : list.findIndex(m => m.id == currentId)
  }
  return {
    listId,
    listName: getListName(listId),
    list,
    activeIndex,
    tempPlayList: [...playerState.tempPlayList],
  }
}

const useQueueInfo = () => {
  const [info, setInfo] = useState(getQueueInfo)
  useEffect(() => {
    const update = () => { setInfo(getQueueInfo()) }
    global.state_event.on('playMusicInfoChanged', update)
    global.state_event.on('playInfoChanged', update)
    global.state_event.on('playTempPlayListChanged', update)
    global.state_event.on('mylistUpdated', update)
    global.app_event.on('myListMusicUpdate', update)
    return () => {
      global.state_event.off('playMusicInfoChanged', update)
      global.state_event.off('playInfoChanged', update)
      global.state_event.off('playTempPlayListChanged', update)
      global.state_event.off('mylistUpdated', update)
      global.app_event.off('myListMusicUpdate', update)
    }
  }, [])
  return info
}

const Row = memo(({ index, musicInfo, active, onPress, onRemove }: {
  index: number
  musicInfo: MusicInfo
  active: boolean
  onPress: (index: number) => void
  onRemove?: (index: number) => void
}) => {
  const theme = useTheme()
  const color = active ? theme['c-primary-font'] : undefined
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => { onPress(index) }}>
      <View style={styles.rowLeft}>
        {active ? <Icon name="play" color={theme['c-primary-font']} size={12} style={styles.activeIcon} /> : null}
        <Text size={14} color={color} numberOfLines={1} style={styles.rowName}>{getMusicName(musicInfo)}</Text>
        <Text size={12} color={color ?? theme['c-font-label']} numberOfLines={1} style={styles.rowSinger}> - {getMusicSinger(musicInfo)}</Text>
      </View>
      {onRemove
        ? <TouchableOpacity style={styles.removeBtn} onPress={() => { onRemove(index) }}>
            <Icon name="close" color={theme['c-font-label']} size={12} />
          </TouchableOpacity>
        : null}
    </TouchableOpacity>
  )
})

const QueueContent = () => {
  const t = useI18n()
  const theme = useTheme()
  const togglePlayMethod = useSettingValue('player.togglePlayMethod')
  const info = useQueueInfo()
  const flatListRef = useRef<FlatList<MusicInfo>>(null)

  const handlePlayList = useCallback((index: number) => {
    void playQueueListIndex(index)
  }, [])
  const handlePlayTemp = useCallback((index: number) => {
    void playQueueTempItem(index)
  }, [])
  const handleRemoveTemp = useCallback((index: number) => {
    removeTempPlayList(index)
  }, [])

  const renderItem: FlatListProps<MusicInfo>['renderItem'] = ({ item, index }) => (
    <Row index={index} musicInfo={item} active={index == info.activeIndex} onPress={handlePlayList} />
  )
  const getItemLayout: FlatListProps<MusicInfo>['getItemLayout'] = (data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })

  // 打开时自动滚动到当前播放的歌曲附近
  const [initialScrollIndex] = useState(() => Math.max(info.activeIndex - 2, 0))

  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <Text size={13} numberOfLines={1}>{t('play_queue_now_playing', { name: info.listName || t('play_queue_none') })}</Text>
        <Text size={12} color={theme['c-font-label']}>{t('play_queue_list_count', { num: info.list.length })} · {getModeName(togglePlayMethod)}</Text>
      </View>
      {
        info.tempPlayList.length
          ? (
              <View style={{ ...styles.section, borderBottomColor: theme['c-border-background'] }}>
                <View style={styles.sectionHeader}>
                  <Text size={13} color={theme['c-primary-font']}>{t('play_queue_play_later', { num: info.tempPlayList.length })}</Text>
                  <TouchableOpacity onPress={clearTempPlayeList} style={styles.clearBtn}>
                    <Text size={12} color={theme['c-font-label']}>{t('play_queue_clear')}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.tempList} nestedScrollEnabled>
                  {info.tempPlayList.map((item, index) => (
                    <Row key={`${item.musicInfo.id}_${index}`} index={index} musicInfo={item.musicInfo} active={false} onPress={handlePlayTemp} onRemove={handleRemoveTemp} />
                  ))}
                </ScrollView>
              </View>
            )
          : null
      }
      <View style={styles.sectionHeader}>
        <Text size={13} color={theme['c-primary-font']}>{t('play_queue_list_title')}</Text>
      </View>
      {
        info.list.length
          ? (
              <FlatList
                ref={flatListRef}
                style={styles.list}
                data={info.list}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}_${index}`}
                getItemLayout={getItemLayout}
                initialScrollIndex={initialScrollIndex < info.list.length ? initialScrollIndex : 0}
                extraData={info.activeIndex}
                removeClippedSubviews
              />
            )
          : <Text size={13} color={theme['c-font-label']} style={styles.empty}>{t('play_queue_empty')}</Text>
      }
    </View>
  )
}

export interface PlayQueuePopupType {
  show: () => void
}

export default forwardRef<PlayQueuePopupType, {}>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  return (
    visible
      ? (
          <Popup ref={popupRef} title={t('play_queue_title')} onHide={() => { setVisible(false) }}>
            <QueueContent />
          </Popup>
        )
      : null
  )
})

const styles = createStyle({
  content: {
    flexShrink: 1,
    paddingBottom: 10,
  },
  summary: {
    paddingHorizontal: 15,
    paddingBottom: 8,
    gap: 2,
  },
  section: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tempList: {
    maxHeight: ITEM_HEIGHT * 3.5,
    flexGrow: 0,
  },
  list: {
    flexShrink: 1,
  },
  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
  },
  activeIcon: {
    marginRight: 6,
  },
  rowName: {
    flexShrink: 1,
  },
  rowSinger: {
    flexShrink: 10,
  },
  removeBtn: {
    width: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
})
