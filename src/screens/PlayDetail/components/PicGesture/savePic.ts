import RNFS from 'react-native-fs'
import { downloadFile, externalStorageDirectoryPath } from '@/utils/fs'
import { filterFileName } from '@/utils/common'
import { requestStoragePermission, toast } from '@/utils/tools'
import { log } from '@/utils/log'

const getSaveDir = () => `${externalStorageDirectoryPath}/Pictures/lx-music`

const getExt = (url: string) => {
  const ext = /\.(jpe?g|png|webp|gif|bmp)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase()
  return ext == 'jpeg' ? 'jpg' : ext ?? 'jpg'
}

/**
 * 把封面图保存到 Pictures/lx-music 目录，并通知系统相册刷新
 */
export const savePic = async(pic: string, musicInfo: { name: string, singer: string }) => {
  const t = global.i18n.t
  if (!await requestStoragePermission()) {
    toast(t('play_detail_pic_save_no_permission'))
    return
  }
  const dir = getSaveDir()
  const isLocal = pic.startsWith('/') || pic.startsWith('file://')
  const name = filterFileName(`${musicInfo.name} - ${musicInfo.singer}`).trim() || `cover_${Date.now()}`
  const path = `${dir}/${name}.${getExt(pic)}`
  try {
    if (!await RNFS.exists(dir)) await RNFS.mkdir(dir)
    if (isLocal) {
      const from = pic.replace(/^file:\/\//, '')
      if (await RNFS.exists(path)) await RNFS.unlink(path)
      await RNFS.copyFile(from, path)
    } else {
      const { promise } = downloadFile(pic, path, { connectionTimeout: 15000, readTimeout: 20000 })
      const result = await promise
      if (result.statusCode < 200 || result.statusCode >= 300) {
        await RNFS.unlink(path).catch(() => {})
        throw new Error(`HTTP ${result.statusCode}`)
      }
    }
    await RNFS.scanFile(path).catch(() => {})
    toast(t('play_detail_pic_save_success', { path }), 'long')
  } catch (err: any) {
    log.error('save pic failed', err)
    toast(t('play_detail_pic_save_failed'))
  }
}
