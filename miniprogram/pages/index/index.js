const app = getApp()
const mock = require('../../utils/mock')
const store = require('../../utils/store')

Page({
  data: {
    user: null,
    quota: 5,
    member: null,
    privacy: null,
    templates: mock.STUDIO_TEMPLATES,
    hotTemplates: mock.STUDIO_TEMPLATES.filter((item) => item.hot),
    works: [],
    guides: mock.CAPTURE_GUIDES,
    guideIndex: 0
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(0)
    }
    app.refreshGlobal()
    this.setData({
      user: app.globalData.user,
      quota: app.globalData.quota,
      member: app.globalData.member,
      privacy: app.globalData.privacy,
      works: store.getWorks().slice(0, 3)
    })
    this.rotateGuide()
  },

  onHide() {
    if (this.guideTimer) clearInterval(this.guideTimer)
  },

  onUnload() {
    if (this.guideTimer) clearInterval(this.guideTimer)
  },

  rotateGuide() {
    if (this.guideTimer) clearInterval(this.guideTimer)
    this.guideTimer = setInterval(() => {
      this.setData({ guideIndex: (this.data.guideIndex + 1) % this.data.guides.length })
    }, 2600)
  },

  /** F-ACC-02：进入拍摄前校验协议 */
  goCamera() {
    if (!app.ensureAgreement()) return
    if (!app.ensureLogin()) return
    wx.switchTab({ url: '/pages/camera/index' })
  },

  goIdPhoto() {
    if (!app.ensureAgreement()) return
    wx.navigateTo({ url: '/pages/idphoto/index' })
  },

  goTemplates() {
    wx.switchTab({ url: '/pages/templates/index' })
  },

  goWorks() {
    wx.switchTab({ url: '/pages/works/index' })
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/index' })
  },

  goPrivacy() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  /** F-STU-01 影棚模板浏览与一键套用 */
  useTemplate(e) {
    if (!app.ensureAgreement()) return
    const id = e.currentTarget.dataset.id
    const template = this.data.templates.find((item) => item.id === id)
    app.globalData.activeTemplate = template
    if (!app.globalData.sourcePhoto) {
      wx.showModal({
        title: `已选择「${template.name}」`,
        content: '还需要一张人像照：可以直接拍摄，也可以从相册导入。',
        confirmText: '去拍摄',
        cancelText: '相册导入',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/camera/index' })
          else this.importFromAlbum()
        }
      })
      return
    }
    wx.navigateTo({ url: `/pages/editor/index?templateId=${template.id}` })
  },

  /** F-CAP-02 相册导入 */
  importFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles[0]
        app.globalData.sourcePhoto = file.tempFilePath
        app.globalData.sourceFrom = 'album'
        app.globalData.sourceMeta = { width: file.width, height: file.height, size: file.size }
        wx.navigateTo({ url: '/pages/editor/index' })
      },
      fail: () => {}
    })
  },

  openWork(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/result/index?workId=${id}` })
  }
})
