/**
 * 本地存储封装 —— 小程序端所有数据默认只落本机（F-ACC-03 本地隐私模式）
 * 正式环境接入后端后，把这里替换成 wx.request 即可。
 */
const KEYS = {
  user: 'ap_user',
  agreements: 'ap_agreements',
  privacy: 'ap_privacy',
  member: 'ap_member',
  quota: 'ap_quota',
  works: 'ap_works',
  drafts: 'ap_drafts',
  orders: 'ap_orders',
  seeded: 'ap_seeded',
  freq: 'ap_freq'
}

function todayStr() {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' || value === undefined || value === null ? fallback : value
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    wx.showToast({ title: '本地存储写入失败', icon: 'none' })
  }
}

/** 首次启动写入演示数据 */
function ensureSeed() {
  if (read(KEYS.seeded, false)) return
  const mock = require('./mock')
  write(KEYS.agreements, { portrait: false, privacy: false, service: false, signedAt: '' })
  write(KEYS.privacy, { localMode: true, cloudAllowed: false, faceFeatureSaved: false, autoCleanDays: 7, upCount: 0 })
  write(KEYS.freq, { date: todayStr(), count: 0 })
  write(KEYS.member, { active: false, planId: '', planName: '', expireAt: '', benefits: [] })
  write(KEYS.quota, mock.SEED_QUOTA)
  write(KEYS.works, mock.SEED_WORKS)
  write(KEYS.orders, mock.SEED_ORDERS)
  write(KEYS.drafts, [])
  write(KEYS.seeded, true)
}

module.exports = {
  KEYS,
  ensureSeed,

  /* ---------------- 账号 ---------------- */
  getUser: () => read(KEYS.user, null),
  setUser: (user) => write(KEYS.user, user),

  getAgreements: () => read(KEYS.agreements, { portrait: false, privacy: false, service: false, signedAt: '' }),
  signAgreement(type) {
    const current = read(KEYS.agreements, {})
    current[type] = true
    current.signedAt = new Date().toLocaleString('zh-CN')
    write(KEYS.agreements, current)
    return current
  },

  /* ---------------- 隐私 ---------------- */
  getPrivacy: () => read(KEYS.privacy, { localMode: true, cloudAllowed: false, faceFeatureSaved: false, autoCleanDays: 7, upCount: 0 }),
  setPrivacy: (privacy) => write(KEYS.privacy, privacy),

  /* ---------------- F-ID / F-OUT 每日频次（默认 5 张，仅本机统计） ---------------- */
  getFreq() {
    const today = todayStr()
    const freq = read(KEYS.freq, { date: today, count: 0 })
    if (freq.date !== today) {
      const reset = { date: today, count: 0 }
      write(KEYS.freq, reset)
      return reset
    }
    return freq
  },
  bumpFreq() {
    const today = todayStr()
    const freq = module.exports.getFreq()
    const next = { date: today, count: (freq.count || 0) + 1 }
    write(KEYS.freq, next)
    return next
  },

  /* ---------------- F-CLD-02 云端上行计数（仅本机统计，断网也如实展示） ---------------- */
  bumpUpCount() {
    const privacy = read(KEYS.privacy, {})
    privacy.upCount = (privacy.upCount || 0) + 1
    write(KEYS.privacy, privacy)
    return privacy.upCount
  },

  /* ---------------- 会员与额度 ---------------- */
  getMember: () => read(KEYS.member, { active: false, planId: '', planName: '', expireAt: '', benefits: [] }),
  setMember: (member) => write(KEYS.member, member),

  getQuota: () => read(KEYS.quota, 0),
  setQuota: (value) => write(KEYS.quota, value),

  setAgreements: (agreements) => write(KEYS.agreements, agreements),

  /* ---------------- 作品（导出记录：只存元信息） ---------------- */
  getWorks: () => read(KEYS.works, []),
  addWork(work) {
    const list = read(KEYS.works, [])
    list.unshift(work)
    write(KEYS.works, list.slice(0, 60))
    return list
  },
  removeWork(id) {
    const list = read(KEYS.works, []).filter((item) => item.id !== id)
    write(KEYS.works, list)
    return list
  },
  updateWork(id, patch) {
    const list = read(KEYS.works, []).map((item) => (item.id === id ? Object.assign({}, item, patch) : item))
    write(KEYS.works, list)
    return list
  },
  clearWorks() {
    write(KEYS.works, [])
    return []
  },

  /* ---------------- 草稿（F-EDT-03 临时暂存） ---------------- */
  getDrafts: () => read(KEYS.drafts, []),
  saveDraft(draft) {
    const list = read(KEYS.drafts, [])
    const index = list.findIndex((item) => item.id === draft.id)
    if (index > -1) list[index] = draft
    else list.unshift(draft)
    write(KEYS.drafts, list.slice(0, 20))
    return list
  },
  removeDraft(id) {
    const list = read(KEYS.drafts, []).filter((item) => item.id !== id)
    write(KEYS.drafts, list)
    return list
  },
  clearDrafts() {
    write(KEYS.drafts, [])
    return []
  },

  /* ---------------- 订单 ---------------- */
  getOrders: () => read(KEYS.orders, []),
  addOrder(order) {
    const list = read(KEYS.orders, [])
    list.unshift(order)
    write(KEYS.orders, list)
    return list
  },
  updateOrder(id, patch) {
    const list = read(KEYS.orders, []).map((item) => (item.id === id ? Object.assign({}, item, patch) : item))
    write(KEYS.orders, list)
    return list
  }
}
