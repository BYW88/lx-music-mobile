import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View } from 'react-native'
// import LoadingMask, { LoadingMaskType } from '@/components/common/LoadingMask'
import List, { type ListProps, type ListType, type Status, type RowInfoType } from './List'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from './ListMenu'
import ListMusicMultiAdd, { type MusicMultiAddModalType as ListAddMultiType } from '@/components/MusicMultiAddModal'
import ListMusicAdd, { type MusicAddModalType as ListMusicAddType } from '@/components/MusicAddModal'
import MultipleModeBar, { type MultipleModeBarType, type SelectMode } from './MultipleModeBar'
import { clearMusicUrl, handleDislikeMusic, handlePlay, handlePlayLater, handleShare, handleShowMusicSourceDetail } from './listAction'
import { createStyle, toast } from '@/utils/tools'
import MultiSelectActionBar, { type MultiSelectActionBarType } from '@/components/MultiSelectActionBar'
import { MULTI_SELECT_BAR_HEIGHT } from './MultipleModeBar'
import { useI18n } from '@/lang'
import DownloadQualityModal, { type DownloadQualityModalType } from '@/components/DownloadQualityModal'

export interface OnlineListProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
  onPlayList?: ListProps['onPlayList']
  progressViewOffset?: ListProps['progressViewOffset']
  ListHeaderComponent?: ListProps['ListHeaderComponent']
  checkHomePagerIdle?: boolean
  rowType?: RowInfoType
}
export interface OnlineListType {
  setList: (list: LX.Music.MusicInfoOnline[], isAppend?: boolean, showSource?: boolean) => void
  setStatus: (val: Status) => void
}

export default forwardRef<OnlineListType, OnlineListProps>(({
  onRefresh,
  onLoadMore,
  onPlayList,
  progressViewOffset,
  ListHeaderComponent,
  checkHomePagerIdle = false,
  rowType,
}, ref) => {
  const listRef = useRef<ListType>(null)
  const multipleModeBarRef = useRef<MultipleModeBarType>(null)
  const listMusicAddRef = useRef<ListMusicAddType>(null)
  const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const downloadQualityModalRef = useRef<DownloadQualityModalType>(null)
  const multiSelectActionBarRef = useRef<MultiSelectActionBarType>(null)
  const t = useI18n()
  // const loadingMaskRef = useRef<LoadingMaskType>(null)

  useImperativeHandle(ref, () => ({
    setList(list, isAppend = false, showSource = false) {
      listRef.current?.setList(list, isAppend, showSource)
      multipleModeBarRef.current?.setIsSelectAll(false)
    },
    setStatus(val) {
      listRef.current?.setStatus(val)
    },
  }))

  const hancelMultiSelect = () => {
    multipleModeBarRef.current?.show()
    multiSelectActionBarRef.current?.show()
    listRef.current?.setIsMultiSelectMode(true)
  }
  const hancelSwitchSelectMode = (mode: SelectMode) => {
    multipleModeBarRef.current?.setSwitchMode(mode)
    listRef.current?.setSelectMode(mode)
  }
  const hancelExitSelect = () => {
    multipleModeBarRef.current?.exitSelectMode()
    multiSelectActionBarRef.current?.hide()
    listRef.current?.setIsMultiSelectMode(false)
  }

  const handleMultiSelectAction = (action: string) => {
    const selectedList = listRef.current?.getSelectedList() ?? []
    if (!selectedList.length) {
      toast(t('list_multi_select_empty_tip'))
      return
    }
    switch (action) {
      case 'play':
        handlePlay(selectedList[0], selectedList, hancelExitSelect)
        break
      case 'playLater':
        handlePlayLater(selectedList[0], selectedList, hancelExitSelect)
        break
      case 'download':
        downloadQualityModalRef.current?.show({ list: selectedList })
        break
      case 'add':
        listMusicMultiAddRef.current?.show({ selectedList, listId: '', isMove: false })
        break
    }
  }

  const showMenu = (musicInfo: LX.Music.MusicInfoOnline, index: number, position: Position) => {
    listMenuRef.current?.show({
      musicInfo,
      index,
      single: false,
      selectedList: listRef.current!.getSelectedList(),
    }, position)
  }
  const handleAddMusic = (info: SelectInfo) => {
    if (info.selectedList.length) {
      listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: '', isMove: false })
    } else {
      listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: false })
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <List
          ref={listRef}
          onShowMenu={showMenu}
          onMuiltSelectMode={hancelMultiSelect}
          onSelectAll={isAll => multipleModeBarRef.current?.setIsSelectAll(isAll)}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          onPlayList={onPlayList}
          progressViewOffset={progressViewOffset}
          ListHeaderComponent={ListHeaderComponent}
          checkHomePagerIdle={checkHomePagerIdle}
          rowType={rowType}
        />
        <MultiSelectActionBar
          ref={multiSelectActionBarRef}
          bottom={MULTI_SELECT_BAR_HEIGHT}
          actions={[
            { id: 'play', label: t('play') },
            { id: 'playLater', label: t('play_later') },
            { id: 'download', label: t('download') },
            { id: 'add', label: t('add_to') },
          ]}
          onAction={handleMultiSelectAction}
        />
        <MultipleModeBar
          ref={multipleModeBarRef}
          onSwitchMode={hancelSwitchSelectMode}
          onSelectAll={isAll => listRef.current?.selectAll(isAll)}
          onExitSelectMode={hancelExitSelect}
        />
      </View>
      <ListMusicAdd ref={listMusicAddRef} onAdded={() => { hancelExitSelect() }} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={() => { hancelExitSelect() }} />
      <DownloadQualityModal ref={downloadQualityModalRef} onAdded={() => { hancelExitSelect() }} />
      <ListMenu
        ref={listMenuRef}
        onPlay={info => { handlePlay(info.musicInfo, info.selectedList, hancelExitSelect) }}
        onPlayLater={info => { hancelExitSelect(); handlePlayLater(info.musicInfo, info.selectedList, hancelExitSelect) }}
        onCopyName={info => { handleShare(info.musicInfo) }}
        onAdd={handleAddMusic}
        onMusicSourceDetail={info => { void handleShowMusicSourceDetail(info.musicInfo) }}
        onRemoveCache={info => { void clearMusicUrl(info.musicInfo) }}
        onDislikeMusic={info => { void handleDislikeMusic(info.musicInfo) }}
        onDownload={info => { downloadQualityModalRef.current?.show({ list: info.selectedList.length ? info.selectedList : [info.musicInfo] }) }}
      />
      {/* <LoadingMask ref={loadingMaskRef} /> */}
    </View>
  )
})


const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  exitMultipleModeBtn: {
    height: 40,
  },
})

