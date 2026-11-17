import { useCallback, useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity, type FlatListProps } from 'react-native'
import Menu, { type MenuType, type Menus } from '@/components/common/Menu'
import Text from '@/components/common/Text'
import { createStyle, confirmDialog } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useDownloadList } from '@/store/download/hook'
import {
  DOWNLOAD_STATUS,
  pauseDownloadTasks,
  removeDownloadTasks,
  startDownloadTasks,
} from '@/core/download'
import ListItem, { ITEM_HEIGHT } from './ListItem'
import { playDownloadedMusic } from './action'

type FlatListType = FlatListProps<LX.Download.ListItem>

const isRunning = (item: LX.Download.ListItem) => item.status == DOWNLOAD_STATUS.RUN || item.status == DOWNLOAD_STATUS.WAITING

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const list = useDownloadList()
  const menuRef = useRef<MenuType>(null)
  const selectedItemRef = useRef<LX.Download.ListItem | null>(null)
  const [menus, setMenus] = useState<Menus>([])

  const handlePress = useCallback((item: LX.Download.ListItem) => {
    if (item.status == DOWNLOAD_STATUS.COMPLETED) void playDownloadedMusic(item)
    else if (isRunning(item)) pauseDownloadTasks([item.id])
    else startDownloadTasks([item.id])
  }, [])

  const handleShowMenu = useCallback((item: LX.Download.ListItem, position: { x: number, y: number, w: number, h: number }) => {
    selectedItemRef.current = item
    const isCompleted = item.status == DOWNLOAD_STATUS.COMPLETED
    const menus: Menus = [
      isCompleted
        ? { action: 'play', label: t('play') }
        : isRunning(item)
          ? { action: 'pause', label: t('download_action_pause') }
          : { action: 'start', label: t('download_action_start') },
      { action: 'remove', label: t('download_action_remove') },
      { action: 'removeWithFile', label: t('download_action_remove_file'), disabled: !isCompleted },
    ]
    setMenus(menus)
    requestAnimationFrame(() => {
      menuRef.current?.show(position)
    })
  }, [t])

  const handleMenuPress = ({ action }: Menus[number]) => {
    const item = selectedItemRef.current
    if (!item) return
    switch (action) {
      case 'play':
        void playDownloadedMusic(item)
        break
      case 'pause':
        pauseDownloadTasks([item.id])
        break
      case 'start':
        startDownloadTasks([item.id])
        break
      case 'remove':
        void removeDownloadTasks([item.id])
        break
      case 'removeWithFile':
        void confirmDialog({
          message: t('download_action_remove_file_tip', { name: item.metadata.musicInfo.name }),
          confirmButtonText: t('confirm_button_text'),
        }).then(confirm => {
          if (confirm) void removeDownloadTasks([item.id], true)
        })
        break
    }
  }

  const handleStartAll = () => {
    startDownloadTasks(list.filter(i => i.status == DOWNLOAD_STATUS.PAUSE || i.status == DOWNLOAD_STATUS.ERROR).map(i => i.id))
  }
  const handlePauseAll = () => {
    pauseDownloadTasks(list.filter(isRunning).map(i => i.id))
  }
  const handleClearCompleted = () => {
    void removeDownloadTasks(list.filter(i => i.status == DOWNLOAD_STATUS.COMPLETED).map(i => i.id))
  }

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem item={item} index={index} onPress={handlePress} onShowMenu={handleShowMenu} />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })

  const runningNum = list.filter(isRunning).length
  const completedNum = list.filter(i => i.status == DOWNLOAD_STATUS.COMPLETED).length

  return (
    <View style={styles.container}>
      <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
        <Text style={styles.headerInfo} size={13} color={theme['c-font-label']} numberOfLines={1}>
          {t('download_list_info', { total: list.length, running: runningNum, completed: completedNum })}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleStartAll}>
          <Text size={13} color={theme['c-button-font']}>{t('download_action_start_all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handlePauseAll}>
          <Text size={13} color={theme['c-button-font']}>{t('download_action_pause_all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClearCompleted}>
          <Text size={13} color={theme['c-button-font']}>{t('download_action_clear_completed')}</Text>
        </TouchableOpacity>
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
                removeClippedSubviews={true}
              />
            )
          : (
              <View style={styles.empty}>
                <Text color={theme['c-font-label']}>{t('download_list_empty')}</Text>
              </View>
            )
      }
      <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} />
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
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
