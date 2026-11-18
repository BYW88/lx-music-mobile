import { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import List, { type ListType, type ListProps } from './List'
import ListMenu, { type ListMenuType, type Position } from './ListMenu'
import { type BoardItem } from '@/store/leaderboard/state'
import DownloadQualityModal, { type DownloadQualityModalType } from '@/components/DownloadQualityModal'
import { getListDetailAll } from '@/core/leaderboard'
import { toast } from '@/utils/tools'


export interface BoardsListProps {
  onBoundChange: (listId: string) => void
  onPlay: (listId: string) => void
  onCollect: (listId: string, name: string) => void
}
export interface BoardsListType {
  setList: (list: BoardItem[], activeId: string) => void
}

export default forwardRef<BoardsListType, BoardsListProps>(({ onBoundChange, onPlay, onCollect }, ref) => {
  const listRef = useRef<ListType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const downloadQualityModalRef = useRef<DownloadQualityModalType>(null)
  const isFetchingRef = useRef(false)

  useImperativeHandle(ref, () => ({
    setList(list, listId) {
      listRef.current?.setList(list, listId)
    },
  }), [])

  const handleShowMenu: ListProps['onShowMenu'] = ({ listId, name, index }, position: Position) => {
    listMenuRef.current?.show({
      listId,
      index,
      name,
    }, position)
  }

  const handleDownloadAll = (listId: string) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    toast(global.i18n.t('download_all_fetching'))
    // 排行榜分页加载，下载前先获取完整榜单
    void getListDetailAll(listId).then(list => {
      if (!list.length) {
        toast(global.i18n.t('download_all_empty'))
        return
      }
      downloadQualityModalRef.current?.show({ list })
    }).catch(() => {
      toast(global.i18n.t('download_all_fetch_failed'))
    }).finally(() => {
      isFetchingRef.current = false
    })
  }

  return (
    <View style={styles.container}>
      <List
        ref={listRef}
        onBoundChange={onBoundChange}
        onShowMenu={handleShowMenu} />
      <ListMenu
        ref={listMenuRef}
        onHideMenu={() => listRef.current?.hideMenu()}
        onPlay={({ listId }) => { onPlay(listId) }}
        onCollect={({ listId, name }) => { onCollect(listId, name) }}
        onDownload={({ listId }) => { handleDownloadAll(listId) }}
      />
      <DownloadQualityModal ref={downloadQualityModalRef} />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 1,
  },
})
