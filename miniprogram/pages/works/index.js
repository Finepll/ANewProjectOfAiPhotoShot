const app = getApp()
const store = require('../../utils/store')

Page({
  data: {
    tab: 'records',
    records: [],
    drafts: [],
    freq: { count: 0 },
    freqLeft: 5,
    storage: { size: '0 KB', keys: 0 },
    cache: { models: '32.6 MB', templates: '18.4 MB', temp: 0 },
    detail: null,
    showDetail: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(3)
    }
    app.refreshGlobal()
    this.refresh()
  },

  refresh() {
    const freq = store.getFreq()
    const drafts = store.getDrafts()
    let size = '0 KB'
    let keys = 0
    try {
      const info = wx.getStorageInfoSync()
      keys = info.keys ? info.keys.length : 0
      size = info.currentSize >= 1024 ? (info.currentSize / 1024).toFixed(2) + ' MB' : info.currentSize + ' KB'
    } catch (e) {
      size = '—'
    }
    this.setData({
      records: store.getWorks(),
      drafts,
      freq,
      freqLeft: Math.max(0, 5 - (freq.count || 0)),
      storage: { size, keys },
      cache: Object.assign({}, this.data.cache, { temp: drafts.length })
    })
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.records.find((item) => item.id === id)
    this.setData({ detail: record || null, showDetail: true })
  },

  closeDetail() {
    this.setData({ showDetail: false })
  },

  removeRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这条记录？',
      content: '记录删除后不可恢复；已保存到系统相册的照片不受影响。',
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return
        store.removeWork(id)
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  clearRecords() {
    if (!this.data.records.length) return
    wx.showModal({
      title: '清空全部导出记录？',
      content: '只清理元信息记录，不含任何图片；相册中的照片需要你自行删除。',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        store.clearWorks()
        this.refresh()
        wx.showToast({ title: '已清空', icon: 'none' })
      }
    })
  },

  cleanDrafts() {
    if (!this.data.drafts.length) {
      wx.showToast({ title: '没有暂存工程', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清理临时暂存？',
      content: '将删除全部暂存工程参数（不含照片），清理后不可恢复。',
      success: (res) => {
        if (!res.confirm) return
        store.clearDrafts()
        this.refresh()
        wx.showToast({ title: '已清理', icon: 'none' })
      }
    })
  },

  cleanTemp() {
    wx.showModal({
      title: '一键清理临时文件？',
      content: '清理沙盒中的临时成品、缩略图与模型缓存以外的中间产物，同时清空导出记录。',
      success: (res) => {
        if (!res.confirm) return
        store.clearWorks()
        store.clearDrafts()
        this.setData({ cache: Object.assign({}, this.data.cache, { temp: 0, models: '0 MB', templates: '0 MB' }) })
        this.refresh()
        wx.showToast({ title: '已清理，无残留', icon: 'success' })
      }
    })
  },

  goCamera() {
    wx.switchTab({ url: '/pages/camera/index' })
  },

  removeDraft(e) {
    const id = e.currentTarget.dataset.id
    store.removeDraft(id)
    this.refresh()
    wx.showToast({ title: '已删除暂存', icon: 'none' })
  },

  goCameraAgain() {
    wx.switchTab({ url: '/pages/camera/index' })
  },

  noop() {}
})
