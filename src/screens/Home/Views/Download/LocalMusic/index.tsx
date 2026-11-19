import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity, type FlatListProps } from 'react-native'
import Menu, { type MenuType, type Menus, type Position } from '@/components/common/Menu'
import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import Input from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'
import MusicMultiAddModal, { type MusicMultiAddModalType } from '@/components/MusicMultiAddModal'
import MultiSelectActionBar, { type MultiSelectActionBarType, MULTI_SELECT_ACTION_BAR_HEIGHT } from '@/components/MultiSelectActionBar'
import MusicFileInfoModal, { type MusicFileInfoModalType } from '@/screens/PlayDetail/components/MusicFileInfo'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { usePlayMusicInfo } from '@/store/player/hook'
import { useLocalMusicList, useLocalMusicScanning } from '@/core/localMusic/hook'
import { scanLocalMusic, state as localMusicState, type LocalMusicItem } from '@/core/localMusic'
import { getSavePath } from '@/core/download/savePath'
import ListItem, { ITEM_HEIGHT } from './ListItem'
import { filterList, playLocalMusic, playLocalMusicLater, removeLocalMusic, sortList, type SortType } from './action'

type FlatListType = FlatListProps<LocalMusicItem>

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const rawList = useLocalMusicList()
  const isScanning = useLocalMusicScanning()
  const playMusicInfo = usePlayMusicInfo()
  const [keyword, setKeyword] = useState('')
  const [sortType, setSortType] = useState<SortType>('recent')
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const menuRef = useRef<MenuType>(null)
  const selectedItemRef = useRef<{ item: LocalMusicItem, index: number } | null>(null)
  const musicAddModalRef = useRef<MusicAddModalType>(null)
  const musicMultiAddModalRef = useRef<MusicMultiAddModalType>(null)
  const musicFileInfoRef = useRef<MusicFileInfoModalType>(null)
  const actionBarRef = useRef<MultiSelectActionBarType>(null)

  // 进入页面时刷新一次
  useEffect(() => {
    void scanLocalMusic()
  }, [])

  const list = useMemo(() => sortList(filterList(rawList, keyword), sortType), [rawList, keyword, sortType])
  const listRef = useRef(list)
  listRef.current = list

  const activeId = playMusicInfo.musicInfo
    ? ('progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo.id : playMusicInfo.musicInfo.id)
    : null

  const exitMultiSelect = useCallback(() => {
    setIsMultiSelect(false)
    setSelectedIds(new Set())
    actionBarRef.current?.hide()
  }, [])
  const enterMultiSelect = useCallback((item?: LocalMusicItem) => {
    setIsMultiSelect(true)
    setSelectedIds(new Set(item ? [item.musicInfo.id] : []))
    actionBarRef.current?.show()
  }, [])
  const toggleSelect = useCallback((item: LocalMusicItem) => {
    setSelectedIds(ids => {
      const newIds = new Set(ids)
      if (newIds.has(item.musicInfo.id)) newIds.delete(item.musicInfo.id)
      else newIds.add(item.musicInfo.id)
      return newIds
    })
  }, [])

  const isMultiSelectRef = useRef(isMultiSelect)
  isMultiSelectRef.current = isMultiSelect

  const handlePress = useCallback((item: LocalMusicItem, index: number) => {
    if (isMultiSelectRef.current) {
      toggleSelect(item)
      return
    }
    void playLocalMusic(listRef.current, index)
  }, [toggleSelect])

  const handleShowMenu = useCallback((item: LocalMusicItem, index: number, position: Position) => {
    if (isMultiSelectRef.current) {
      toggleSelect(item)
      return
    }
    selectedItemRef.current = { item, index }
    menuRef.current?.show(position)
  }, [toggleSelect])

  const handleLongPress = useCallback((item: LocalMusicItem, index: number) => {
    if (isMultiSelectRef.current) {
      toggleSelect(item)
      return
    }
    enterMultiSelect(item)
  }, [enterMultiSelect, toggleSelect])

  const menus = useMemo(() => [
    { action: 'play', label: t('play') },
    { action: 'playLater', label: t('play_later') },
    { action: 'add', label: t('add_to') },
    { action: 'fileInfo', label: t('music_file_info_title') },
    { action: 'multiSelect', label: t('local_music_multi_select') },
    { action: 'remove', label: t('local_music_remove_file') },
  ] as const satisfies Menus, [t])

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    const selected = selectedItemRef.current
    if (!selected) return
    const { item, index } = selected
    switch (action) {
      case 'play':
        void playLocalMusic(listRef.current, index)
        break
      case 'playLater':
        playLocalMusicLater([item])
        break
      case 'add':
        musicAddModalRef.current?.show({ musicInfo: item.musicInfo, listId: '', isMove: false })
        break
      case 'fileInfo':
        musicFileInfoRef.current?.show(item.musicInfo)
        break
      case 'multiSelect':
        enterMultiSelect(item)
        break
      case 'remove':
        void removeLocalMusic([item])
        break
    }
  }

  const isSelectAll = list.length > 0 && list.every(i => selectedIds.has(i.musicInfo.id))
  const handleMultiAction = (action: string) => {
    if (action == 'selectAll') {
      setSelectedIds(isSelectAll ? new Set() : new Set(list.map(i => i.musicInfo.id)))
      return
    }
    if (action == 'cancel') {
      exitMultiSelect()
      return
    }
    const selectedList = list.filter(i => selectedIds.has(i.musicInfo.id))
    if (!selectedList.length) {
      toast(t('list_multi_select_empty_tip'))
      return
    }
    switch (action) {
      case 'playLater':
        playLocalMusicLater(selectedList)
        exitMultiSelect()
        break
      case 'add':
        musicMultiAddModalRef.current?.show({ selectedList: selectedList.map(i => i.musicInfo), listId: '', isMove: false })
        break
      case 'remove':
        void removeLocalMusic(selectedList).then(removed => {
          if (removed) exitMultiSelect()
        })
        break
    }
  }

  const handleRefresh = () => {
    void scanLocalMusic().then(() => {
      toast(t('local_music_refresh_done', { num: localMusicState.list.length }))
    })
  }

  const sortMenus = useMemo(() => [
    { action: 'recent', label: t('local_music_sort_recent') },
    { action: 'name', label: t('local_music_sort_name') },
    { action: 'singer', label: t('local_music_sort_singer') },
  ] as const satisfies Menus, [t])
  const sortLabel = sortMenus.find(m => m.action == sortType)?.label ?? ''

  const unknownSinger = t('local_music_unknown_singer')
  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      isActive={item.musicInfo.id == activeId}
      isSelected={isMultiSelect && selectedIds.has(item.musicInfo.id)}
      unknownSinger={unknownSinger}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onShowMenu={handleShowMenu}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.musicInfo.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
        <Text style={styles.headerInfo} size={13} color={theme['c-font-label']} numberOfLines={1}>
          {isScanning ? t('local_music_scanning') : t('local_music_info', { num: rawList.length })}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => { void playLocalMusic(list, 0) }}>
          <Text size={13} color={theme['c-button-font']}>{t('local_music_play_all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleRefresh} disabled={isScanning}>
          <Text size={13} color={isScanning ? theme['c-font-label'] : theme['c-button-font']}>{t('local_music_refresh')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Icon name="search-2" size={13} color={theme['c-font-label']} style={styles.searchIcon} />
          <Input
            style={styles.searchInput}
            placeholder={t('local_music_search_placeholder')}
            value={keyword}
            onChangeText={text => { setKeyword(text) }}
            onClearText={() => { setKeyword('') }}
            clearBtn
            size={13}
          />
        </View>
        <DorpDownMenu menus={sortMenus} onPress={({ action }) => { setSortType(action) }} btnStyle={styles.sortBtn}>
          <Text size={13} color={theme['c-button-font']}>{t('local_music_sort', { name: sortLabel })} ▾</Text>
        </DorpDownMenu>
      </View>
      {
        list.length
          ? (
              <FlatList
                style={styles.list}
                data={list}
                renderItem={renderItem}
                keyExtractor={getkey}
                getItemLayout={getItemLayout}
                extraData={[activeId, isMultiSelect, selectedIds]}
                removeClippedSubviews={true}
                ListFooterComponent={isMultiSelect ? <View style={{ height: MULTI_SELECT_ACTION_BAR_HEIGHT }} /> : null}
              />
            )
          : (
              <View style={styles.empty}>
                <Text style={styles.emptyText} color={theme['c-font-label']}>
                  {rawList.length ? t('local_music_search_empty') : t('local_music_empty', { path: getSavePath() })}
                </Text>
              </View>
            )
      }
      <MultiSelectActionBar
        ref={actionBarRef}
        actions={[
          { id: 'selectAll', label: t(isSelectAll ? 'list_select_unall' : 'list_select_all') },
          { id: 'playLater', label: t('play_later') },
          { id: 'add', label: t('add_to') },
          { id: 'remove', label: t('local_music_remove_file') },
          { id: 'cancel', label: t('list_select_cancel') },
        ]}
        onAction={handleMultiAction}
      />
      <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} />
      <MusicAddModal ref={musicAddModalRef} />
      <MusicMultiAddModal ref={musicMultiAddModalRef} onAdded={exitMultiSelect} />
      <MusicFileInfoModal ref={musicFileInfoRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    height: 38,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerBtn: {
    paddingLeft: 8,
    paddingRight: 8,
    height: '100%',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    paddingTop: 6,
    paddingBottom: 6,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 15,
    paddingLeft: 28,
    height: 30,
  },
  sortBtn: {
    paddingLeft: 10,
    paddingRight: 8,
    height: 30,
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
  },
})
