const app = getApp()
const store = require('../../utils/store')

const DEMO_CODE = '888888'

Page({
  data: {
    phone: '',
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

  onPhone(e) {
    this.setData({ phone: e.detail.value.replace(/\D/g, '').slice(0, 11) })
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
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入 11 位手机号', icon: 'none' })
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
    const phone = this.data.phone
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入 11 位手机号', icon: 'none' })
      return
    }
    if (!/^\d{6}$/.test(this.data.code)) {
      wx.showToast({ title: '请输入 6 位验证码', icon: 'none' })
      return
    }
    if (this.data.code !== DEMO_CODE && this.data.code !== '123456') {
      wx.showToast({ title: '验证码不正确（演示用 888888）', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先勾选并同意协议', icon: 'none' })
      return
    }
    this.setData({ logging: true })
    setTimeout(() => {
      const isNew = !store.getUser()
      const user = {
        id: 'U' + phone.slice(-6),
        phone,
        phoneMask: phone.slice(0, 3) + '****' + phone.slice(-4),
        nickname: isNew ? '影友 ' + phone.slice(-4) : (store.getUser() || {}).nickname || '影友 ' + phone.slice(-4),
        avatarText: phone.slice(-2, -1),
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
