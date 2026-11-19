import { useEffect, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useDownloadList } from '@/store/download/hook'
import { useLocalMusicList } from '@/core/localMusic/hook'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'
import { BorderWidths } from '@/theme'
import Tasks from './Tasks'
import LocalMusic from './LocalMusic'

type TabId = 'local' | 'tasks'

let prevTab: TabId = 'local'
let isTabLoaded = false

/**
 * 下载页：本地音乐 / 下载任务 两个标签
 */
export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [tab, setTab] = useState<TabId>(prevTab)
  const taskList = useDownloadList()
  const localList = useLocalMusicList()

  useEffect(() => {
    if (isTabLoaded) return
    isTabLoaded = true
    void getData<TabId>(storageDataPrefix.downloadPageTab).then(id => {
      if (id != 'local' && id != 'tasks') return
      prevTab = id
      setTab(id)
    }).catch(() => {})
  }, [])

  const handleChangeTab = (id: TabId) => {
    if (id == tab) return
    prevTab = id
    setTab(id)
    void saveData(storageDataPrefix.downloadPageTab, id)
  }

  const renderTab = (id: TabId, label: string) => {
    const active = tab == id
    return (
      <TouchableOpacity style={styles.tab} onPress={() => { handleChangeTab(id) }}>
        <Text size={15} color={active ? theme['c-primary-font'] : theme['c-font']} style={active ? styles.tabTextActive : undefined}>{label}</Text>
        <View style={{ ...styles.tabIndicator, backgroundColor: active ? theme['c-primary-font'] : 'transparent' }} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={{ ...styles.tabs, borderBottomColor: theme['c-border-background'] }}>
        {renderTab('local', t('local_music_tab', { num: localList.length }))}
        {renderTab('tasks', t('download_tasks_tab', { num: taskList.length }))}
      </View>
      <View style={styles.content}>
        {tab == 'local' ? <LocalMusic /> : <Tasks />}
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: BorderWidths.normal,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabTextActive: {
    fontWeight: 'bold',
  },
  tabIndicator: {
    marginTop: 7,
    width: 72,
    height: 3,
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
  },
})
