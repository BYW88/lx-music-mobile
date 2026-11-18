import { useRef } from 'react'
import { type DownloadQualityModalType } from '@/components/DownloadQualityModal'
import { startDownloadTasks } from '@/core/download'
import { useI18n } from '@/lang'
import { toast } from '@/utils/tools'
import { useDownloadInfo } from './useDownloadInfo'

const qualityLabelKeys = {
  '128k': 'download_quality_128k',
  '320k': 'download_quality_320k',
  flac: 'download_quality_flac',
  flac24bit: 'download_quality_flac24bit',
} as const

/**
 * 当前播放歌曲的下载菜单项：文字、是否可用，以及点击后的处理
 * 需要把返回的 qualityModalRef 绑定到页面里的 DownloadQualityModal 上
 */
export const useDownloadAction = () => {
  const t = useI18n()
  const downloadInfo = useDownloadInfo()
  const qualityModalRef = useRef<DownloadQualityModalType>(null)

  const getQualityLabel = (quality: LX.Quality) => {
    const key = qualityLabelKeys[quality as keyof typeof qualityLabelKeys]
    return key ? t(key) : quality
  }

  let label: string
  switch (downloadInfo.status) {
    case 'local': label = t('play_detail_download_local'); break
    case 'completed': label = t('play_detail_download_completed', { quality: getQualityLabel(downloadInfo.task!.metadata.quality) }); break
    case 'downloading': label = t('play_detail_download_running', { progress: Math.floor(downloadInfo.task!.progress) }); break
    case 'paused': label = t('play_detail_download_resume'); break
    default: label = t('download')
  }
  const disabled = !downloadInfo.musicInfo || downloadInfo.status == 'local' || downloadInfo.status == 'completed' || downloadInfo.status == 'downloading'
  /** 已下载过时可以再下载其他音质 */
  const canDownloadOther = downloadInfo.status == 'completed'

  const showQualityModal = () => {
    if (!downloadInfo.musicInfo) return
    qualityModalRef.current?.show({ list: [downloadInfo.musicInfo], listId: downloadInfo.listId ?? undefined })
  }

  const download = () => {
    if (downloadInfo.status == 'paused') {
      startDownloadTasks([downloadInfo.task!.id])
      toast(t('play_detail_download_resumed'))
    } else showQualityModal()
  }

  return { downloadInfo, label, disabled, canDownloadOther, download, downloadOther: showQualityModal, qualityModalRef }
}
