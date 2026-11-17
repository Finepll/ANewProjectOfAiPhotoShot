const app = getApp()
const store = require('../../utils/store')

const DEMO_CODE = '888888'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 由邮箱生成稳定的用户 ID：同一邮箱每次登录都得到同一个号，不依赖注册顺序。 */
function userIdOf(email) {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  return 'U' + hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)
}

/** 邮箱脱敏：保留前两位与完整域名，中间用星号。 */
function maskEmail(email) {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const name = email.slice(0, at)
  return (name.length <= 2 ? name : name.slice(0, 2) + '***') + email.slice(at)
}

Page({
  data: {
    email: '',
    code: '',
    agreed: false,
    counting: 0,
    sending: false,
    logging: false
  },

  onLoad() {
    const agreements = store.getAgreements()
    this.setData({ agreed: !!(agreements.portrait && agreements.privacy && agreements.service) })
  },

  onUnload() {
    this.clearTimer()
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onEmail(e) {
    this.setData({ email: e.detail.value.replace(/\s/g, '').slice(0, 64) })
  },

  onCode(e) {
    this.setData({ code: e.detail.value.replace(/\D/g, '').slice(0, 6) })
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  openDoc(e) {
    wx.navigateTo({ url: '/pages/agreement/index?type=' + e.currentTarget.dataset.type })
  },

  /* ---------------- F-ACC-01 获取验证码 ---------------- */
  sendCode() {
    if (this.data.counting > 0 || this.data.sending) return
    if (!EMAIL_RE.test(this.data.email)) {
      wx.showToast({ title: '请输入正确的邮箱地址', icon: 'none' })
      return
    }
    this.setData({ sending: true })
    setTimeout(() => {
      this.setData({ sending: false, counting: 60 })
      wx.showToast({ title: '演示验证码 ' + DEMO_CODE, icon: 'none' })
      this.clearTimer()
      this.timer = setInterval(() => {
        const next = this.data.counting - 1
        if (next <= 0) {
          this.clearTimer()
          this.setData({ counting: 0 })
          return
        }
        this.setData({ counting: next })
      }, 1000)
    }, 600)
  },

  /* ---------------- 登录（未注册自动注册） ---------------- */
  login() {
    const email = this.data.email
    if (!EMAIL_RE.test(email)) {
      wx.showToast({ title: '请输入正确的邮箱地址', icon: 'none' })
      return
    }
    if (!/^\d{6}$/.test(this.data.code)) {
      wx.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }
    if (this.data.code !== DEMO_CODE) {
      wx.showToast({ title: '验证码不正确（演示用 ' + DEMO_CODE + '）', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先勾选并同意协议', icon: 'none' })
      return
    }
    this.setData({ logging: true })
    setTimeout(() => {
      const prev = store.getUser()
      // 换邮箱登录属于新账号，不能沿用上一个账号的昵称。
      const isNew = !prev || prev.email !== email
      const local = email.slice(0, email.indexOf('@'))
      const user = {
        id: userIdOf(email),
        email,
        emailMask: maskEmail(email),
        nickname: isNew || !prev.nickname ? '影友 ' + local.slice(0, 4) : prev.nickname,
        avatarText: (local[0] || '影').toUpperCase(),
        createdAt: new Date().toLocaleString('zh-CN')
      }
      store.setUser(user)
      // 未签署过的协议在登录流程中一并落签（F-ACC-02）
      const agreements = store.getAgreements()
      if (!agreements.portrait) store.signAgreement('portrait')
      if (!agreements.privacy) store.signAgreement('privacy')
      if (!agreements.service) store.signAgreement('service')
      app.refreshGlobal()
      this.setData({ logging: false })
      wx.showToast({ title: isNew ? '注册并登录成功' : '登录成功', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) wx.navigateBack()
        else wx.switchTab({ url: '/pages/index/index' })
      }, 700)
    }, 700)
  },

  /** 仅签名协议，不登录 */
  signOnly() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先勾选协议', icon: 'none' })
      return
    }
    store.signAgreement('portrait')
    store.signAgreement('privacy')
    store.signAgreement('service')
    app.refreshGlobal()
    wx.showToast({ title: '已签署协议凭证', icon: 'success' })
  }
})
