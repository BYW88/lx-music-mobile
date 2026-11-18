import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { TRY_QUALITYS_LIST } from '@/core/music/utils'

type QualitySettingKey = 'player.playQuality' | 'player.playQualityMobile'

const Item = ({ id, name, settingKey }: {
  id: LX.Quality
  name: string
  settingKey: QualitySettingKey
}) => {
  const q = useSettingValue(settingKey)
  const isActive = q == id
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ [settingKey]: id }) }} need />
}

const QualityList = ({ title, settingKey }: {
  title: string
  settingKey: QualitySettingKey
}) => {
  const playQualityList = useMemo(() => {
    return [...TRY_QUALITYS_LIST, '128k'].reverse() as LX.Quality[]
  }, [])

  return (
    <SubTitle title={title}>
      <View style={styles.list}>
        {
          playQualityList.map((q) => <Item name={q} id={q} key={q} settingKey={settingKey} />)
        }
      </View>
    </SubTitle>
  )
}

export default memo(() => {
  const t = useI18n()

  return (
    <>
      <QualityList title={t('setting_play_play_quality')} settingKey="player.playQuality" />
      <QualityList title={t('setting_play_play_quality_mobile')} settingKey="player.playQualityMobile" />
    </>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
