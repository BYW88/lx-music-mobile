import { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import CheckBox from '@/components/common/CheckBox'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { getDefaultSavePath } from '@/core/download'
import { useI18n } from '@/lang'

type BooleanKey = 'download.isEmbedPic' | 'download.isEmbedLyric' | 'download.isDownloadLrc' | 'download.skipExistFile' | 'download.isUseOtherSource'

const BoolItem = ({ settingKey, label }: { settingKey: BooleanKey, label: string }) => {
  const value = useSettingValue(settingKey)
  const handleChange = (check: boolean) => {
    requestAnimationFrame(() => {
      updateSetting({ [settingKey]: check })
    })
  }
  return (
    <View style={styles.item}>
      <CheckBoxItem check={value} onChange={handleChange} label={label} />
    </View>
  )
}

const MAX_NUMS = [1, 2, 3, 4, 5] as const
const MaxNumItem = ({ num }: { num: number }) => {
  const maxNum = useSettingValue('download.maxDownloadNum')
  const isActive = useMemo(() => maxNum == num, [maxNum, num])
  return <CheckBox marginRight={8} check={isActive} label={String(num)} onChange={() => { updateSetting({ 'download.maxDownloadNum': num }) }} need />
}

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath') || getDefaultSavePath()

  return (
    <Section title={t('setting_download')}>
      <SubTitle title={t('setting_download_save_path')}>
        <Text size={13} color={theme['c-font-label']}>{savePath}</Text>
      </SubTitle>
      <SubTitle title={t('setting_download_max_num')}>
        <View style={styles.list}>
          {MAX_NUMS.map(num => <MaxNumItem key={num} num={num} />)}
        </View>
      </SubTitle>
      <BoolItem settingKey="download.isEmbedPic" label={t('setting_download_embed_pic')} />
      <BoolItem settingKey="download.isEmbedLyric" label={t('setting_download_embed_lyric')} />
      <BoolItem settingKey="download.isDownloadLrc" label={t('setting_download_lrc')} />
      <BoolItem settingKey="download.skipExistFile" label={t('setting_download_skip_exist')} />
      <BoolItem settingKey="download.isUseOtherSource" label={t('setting_download_use_other_source')} />
    </Section>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    marginTop: 5,
    marginBottom: 10,
  },
})
