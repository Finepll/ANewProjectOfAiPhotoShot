const store = require('./utils/store')

App({
  globalData: {
    // 当前登录用户
    user: null,
    // F-ACC-02 协议与肖像权授权状态
    agreements: null,
    // F-ACC-03 / F-ACC-04 本地隐私模式与云端授权
    privacy: null,
    // 拍摄/导入得到的原图临时路径
    sourcePhoto: '',
    sourceFrom: '', // camera | album
    // 当前选中的模板 / 证件照规格
    activeTemplate: null,
    activeSpec: null,
    // 最近一次导出的成品（用于 result 页）
    lastResult: null,
    // 余额/额度（演示数据，正式环境由服务端下发）
    quota: 0
  },

  onLaunch() {
    store.ensureSeed()
    this.refreshGlobal()
  },

  onShow() {
    this.refreshGlobal()
  },

  refreshGlobal() {
    const user = store.getUser()
    const agreements = store.getAgreements()
    const privacy = store.getPrivacy()
    const member = store.getMember()
    this.globalData.user = user
    this.globalData.agreements = agreements
    this.globalData.privacy = privacy
    this.globalData.quota = store.getQuota()
    this.globalData.member = member
  },

  /** 需要登录态的页面在 onShow 里调用，未登录返回 false */
  ensureLogin(silent) {
    this.refreshGlobal()
    const logged = !!(this.globalData.user && this.globalData.user.phone)
    if (!logged && !silent) {
      wx.navigateTo({ url: '/pages/login/index' })
    }
    return logged
  },

  /** F-ACC-02：使用云端能力/提交作品前必须已完成肖像权授权 */
  ensureAgreement() {
    this.refreshGlobal()
    if (!this.globalData.agreements || !this.globalData.agreements.portrait) {
      wx.showModal({
        title: '需要肖像权授权',
        content: '首次使用需阅读并同意《肖像权使用与授权协议》，承诺仅使用本人照片。',
        confirmText: '去阅读',
        cancelText: '暂不使用',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/agreement/index?type=portrait' })
        }
      })
      return false
    }
    return true
  }
})
