import settingState from '@/store/setting/state'
import { state as userApiState } from '@/store/userApi/state'
import { setApiSource } from './apiSource'
import { toast } from '@/utils/tools'

const isUserApi = (id: string) => /^user_api/.test(id)

// 同一时间只允许一次切换，其它失败的请求等待切换完成后用新源重试
let switchingPromise: Promise<boolean> | null = null

const switchTo = async(id: string): Promise<boolean> => {
  setApiSource(id)
  return global.lx.apiInitPromise[0]
}

const switchWithLock = async(id: string): Promise<boolean> => {
  const promise: Promise<boolean> = switchTo(id).catch(() => false).finally(() => {
    if (switchingPromise == promise) switchingPromise = null
  })
  switchingPromise = promise
  return promise
}

/**
 * 按自定义源列表顺序，找到 currentId 之后第一个还没试过的源
 */
const getNextUserApiId = (currentId: string, tried: Set<string>): string | null => {
  const list = userApiState.list
  if (!list.length) return null
  const index = list.findIndex(api => api.id == currentId)
  for (let i = 1; i <= list.length; i++) {
    const api = list[(index + i) % list.length]
    if (!tried.has(api.id)) return api.id
  }
  return null
}

const getUserApiName = (id: string) => userApiState.list.find(api => api.id == id)?.name ?? id

/**
 * 获取播放链接失败时，自动切换到下一个自定义源再试。
 * 只在当前使用的是自定义源、且开启了自动切换时生效。
 * 全部失败后切回最初的源，并抛出最初的错误。
 */
export const withUserApiFallback = async<T>(run: () => Promise<T>): Promise<T> => {
  const originId = settingState.setting['common.apiSource']
  const tried = new Set<string>()
  let firstError: unknown = null

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const usedId = settingState.setting['common.apiSource']
    try {
      return await run()
    } catch (err) {
      if (firstError == null) firstError = err
      if (!settingState.setting['common.userApiAutoSwitch'] || !isUserApi(usedId) || userApiState.list.length < 2) throw err
      tried.add(usedId)
    }

    // 其它请求正在切换源，等它切完
    if (switchingPromise) await switchingPromise.catch(() => false)

    const currentId = settingState.setting['common.apiSource']
    // 已经被别的请求切到了一个还没试过的源，直接用它重试
    if (currentId != usedId && isUserApi(currentId) && !tried.has(currentId) && global.lx.apiInitPromise[1]) continue

    let switched = false
    let nextId = getNextUserApiId(usedId, tried)
    while (nextId) {
      console.log('user api fallback, toggle to:', nextId)
      const ok = await switchWithLock(nextId)
      if (ok && settingState.setting['common.apiSource'] == nextId) {
        switched = true
        toast(global.i18n.t('user_api_auto_switch_tip', { name: getUserApiName(nextId) }))
        break
      }
      tried.add(nextId)
      nextId = getNextUserApiId(nextId, tried)
    }

    if (!switched) {
      // 所有自定义源都失败了，切回原来的源
      if (settingState.setting['common.apiSource'] != originId && userApiState.list.some(api => api.id == originId)) {
        void switchTo(originId)
      }
      throw firstError
    }
  }
}
