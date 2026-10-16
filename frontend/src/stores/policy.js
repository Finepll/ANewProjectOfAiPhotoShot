import { defineStore } from 'pinia'
import { loginPolicy } from '../mock'

/**
 * 登录与安全策略。放在 store 里让各页面共用同一份值，而不是每页各持一个副本。
 *
 * 原先这些字段只在「管理员与权限」页里被一份 reactive 副本接住：
 * 改完只有本页的提示会变，别处的文案不动——
 *   ·「操作审计」页照旧写「日志保留 180 天」「180 天保留」；
 *   ·「模板与素材」页照旧写「版本记录留痕 180 天」；
 * 于是同一系统里同时声称保留 30 天和 180 天。
 */
export const usePolicyStore = defineStore('policy', {
  state: () => ({ ...loginPolicy, forceConfirm: true }),
  getters: {
    /** 「180 天」这类文案统一从这里取，避免各页各写一个数字 */
    retentionText: (state) => `${state.auditRetentionDays} 天`
  },
  actions: {
    save(patch = {}) {
      Object.assign(this, patch)
    }
  }
})
