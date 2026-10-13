const app = getApp()
const mock = require('../../utils/mock')

const CATEGORIES = [
  { key: 'studio', name: '影棚背景', count: mock.STUDIO_TEMPLATES.length },
  { key: 'spec', name: '证件照规格', count: mock.ID_SPECS.length },
  { key: 'theme', name: '主题风格包', count: mock.THEME_PACKS.length },
  { key: 'sticker', name: '贴纸素材', count: mock.STICKERS.length }
]

Page({
  data: {
    categories: CATEGORIES,
    active: 'studio',
    studios: mock.STUDIO_TEMPLATES,
    specs: mock.ID_SPECS,
    themes: mock.THEME_PACKS,
    stickers: mock.STICKERS,
    stickerPacks: ['全部'],
    activePack: '全部',
    visibleStickers: mock.STICKERS
  },

  onLoad() {
    const packs = ['全部']
    mock.STICKERS.forEach((item) => {
      if (packs.indexOf(item.pack) === -1) packs.push(item.pack)
    })
    this.setData({ stickerPacks: packs })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(1)
    }
  },

  switchCategory(e) {
    this.setData({ active: e.currentTarget.dataset.key })
  },

  switchPack(e) {
    const pack = e.currentTarget.dataset.pack
    this.setData({
      activePack: pack,
      visibleStickers: pack === '全部' ? mock.STICKERS : mock.STICKERS.filter((item) => item.pack === pack)
    })
  },

  /** F-STU-01 一键套用 */
  useStudio(e) {
    if (!app.ensureAgreement()) return
    const template = this.data.studios.find((item) => item.id === e.currentTarget.dataset.id)
    app.globalData.activeTemplate = template
    if (!app.globalData.sourcePhoto) {
      wx.showModal({
        title: '还差一张人像照',
        content: '影棚模板需要先有你的照片：可以直接拍摄，也可以从相册导入。',
        confirmText: '去拍摄',
        cancelText: '相册导入',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/camera/index' })
          else {
            wx.chooseMedia({
              count: 1,
              mediaType: ['image'],
              sourceType: ['album'],
              success: (choose) => {
                app.globalData.sourcePhoto = choose.tempFiles[0].tempFilePath
                app.globalData.sourceFrom = 'album'
                wx.navigateTo({ url: `/pages/editor/index?templateId=${template.id}` })
              }
            })
          }
        }
      })
      return
    }
    wx.navigateTo({ url: `/pages/editor/index?templateId=${template.id}` })
  },

  /** F-ID-01 规格库：选中后进入证件照工作台 */
  useSpec(e) {
    if (!app.ensureAgreement()) return
    const spec = this.data.specs.find((item) => item.id === e.currentTarget.dataset.id)
    app.globalData.activeSpec = spec
    if (!app.globalData.sourcePhoto) {
      wx.showModal({
        title: `已选择「${spec.name}」`,
        content: '证件照需要一张正面人像：建议现场拍摄，光线更均匀。',
        confirmText: '去拍摄',
        cancelText: '相册导入',
        success: (res) => {
          if (res.confirm) wx.switchTab({ url: '/pages/camera/index' })
          else {
            wx.chooseMedia({
              count: 1,
              mediaType: ['image'],
              sourceType: ['album'],
              success: (choose) => {
                app.globalData.sourcePhoto = choose.tempFiles[0].tempFilePath
                app.globalData.sourceFrom = 'album'
                wx.navigateTo({ url: '/pages/idphoto/index' })
              }
            })
          }
        }
      })
      return
    }
    wx.navigateTo({ url: '/pages/idphoto/index' })
  },

  /** F-EDT-02 主题风格包：需要已有照片再套用 */
  useTheme(e) {
    const theme = this.data.themes.find((item) => item.id === e.currentTarget.dataset.id)
    app.globalData.activeTheme = theme
    if (!app.globalData.sourcePhoto) {
      wx.showToast({ title: '先拍一张或导入照片', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/editor/index?themeId=' + theme.id })
  },

  /** F-EDT-01 贴纸：提示可在编辑器中添加 */
  tapSticker(e) {
    const sticker = this.data.visibleStickers.find((item) => item.id === e.currentTarget.dataset.id)
    wx.showModal({
      title: `贴纸「${sticker.text}」`,
      content: '贴纸可在编辑器里添加、拖动和删除。是否立刻进入编辑器？',
      confirmText: '进入编辑器',
      success: (res) => {
        if (res.confirm) {
          if (!app.globalData.sourcePhoto) {
            wx.showToast({ title: '请先拍摄或导入照片', icon: 'none' })
            return
          }
          app.globalData.pendingSticker = sticker
          wx.navigateTo({ url: '/pages/editor/index?stickerId=' + sticker.id })
        }
      }
    })
  }
})
