const app = getApp()
const mock = require('../../utils/mock')
const store = require('../../utils/store')
const render = require('../../utils/render')

const BATCH_ITEMS = [
  { key: 'id-1', name: '一寸 × 8 拼版', desc: '6 寸相纸 · 295×413 ×8', kind: 'id', specId: 'SP-1', count: 8, checked: true },
  { key: 'id-2', name: '二寸 × 4 拼版', desc: '6 寸相纸 · 413×579 ×4', kind: 'id', specId: 'SP-2', count: 4, checked: true },
  { key: 'square', name: '社交头像方图', desc: '1080 × 1080', kind: 'square', checked: false },
  { key: 'poster', name: '长图海报', desc: '1080 × 1620 · 带主题署名', kind: 'poster', checked: false }
]

Page({
  data: {
    mode: 'session',
    record: null,
    tempFilePath: '',
    title: '',
    subtitle: '',
    batchItems: BATCH_ITEMS,
    showBatch: false,
    generating: false,
    batchResults: [],
    saving: false
  },

  onLoad(options) {
    if (options && options.workId) {
      const record = store.getWorks().find((item) => item.id === options.workId)
      this.setData({
        mode: 'record',
        record: record || null,
        title: record ? record.title : '导出记录',
        subtitle: record ? `${record.createdAt} · ${record.destText || record.source}` : ''
      })
      return
    }
    const result = app.globalData.lastResult
    if (!result) {
      wx.showModal({
        title: '没有可查看的成品',
        content: '本次会话里还没有生成结果，先拍一张或做一张证件照吧。',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/camera/index' })
      })
      return
    }
    this.setData({
      mode: 'session',
      record: result,
      tempFilePath: result.tempFilePath,
      title: result.title,
      subtitle: `${result.width || ''} × ${result.height || ''} · ${result.source || '端侧生成'}`
    })
  },

  onReady() {
    this.initBatchCanvas()
  },

  /* ---------------- F-OUT-01 保存去向 ---------------- */
  saveToAlbum() {
    const filePath = this.data.tempFilePath
    if (!filePath) {
      wx.showToast({ title: '本次会话已结束', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    const done = () => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          this.setData({ saving: false })
          this.markSaved()
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: () => {
          this.setData({ saving: false })
          wx.showModal({
            title: '保存失败',
            content: '需要相册写入权限，请在设置中开启后重试。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting({})
            }
          })
        }
      })
    }
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          this.setData({ saving: false })
          wx.showModal({
            title: '未授权相册',
            content: '保存到系统相册需要相册写入权限。',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting({})
            }
          })
          return
        }
        if (res.authSetting['scope.writePhotosAlbum'] === undefined) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: done,
            fail: () => {
              this.setData({ saving: false })
              wx.showToast({ title: '已取消授权', icon: 'none' })
            }
          })
          return
        }
        done()
      },
      fail: done
    })
  },

  markSaved() {
    const record = this.data.record
    if (!record || !record.id || record.demo) return
    store.updateWork(record.id, { savedToAlbum: true, dest: 'album', destText: '已保存到相册' })
  },

  keepSandbox() {
    if (this.data.mode === 'record') {
      wx.showToast({ title: '已在临时暂存列表中', icon: 'none' })
      return
    }
    const record = this.data.record
    const next = Object.assign({}, record, {
      id: record.id || 'WK-' + Date.now(),
      savedToAlbum: false,
      dest: 'sandbox',
      destText: '临时暂存（24 小时）',
      layout: record.layout || record.title
    })
    store.addWork(next)
    wx.showToast({ title: '已临时暂存 24 小时', icon: 'success' })
  },

  /* ---------------- F-OUT-02 多份交付 ---------------- */
  openBatch() {
    this.setData({ showBatch: true })
  },

  closeBatch() {
    this.setData({ showBatch: false })
  },

  toggleBatchItem(e) {
    const key = e.currentTarget.dataset.key
    const list = this.data.batchItems.map((item) => (item.key === key ? Object.assign({}, item, { checked: !item.checked }) : item))
    this.setData({ batchItems: list })
  },

  checkedCount() {
    return this.data.batchItems.filter((item) => item.checked).length
  },

  initBatchCanvas() {
    wx.createSelectorQuery()
      .select('#batch')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        this.batchCanvas = res[0].node
        this.batchCtx = this.batchCanvas.getContext('2d')
      })
  },

  generateBatch() {
    const checked = this.data.batchItems.filter((item) => item.checked)
    if (!checked.length) {
      wx.showToast({ title: '至少勾选一份', icon: 'none' })
      return
    }
    if (!this.data.tempFilePath) {
      wx.showToast({ title: '本次会话已结束', icon: 'none' })
      return
    }
    if (!this.batchCanvas) {
      this.initBatchCanvas()
      setTimeout(() => this.generateBatch(), 300)
      return
    }
    const freq = store.getFreq()
    const idCount = checked.filter((item) => item.kind === 'id').length
    if (idCount > 0 && freq.count + idCount > 5) {
      wx.showToast({ title: '今日证件照频次不足', icon: 'none' })
      return
    }
    this.setData({ generating: true, showBatch: false, batchResults: [] })
    this.renderQueue(checked, 0, [])
  },

  renderQueue(items, index, results) {
    if (index >= items.length) {
      const list = results.map((item) => Object.assign({}, item))
      this.setData({ generating: false, batchResults: list })
      wx.showToast({ title: `已生成 ${list.length} 份`, icon: 'none' })
      return
    }
    const item = items[index]
    this.renderOne(item)
      .then((file) => {
        const results2 = results.concat([file])
        this.setData({ batchResults: results2.map((it) => Object.assign({}, it)) })
        this.renderQueue(items, index + 1, results2)
      })
      .catch(() => {
        wx.showToast({ title: `${item.name} 生成失败`, icon: 'none' })
        this.renderQueue(items, index + 1, results)
      })
  },

  renderOne(item) {
    const canvas = this.batchCanvas
    const image = this.image || null
    const draw = (img) => {
      if (item.kind === 'id') return this.drawSheet(canvas, img, item)
      if (item.kind === 'square') return this.drawSquare(canvas, img)
      return this.drawPoster(canvas, img, item)
    }
    if (image) return Promise.resolve(draw(image))
    return render.loadImage(canvas, this.data.tempFilePath).then((img) => {
      this.image = img
      return draw(img)
    })
  },

  resetCanvas(canvas, width, height) {
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    return ctx
  },

  /** 6 寸相纸拼版（1200 × 1800 @300dpi）—— F-OUT-02 唯一拼版出口 */
  drawSheet(canvas, image, item) {
    const spec = mock.ID_SPECS.find((s) => s.id === item.specId) || mock.ID_SPECS[0]
    const W = 1200
    const H = 1800
    const ctx = this.resetCanvas(canvas, W, H)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    const cols = 2
    const rows = Math.ceil(item.count / cols)
    const marginX = 70
    const marginTop = 120
    const gap = 16
    const cellW = (W - marginX * 2 - gap * (cols - 1)) / cols
    const cellH = Math.min((H - marginTop - 150 - gap * (rows - 1)) / rows, cellW / spec.ratio)
    const useRatio = spec.ratio || 1
    let sw = image.width
    let sh = image.width / useRatio
    if (sh > image.height) {
      sh = image.height
      sw = image.height * useRatio
    }
    const sx = Math.max(0, (image.width - sw) / 2)
    const sy = Math.max(0, Math.min(image.height - sh, (image.height - sh) / 2 - image.height * 0.06))

    for (let i = 0; i < item.count; i += 1) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = marginX + col * (cellW + gap)
      const y = marginTop + row * (cellH + gap)
      ctx.drawImage(image, sx, sy, sw, sh, x, y, cellW, cellH)
      ctx.save()
      ctx.strokeStyle = 'rgba(62,54,48,0.35)'
      ctx.setLineDash([8, 8])
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, cellW, cellH)
      ctx.restore()
    }

    ctx.save()
    ctx.fillStyle = '#3E3630'
    ctx.font = '26px sans-serif'
    ctx.fillText(`AI 照相馆 · ${spec.name}拼版 · ${spec.mm} · 300dpi（${item.count} 张）`, marginX, H - 78)
    ctx.font = '22px sans-serif'
    ctx.fillStyle = '#6D6357'
    ctx.fillText('请沿虚线裁切；本版为一次拍摄·多份交付输出之一', marginX, H - 42)
    ctx.restore()

    return render.toTempFile(canvas, { width: W, height: H, destWidth: W, destHeight: H, quality: 0.95 }).then((tempFilePath) => {
      store.bumpFreq()
      return {
        key: item.key,
        name: item.name,
        desc: item.desc,
        tempFilePath,
        countText: `${item.count} 张 / 版`
      }
    })
  },

  drawSquare(canvas, image) {
    const S = 1080
    const ctx = this.resetCanvas(canvas, S, S)
    ctx.fillStyle = '#FCF7DF'
    ctx.fillRect(0, 0, S, S)
    const side = Math.min(image.width, image.height)
    const sx = (image.width - side) / 2
    const sy = Math.max(0, (image.height - side) / 2 - image.height * 0.05)
    ctx.drawImage(image, sx, sy, side, side, 40, 40, S - 80, S - 80)
    return render.toTempFile(canvas, { width: S, height: S, destWidth: S, destHeight: S, quality: 0.95 }).then((tempFilePath) => ({
      key: 'square',
      name: '社交头像方图',
      desc: '1080 × 1080',
      tempFilePath,
      countText: '1 张'
    }))
  },

  drawPoster(canvas, image, item) {
    const W = 1080
    const H = 1620
    const ctx = this.resetCanvas(canvas, W, H)
    ctx.fillStyle = '#FCF7DF'
    ctx.fillRect(0, 0, W, H)
    const photoH = H - 300
    const ratio = W / photoH
    let sw = image.width
    let sh = image.width / ratio
    let sy = image.height * 0.02
    if (sh > image.height) {
      sh = image.height
      sw = image.height * ratio
      sy = 0
    }
    ctx.drawImage(image, (image.width - sw) / 2, sy, sw, sh, 0, 0, W, photoH)
    ctx.save()
    ctx.fillStyle = '#3E3630'
    ctx.font = '40px sans-serif'
    ctx.fillText(this.data.title || 'AI 照相馆', 70, H - 170)
    ctx.font = '26px sans-serif'
    ctx.fillStyle = '#6D6357'
    ctx.fillText(`${new Date().toLocaleDateString('zh-CN')} · 端侧合成 · 未上云`, 70, H - 110)
    ctx.fillStyle = '#A79A8A'
    ctx.fillRect(70, H - 76, 240, 4)
    ctx.restore()
    return render.toTempFile(canvas, { width: W, height: H, destWidth: W, destHeight: H, quality: 0.95 }).then((tempFilePath) => ({
      key: item.key,
      name: item.name,
      desc: item.desc,
      tempFilePath,
      countText: '1 张'
    }))
  },

  saveBatchAll() {
    const list = this.data.batchResults
    if (!list.length) return
    this.setData({ saving: true })
    let index = 0
    const next = () => {
      if (index >= list.length) {
        this.setData({ saving: false })
        wx.showToast({ title: '已全部保存到相册', icon: 'success' })
        return
      }
      const item = list[index]
      index += 1
      wx.saveImageToPhotosAlbum({
        filePath: item.tempFilePath,
        success: next,
        fail: () => {
          this.setData({ saving: false })
          wx.showModal({
            title: '保存中断',
            content: '需要相册写入权限，请在设置中开启后重试。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting({})
            }
          })
        }
      })
    }
    next()
  },

  previewBatch(e) {
    const path = e.currentTarget.dataset.path
    wx.previewImage({ urls: this.data.batchResults.map((item) => item.tempFilePath), current: path })
  },

  editAgain() {
    const record = this.data.record || {}
    if (record.type === 'idphoto') {
      wx.redirectTo({ url: '/pages/idphoto/index' })
      return
    }
    wx.redirectTo({ url: `/pages/editor/index${app.globalData.activeTemplate ? '?templateId=' + app.globalData.activeTemplate.id : ''}` })
  },

  retake() {
    wx.switchTab({ url: '/pages/camera/index' })
  },

  goRecords() {
    wx.switchTab({ url: '/pages/works/index' })
  },

  noop() {}
})
