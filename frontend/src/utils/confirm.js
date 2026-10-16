import { ElMessageBox } from 'element-plus'
import { usePolicyStore } from '../stores/policy'

/**
 * 高危操作的二次确认。
 *
 * 总开关是「管理员与权限 → 登录与安全策略」里的「强制二次确认（高危操作）」。
 * 接上之前，那个开关只出现在保存成功的提示语里：关掉之后再点封禁、删模板，
 * 弹窗照样弹，等于一个纯装饰的控件。这里让它真的说话。
 *
 * 返回值里带 `skipped`，是为了让调用方能在提示语里说明「这次没弹窗是策略要求」——
 * 否则用户点一下删除就删掉了，会以为是弹窗坏了。
 */
export async function confirmHighRisk(message, title, options = {}) {
  const policy = usePolicyStore()
  if (!policy.forceConfirm) return { ok: true, skipped: true }
  try {
    await ElMessageBox.confirm(message, title, options)
    return { ok: true, skipped: false }
  } catch (e) {
    /* 用户点了取消，或按 Esc 关掉 */
    return { ok: false, skipped: false }
  }
}

/** 拼在成功提示后面的一句说明，策略开着时为空串 */
export function skippedHint(skipped) {
  return skipped ? '（已按安全策略跳过二次确认）' : ''
}
