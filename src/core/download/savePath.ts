import settingState from '@/store/setting/state'
import { externalStorageDirectoryPath } from '@/utils/fs'

export const getDefaultSavePath = () => `${externalStorageDirectoryPath}/Music/lx-music`
export const getSavePath = () => settingState.setting['download.savePath'] || getDefaultSavePath()
