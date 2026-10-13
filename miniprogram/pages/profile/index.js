const app = getApp()
const store = require('../../utils/store')
const mock = require('../../utils/mock')

Page({
  data: {
    user: null,
    member: null,
    quota: 0,
    privacy: null,
    agreements: null,
    privacyItems: mock.PRIVACY_ITEMS.map((item) =>
      Object.assign({}, item, { tagClass: item.risk.indexOf('高') > -1 ? 'tag--ink' : 'tag--tan' })
    ),
    cleanDays: [1, 3, 7, 30],
    cleanIndex: 2,
    storage: '0 KB',
    drafts: [],
    showDrafts: false,
    version: 'V3.4 · 小程序端演示版'
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(4)
    }
    this.refresh()
  },

  refresh() {
    app.refreshGlobal()
    const privacy = app.globalData.privacy || {}
    const days = this.data.cleanDays
    const index = Math.max(0, days.indexOf(privacy.autoCleanDays || 7))
    let size = '0 KB'
    try {
      const info = wx.getStorageInfoSync()
      size = info.currentSize >= 1024 ? (info.currentSize / 1024).toFixed(2) + ' MB' : info.currentSize + ' KB'
    } catch (e) {
      size = '—'
    }
    this.setData({
      user: app.globalData.user,
      member: app.globalData.member,
      quota: app.globalData.quota,
      privacy,
      agreements: app.globalData.agreements,
      cleanIndex: index,
      storage: size,
      drafts: store.getDrafts()
    })
  },

  /* ---------------- F-ACC-01 登录 ---------------- */
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  logout() {
    wx.showModal({
      title: '退出登录？',
      content: '退出后本机保存的额度与会员状态仍会保留，重新登录即可恢复。',
      success: (res) => {
        if (!res.confirm) return
        store.setUser(null)
        this.refresh()
        wx.showToast({ title: '已退出', icon: 'none' })
      }
    })
  },

  /* ---------------- F-ACC-03 / F-ACC-04 隐私 ---------------- */
  toggleLocalMode(e) {
    const privacy = Object.assign({}, this.data.privacy, { localMode: e.detail.value })
    store.setPrivacy(privacy)
    app.refreshGlobal()
    this.setData({ privacy })
    wx.showToast({
      title: e.detail.value ? '已开启本地隐私模式' : '已关闭，注意上行风险',
      icon: 'none'
    })
  },

  toggleCloud(e) {
    if (e.detail.value && !app.ensureAgreement()) {
      this.setData({ 'privacy.cloudAllowed': false })
      return
    }
    const privacy = Object.assign({}, this.data.privacy, { cloudAllowed: e.detail.value })
    store.setPrivacy(privacy)
    app.refreshGlobal()
    this.setData({ privacy })
    if (e.detail.value) {
      wx.showModal({
        title: '云增强授权说明',
        content: '授权后每次云增强仍会逐次确认：本次将上行 1 张图片、仅用于本次生成、结果回传后立即删除。你可随时在此撤回。',
        showCancel: false
      })
    }
  },

  toggleFaceFeature(e) {
    if (e.detail.value) {
      wx.showModal({
        title: '确认保留人脸特征？',
        content: '人脸特征属敏感信息，默认不保存。开启后特征只存本机、不随账号同步；关闭时会立即清除。',
        confirmText: '仍要开启',
        success: (res) => {
          if (!res.confirm) {
            this.setData({ 'privacy.faceFeatureSaved': false })
            return
          }
          const privacy = Object.assign({}, this.data.privacy, { faceFeatureSaved: true })
          store.setPrivacy(privacy)
          this.setData({ privacy })
        }
      })
      return
    }
    const privacy = Object.assign({}, this.data.privacy, { faceFeatureSaved: false })
    store.setPrivacy(privacy)
    this.setData({ privacy })
    wx.showToast({ title: '已清除本机人脸特征', icon: 'none' })
  },

  onCleanDays(e) {
    const index = Number(e.detail.value)
    const days = this.data.cleanDays[index]
    const privacy = Object.assign({}, this.data.privacy, { autoCleanDays: days })
    store.setPrivacy(privacy)
    this.setData({ privacy, cleanIndex: index })
    wx.showToast({ title: `临时文件 ${days} 天后清理`, icon: 'none' })
  },

  cleanAll() {
    wx.showModal({
      title: '一键清理',
      content: '将清理临时成品、导出记录、暂存工程与人脸特征，不留可访问残留；已保存到相册的照片需你自行删除。',
      confirmText: '立即清理',
      success: (res) => {
        if (!res.confirm) return
        store.clearWorks()
        store.clearDrafts()
        const privacy = Object.assign({}, this.data.privacy, { faceFeatureSaved: false, upCount: 0 })
        store.setPrivacy(privacy)
        app.refreshGlobal()
        this.refresh()
        wx.showToast({ title: '已清理，无残留', icon: 'success' })
      }
    })
  },

  openDrafts() {
    this.refresh()
    this.setData({ showDrafts: true })
  },

  closeDrafts() {
    this.setData({ showDrafts: false })
  },

  removeDraft(e) {
    store.removeDraft(e.currentTarget.dataset.id)
    this.refresh()
  },

  clearDrafts() {
    store.clearDrafts()
    this.refresh()
    wx.showToast({ title: '已清空暂存', icon: 'none' })
  },

  /* ---------------- 跳转 ---------------- */
  goMember() {
    wx.navigateTo({ url: '/pages/member/index' })
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  goAgreement(e) {
    const type = e.currentTarget.dataset.type || 'portrait'
    wx.navigateTo({ url: '/pages/agreement/index?type=' + type })
  },

  goCamera() {
    wx.switchTab({ url: '/pages/camera/index' })
  },

  noop() {}
})
