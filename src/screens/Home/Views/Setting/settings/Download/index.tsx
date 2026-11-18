import { memo, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import CheckBox from '@/components/common/CheckBox'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import Button from '../../components/Button'
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

const FILE_NAMES = ['歌名 - 歌手', '歌手 - 歌名', '歌名'] as const
const FILE_NAME_LABELS = {
  '歌名 - 歌手': 'setting_download_file_name_name_singer',
  '歌手 - 歌名': 'setting_download_file_name_singer_name',
  歌名: 'setting_download_file_name_name',
} as const
const FileNameItem = ({ value, label }: { value: typeof FILE_NAMES[number], label: string }) => {
  const fileName = useSettingValue('download.fileName')
  return <CheckBox marginRight={8} check={fileName == value} label={label} onChange={() => { updateSetting({ 'download.fileName': value }) }} need />
}

const SavePath = () => {
  const t = useI18n()
  const theme = useTheme()
  const customPath = useSettingValue('download.savePath')
  const savePath = customPath || getDefaultSavePath()
  const choosePathRef = useRef<ChoosePathType>(null)
  // 选择目录组件按需挂载，避免设置页一打开就加载
  const [visible, setVisible] = useState(false)

  const handleChoose = () => {
    const show = () => choosePathRef.current?.show({ title: t('setting_download_save_path_choose'), dirOnly: true })
    if (visible) show()
    else {
      setVisible(true)
      requestAnimationFrame(show)
    }
  }
  const handleConfirm = (path: string) => {
    updateSetting({ 'download.savePath': path })
  }
  const handleReset = () => {
    updateSetting({ 'download.savePath': '' })
  }

  return (
    <SubTitle title={t('setting_download_save_path')}>
      <Text size={13} color={theme['c-font-label']}>{savePath}</Text>
      <Text size={12} color={theme['c-font-label']} style={styles.tip}>{t('setting_download_save_path_tip')}</Text>
      <View style={styles.btns}>
        <Button onPress={handleChoose}>{t('setting_download_save_path_change')}</Button>
        {customPath ? <Button onPress={handleReset}>{t('setting_download_save_path_reset')}</Button> : null}
      </View>
      {visible ? <ChoosePath ref={choosePathRef} onConfirm={handleConfirm} /> : null}
    </SubTitle>
  )
}

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_download')}>
      <SavePath />
      <SubTitle title={t('setting_download_file_name')}>
        <View style={styles.list}>
          {FILE_NAMES.map(name => <FileNameItem key={name} value={name} label={t(FILE_NAME_LABELS[name])} />)}
        </View>
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
  tip: {
    marginTop: 3,
  },
  btns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  item: {
    marginTop: 5,
    marginBottom: 10,
  },
})
