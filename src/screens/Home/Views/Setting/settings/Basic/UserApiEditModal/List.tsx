import { useCallback } from 'react'
import Text from '@/components/common/Text'
import { View, TouchableOpacity, ScrollView } from 'react-native'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useUserApiList, state as userApiState } from '@/store/userApi'
import { useSettingValue } from '@/store/setting/hook'
import { moveUserApi, removeUserApi, setUserApiAllowShowUpdateAlert } from '@/core/userApi'
import { BorderRadius } from '@/theme'
import CheckBox from '@/components/common/CheckBox'
import { Icon } from '@/components/common/Icon'
import settingState from '@/store/setting/state'
import apiSourceInfo from '@/utils/musicSdk/api-source-info'
import { setApiSource } from '@/core/apiSource'

const formatVersionName = (version: string) => {
  return /^\d/.test(version) ? `v${version}` : version
}
const ListItem = ({ item, index, total, activeId, onRemove, onMove, onChangeAllowShowUpdateAlert }: {
  item: LX.UserApi.UserApiInfo
  index: number
  total: number
  activeId: string
  onMove: (id: string, offset: number) => void
  onRemove: (id: string, name: string) => void
  onChangeAllowShowUpdateAlert: (id: string, enabled: boolean) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const changeAllowShowUpdateAlert = (check: boolean) => {
    onChangeAllowShowUpdateAlert(item.id, check)
  }
  const handleRemove = () => {
    onRemove(item.id, item.name)
  }

  return (
    <View style={{ ...styles.listItem, backgroundColor: activeId == item.id ? theme['c-primary-background-active'] : 'transparent' }}>
      <View style={styles.listItemLeft}>
        <Text size={14}>
          {item.name}
          {
            item.version ? (
              <Text size={12} color={theme['c-font-label']}>{ '   ' + formatVersionName(item.version) }</Text>
            ) : null
          }
          {
            item.author ? (
              <Text size={12} color={theme['c-font-label']}>{ '   ' + item.author }</Text>
            ) : null
          }
        </Text>
        {
          item.description ? (
            <Text size={12} color={theme['c-font-label']}>{item.description}</Text>
          ) : null
        }
        <CheckBox check={item.allowShowUpdateAlert} label={t('user_api_allow_show_update_alert')} onChange={changeAllowShowUpdateAlert} size={0.86} />
      </View>
      <View style={styles.listItemRight}>
        {
          total > 1 ? (
            <>
              <TouchableOpacity style={styles.btn} disabled={index == 0} onPress={() => { onMove(item.id, -1) }}>
                <Icon name="chevron-left" style={styles.iconUp} color={index == 0 ? theme['c-font-label'] : theme['c-button-font']} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} disabled={index == total - 1} onPress={() => { onMove(item.id, 1) }}>
                <Icon name="chevron-left" style={styles.iconDown} color={index == total - 1 ? theme['c-font-label'] : theme['c-button-font']} />
              </TouchableOpacity>
            </>
          ) : null
        }
        <TouchableOpacity style={styles.btn} onPress={handleRemove}>
          <Icon name="close" color={theme['c-button-font']} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export interface UserApiEditModalProps {
  onSave: (rules: string) => void
  // onSourceChange: SourceSelectorProps['onSourceChange']
}
export interface UserApiEditModalType {
  show: (rules: string) => void
}


export default () => {
  const userApiList = useUserApiList()
  const apiSource = useSettingValue('common.apiSource')
  const theme = useTheme()
  const t = useI18n()

  const handleRemove = useCallback(async(id: string, name: string) => {
    const confirm = await confirmDialog({
      message: global.i18n.t('user_api_remove_tip', { name }),
      cancelButtonText: global.i18n.t('cancel_button_text_2'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
      bgClose: false,
    })
    if (!confirm) return
    void removeUserApi([id]).finally(() => {
      if (settingState.setting['common.apiSource'] == id) {
        let backApiId = apiSourceInfo.find(api => !api.disabled)?.id
        if (!backApiId) backApiId = userApiState.list[0]?.id
        setApiSource(backApiId ?? '')
      }
    })
  }, [])
  const handleMove = useCallback((id: string, offset: number) => {
    void moveUserApi(id, offset)
  }, [])
  const handleChangeAllowShowUpdateAlert = useCallback((id: string, enabled: boolean) => {
    void setUserApiAllowShowUpdateAlert(id, enabled)
  }, [])

  return (
    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps={'always'}>
      <View onStartShouldSetResponder={() => true}>
        {
          userApiList.length
            ? userApiList.map((item, index) => {
              return (
              <ListItem
                key={item.id}
                item={item}
                index={index}
                total={userApiList.length}
                activeId={apiSource}
                onRemove={handleRemove}
                onMove={handleMove}
                onChangeAllowShowUpdateAlert={handleChangeAllowShowUpdateAlert}
              />
              )
            })
            : <Text style={styles.tipText} color={theme['c-font-label']}>{t('user_api_empty')}</Text>
        }
      </View>
    </ScrollView>
  )
}


const styles = createStyle({
  scrollView: {
    paddingHorizontal: 7,
    flexGrow: 0,
  },
  list: {
    paddingBottom: 15,
    flexDirection: 'column',
  },
  listItem: {
    padding: 10,
    borderRadius: BorderRadius.normal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemLeft: {
    paddingRight: 10,
    flex: 1,
    gap: 2,
  },
  listItemRight: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  // btns: {
  //   padding: 5,
  // },
  btn: {
    padding: 10,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconUp: {
    transform: [{ rotate: '90deg' }],
  },
  iconDown: {
    transform: [{ rotate: '-90deg' }],
  },
  tipText: {
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
})


