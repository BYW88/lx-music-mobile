import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import { createStyle, clipboardWriteText, toast } from '@/utils/tools'
import { sizeFormate } from '@/utils/common'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { getMusicFileInfo, type MusicFileInfo } from './getMusicFileInfo'

export interface MusicFileInfoModalType {
  show: (musicInfo: LX.Player.PlayMusic) => void
}

const qualityLabelKeys = {
  '128k': 'download_quality_128k',
  '320k': 'download_quality_320k',
  flac: 'download_quality_flac',
  flac24bit: 'download_quality_flac24bit',
} as const

interface Row {
  label: string
  value: string
  copyable?: boolean
}

export default forwardRef<MusicFileInfoModalType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [info, setInfo] = useState<MusicFileInfo | null>(null)
  const showIdRef = useRef(0)

  useImperativeHandle(ref, () => ({
    show(musicInfo) {
      const id = ++showIdRef.current
      setInfo(null)
      void getMusicFileInfo(musicInfo).then(info => {
        if (id == showIdRef.current) setInfo(info)
      }).catch(() => {})
      if (visible) dialogRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          dialogRef.current?.setVisible(true)
        })
      }
    },
  }))

  const getSourceName = (source: LX.Source) => source == 'local' ? t('music_file_info_source_local') : t(`source_${sourceNameType}_${source}`)

  const buildRows = (info: MusicFileInfo): Row[] => {
    const rows: Row[] = [
      { label: t('music_file_info_name'), value: info.name },
      { label: t('music_file_info_singer'), value: info.singer },
    ]
    if (info.albumName) rows.push({ label: t('music_file_info_album'), value: info.albumName })
    if (info.interval) rows.push({ label: t('music_file_info_interval'), value: info.interval })
    rows.push({
      label: t('music_file_info_source'),
      value: info.toggleSource ? t('music_file_info_source_toggled', { source: getSourceName(info.source), target: getSourceName(info.toggleSource) }) : getSourceName(info.source),
    })
    rows.push({ label: t('music_file_info_play_type'), value: t(`music_file_info_play_type_${info.playType}`) })
    if (info.quality) {
      const key = qualityLabelKeys[info.quality as keyof typeof qualityLabelKeys]
      rows.push({ label: t('music_file_info_quality'), value: key ? t(key) : info.quality })
    }
    if (info.ext) rows.push({ label: t('music_file_info_format'), value: info.ext.toUpperCase() })
    if (info.bitrate) rows.push({ label: t('music_file_info_bitrate'), value: info.bitrate })
    if (info.sizeBytes) rows.push({ label: t('music_file_info_size'), value: sizeFormate(info.sizeBytes) })
    else if (info.sizeText) rows.push({ label: t('music_file_info_size'), value: info.sizeText })
    if (info.cache) {
      const { contentLength, cachedBytes } = info.cache
      let value: string
      if (cachedBytes <= 0) value = t('music_file_info_cache_none')
      else if (contentLength > 0 && cachedBytes >= contentLength) value = t('music_file_info_cache_full')
      else if (contentLength > 0) value = t('music_file_info_cache_partial', { cached: sizeFormate(cachedBytes), progress: Math.floor(cachedBytes / contentLength * 100) })
      else value = sizeFormate(cachedBytes)
      rows.push({ label: t('music_file_info_cache'), value })
    }
    if (info.filePath) rows.push({ label: t('music_file_info_path'), value: info.filePath, copyable: true })
    else if (info.url) rows.push({ label: t('music_file_info_url'), value: info.url, copyable: true })
    return rows
  }

  const handleCopy = (value: string) => {
    clipboardWriteText(value)
    toast(t('copy_name_tip'))
  }

  return (
    visible
      ? (
          <Dialog ref={dialogRef} title={t('music_file_info_title')}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.main}>
              {
                info
                  ? buildRows(info).map(row => (
                      <View key={row.label} style={styles.row}>
                        <Text style={styles.label} size={13} color={theme['c-font-label']}>{row.label}</Text>
                        {
                          row.copyable
                            ? (
                                <TouchableOpacity style={styles.valueWrap} onLongPress={() => { handleCopy(row.value) }}>
                                  <Text size={13} selectable>{row.value}</Text>
                                  <Text size={11} color={theme['c-font-label']}>{t('music_file_info_copy_tip')}</Text>
                                </TouchableOpacity>
                              )
                            : <Text style={styles.valueWrap} size={13} selectable>{row.value}</Text>
                        }
                      </View>
                  ))
                  : <Text style={styles.loading} size={13} color={theme['c-font-label']}>{t('music_file_info_loading')}</Text>
              }
            </ScrollView>
          </Dialog>
        )
      : null
  )
})

const styles = createStyle({
  scroll: {
    flexGrow: 0,
    maxHeight: 460,
  },
  main: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 10,
    paddingBottom: 15,
    minWidth: 280,
    maxWidth: 360,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
  },
  label: {
    width: 72,
    flexShrink: 0,
  },
  valueWrap: {
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
})
