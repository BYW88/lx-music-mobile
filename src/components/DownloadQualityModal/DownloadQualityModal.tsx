import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createDownloadTasks, DOWNLOAD_QUALITYS } from '@/core/download'

export interface SelectInfo {
  list: LX.Music.MusicInfo[]
  listId?: string
}

export interface DownloadQualityModalProps {
  onAdded?: () => void
}
export interface DownloadQualityModalType {
  show: (info: SelectInfo) => void
}

const qualityLabelKeys = {
  '128k': 'download_quality_128k',
  '320k': 'download_quality_320k',
  flac: 'download_quality_flac',
  flac24bit: 'download_quality_flac24bit',
} as const

interface QualityItem {
  quality: typeof DOWNLOAD_QUALITYS[number]
  size: string | null
}

const getQualityItems = (list: LX.Music.MusicInfo[]): QualityItem[] => {
  const onlineList = list.filter(m => m.source != 'local')
  if (onlineList.length == 1) {
    const musicInfo = onlineList[0]
    const supported = global.lx.qualityList[musicInfo.source] ?? []
    const items = DOWNLOAD_QUALITYS
      .filter(q => musicInfo.meta._qualitys[q] && supported.includes(q))
      .map(q => ({ quality: q, size: musicInfo.meta._qualitys[q]?.size ?? null }))
    return items.length ? items : [{ quality: '128k', size: null }]
  }
  // 批量下载：列出全部音质，没有该音质的歌曲自动降级
  return DOWNLOAD_QUALITYS.map(q => ({ quality: q, size: null }))
}

export default forwardRef<DownloadQualityModalType, DownloadQualityModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo | null>(null)

  useImperativeHandle(ref, () => ({
    show(info) {
      setSelectInfo(info)
      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo(null)
    })
  }

  const handleSelect = (quality: LX.Quality) => {
    dialogRef.current?.setVisible(false)
    if (!selectInfo) return
    void createDownloadTasks(selectInfo.list, quality, selectInfo.listId).then(() => {
      onAdded?.()
    })
  }

  const isSingle = selectInfo?.list.length == 1
  const items = selectInfo ? getQualityItems(selectInfo.list) : []

  return (
    <Dialog ref={dialogRef} onHide={handleHide} title={t('download_quality_title')}>
      {
        selectInfo
          ? (
              <View style={styles.main}>
                <Text style={styles.tip} size={13} color={theme['c-font-label']} numberOfLines={2}>
                  {isSingle ? `${selectInfo.list[0].name} - ${selectInfo.list[0].singer}` : t('download_quality_multi_tip', { num: selectInfo.list.length })}
                </Text>
                {
                  [...items].reverse().map(item => (
                    <Button
                      key={item.quality}
                      style={{ ...styles.button, backgroundColor: theme['c-button-background'] }}
                      onPress={() => { handleSelect(item.quality) }}
                    >
                      <Text color={theme['c-button-font']}>{t(qualityLabelKeys[item.quality])}</Text>
                      {item.size ? <Text size={12} color={theme['c-font-label']}>{item.size}</Text> : null}
                    </Button>
                  ))
                }
              </View>
            )
          : null
      }
    </Dialog>
  )
})

const styles = createStyle({
  main: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 15,
    minWidth: 260,
  },
  tip: {
    textAlign: 'center',
    paddingTop: 10,
    paddingBottom: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 15,
    paddingRight: 15,
    marginBottom: 10,
    borderRadius: 4,
  },
})
