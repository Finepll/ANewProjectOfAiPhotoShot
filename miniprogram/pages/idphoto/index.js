const app = getApp()
const mock = require('../../utils/mock')
const store = require('../../utils/store')
const render = require('../../utils/render')

/** 常用用途 → 规格推荐（F-ID-01） */
const USAGES = ['简历', '报名表', '资格证', '驾驶证', '护照', '签证', '社保', '社交头像']

/** 规格缩略图按比例换算成固定高度下的宽度（WXSS 老版本不支持 aspect-ratio） */
const SPECS = mock.ID_SPECS.map((item) => Object.assign({}, item, { bw: Math.round(108 * item.ratio) }))

Page({
  data: {
    keyword: '',
    usages: USAGES,
    activeUsage: '',
    specs: SPECS,
    filtered: SPECS,
    recommendIds: [],
    activeSpec: SPECS[0],
    backdrops: [],
    activeBackdrop: mock.ID_BACKDROPS[0],
    customLocked: false,
    zoom: 1,
    headOffset: 0,
    checks: [],
    freqLeft: 5,
    ready: false,
    showDest: false,
    exporting: false
  },

  onLoad() {
    const preset = app.globalData.activeSpec
    const spec = preset || SPECS[0]
    // 规格是「一次性意图」：进入工作台即消费，避免影响后续普通拍摄的分流
    if (preset) app.globalData.activeSpec = null
    this.setData({ activeSpec: spec, activeUsage: (spec.usage || [])[0] || '' })
    this.refreshBackdrops(spec)
    this.refreshRecommend(spec)
    this.refreshFreq()
  },

  onReady() {
    this.initCanvas()
  },

  onUnload() {
    this.canvas = null
    this.ctx = null
    this.image = null
  },

  /* ---------------- F-ID-01 规格库与智能推荐 ---------------- */
  onKeyword(e) {
    const keyword = e.detail.value
    const list = this.data.specs.filter((item) => {
      const text = `${item.name}${item.mm}${(item.usage || []).join('')}`
      return !keyword || text.indexOf(keyword) > -1
    })
    this.setData({ keyword, filtered: list })
  },

  pickUsage(e) {
    const usage = e.currentTarget.dataset.usage
    const next = this.data.activeUsage === usage ? '' : usage
    const list = next
      ? this.data.specs.filter((item) => (item.usage || []).indexOf(next) > -1)
      : this.data.specs
    const id = next ? mock.SPEC_RECOMMEND[next] : ''
    this.setData({
      activeUsage: next,
      filtered: list,
      recommendIds: id ? [id] : []
    })
    if (id) {
      const hit = this.data.specs.find((item) => item.id === id)
      if (hit) this.pickSpec({ currentTarget: { dataset: { id: hit.id } } })
    }
  },

  refreshRecommend(spec) {
    const ids = []
    ;(spec.usage || []).forEach((usage) => {
      const id = mock.SPEC_RECOMMEND[usage]
      if (id && ids.indexOf(id) === -1) ids.push(id)
    })
    this.setData({ recommendIds: ids.slice(0, 3) })
  },

  pickSpec(e) {
    const id = e.currentTarget.dataset.id
    const spec = this.data.specs.find((item) => item.id === id)
    if (!spec) return
    app.globalData.activeSpec = spec
    this.setData({ activeSpec: spec })
    this.refreshBackdrops(spec)
    this.refreshRecommend(spec)
    this.resizeCanvas()
  },

  /* ---------------- F-ID-02 抠图与底色替换 ---------------- */
  refreshBackdrops(spec) {
    const formal = spec.id === 'SP-4'
    const list = formal ? mock.ID_BACKDROPS.filter((item) => item.formal) : mock.ID_BACKDROPS
    const active = list.find((item) => item.key === (this.data.activeBackdrop || {}).key) || list[0]
    this.setData({ backdrops: list, activeBackdrop: active, customLocked: formal })
  },

  pickBackdrop(e) {
    const key = e.currentTarget.dataset.key
    const backdrop = this.data.backdrops.find((item) => item.key === key)
    if (!backdrop) return
    this.setData({ activeBackdrop: backdrop })
    this.paint()
  },

  onCustomColor(e) {
    if (this.data.customLocked) return
    const hex = e.detail.value
    const list = this.data.backdrops.map((item) =>
      item.key === 'cream' ? Object.assign({}, item, { color: hex }) : item
    )
    this.setData({ backdrops: list })
    this.paint()
  },

  /* ---------------- F-ID-03 自动裁切与构图校正 ---------------- */
  onZoom(e) {
    this.setData({ zoom: e.detail.value })
    this.paint()
  },

  onHeadOffset(e) {
    this.setData({ headOffset: e.detail.value })
    this.paint()
  },

  evaluate() {
    const spec = this.data.activeSpec
    const zoom = this.data.zoom
    const headOffset = this.data.headOffset
    const range = spec.id === 'SP-6' ? [0.45, 0.68] : [0.55, 0.7]
    const head = Math.round((spec.headRatio + (zoom - 1) * 0.22) * 100)
    const headOk = head >= range[0] * 100 && head <= range[1] * 100
    const marginOk = headOffset >= -0.32 && headOffset <= 0.32
    const centerOk = Math.abs(zoom - 1) <= 0.35
    this.setData({
      checks: [
        {
          key: 'head',
          name: '头部占比',
          value: head + '%',
          ok: headOk,
          tip: headOk ? '符合 ' + Math.round(range[0] * 100) + '%~' + Math.round(range[1] * 100) + '%' : '请用缩放微调'
        },
        {
          key: 'center',
          name: '居中度',
          value: centerOk ? '居中' : '偏移',
          ok: centerOk,
          tip: centerOk ? '人像水平居中' : '请减少缩放偏移'
        },
        {
          key: 'margin',
          name: '边距留白',
          value: marginOk ? '达标' : '过偏',
          ok: marginOk,
          tip: marginOk ? '头顶留白达标' : '请调整上下位置'
        }
      ]
    })
  },

  refreshFreq() {
    const freq = store.getFreq()
    this.setData({ freqLeft: Math.max(0, 5 - (freq.count || 0)) })
  },

  /* ---------------- 画布 ---------------- */
  initCanvas() {
    wx.createSelectorQuery()
      .select('#stage')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const dpr = wx.getSystemInfoSync().pixelRatio || 2
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        this.canvas = canvas
        this.ctx = ctx
        this.cw = res[0].width
        this.ch = res[0].height
        this.dpr = dpr

        const src = app.globalData.sourcePhoto
        if (!src) {
          wx.showModal({
            title: '还没有照片',
            content: '证件照需要一张人像照，请先拍摄或从相册导入。',
            confirmText: '去拍摄',
            success: (r) => {
              if (r.confirm) wx.switchTab({ url: '/pages/camera/index' })
              else wx.navigateBack()
            }
          })
          return
        }
        render
          .loadImage(canvas, src)
          .then((image) => {
            this.image = image
            this.setData({ ready: true })
            this.paint()
          })
          .catch(() => wx.showToast({ title: '照片加载失败', icon: 'none' }))
      })
  },

  resizeCanvas() {
    if (!this.canvas) return
    this.setData({ zoom: 1, headOffset: 0 }, () => this.paint())
  },

  paint() {
    if (!this.ctx || !this.image) return
    const spec = this.data.activeSpec
    const ctx = this.ctx
    const cw = this.cw
    const ch = this.ch

    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = this.data.activeBackdrop.color
    ctx.fillRect(0, 0, cw, ch)

    const crop = render.computeCrop(this.image.width, this.image.height, spec.ratio, this.data.zoom, this.data.headOffset)
    ctx.save()
    ctx.drawImage(this.image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cw, ch)
    ctx.restore()

    // 人脸占位提示框（演示环境用椭圆近似端侧人脸框）
    ctx.save()
    ctx.strokeStyle = 'rgba(252,247,223,0.85)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    const faceH = ch * (spec.headRatio + (this.data.zoom - 1) * 0.22)
    const faceW = faceH * 0.72
    ctx.beginPath()
    ctx.ellipse(cw / 2, ch * 0.24 + faceH / 2, faceW / 2, faceH / 2, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    this.evaluate()
  },

  /* ---------------- F-ID-04 单张成品导出 ---------------- */
  openDest() {
    this.setData({ showDest: true })
  },

  closeDest() {
    this.setData({ showDest: false })
  },

  chooseDest(e) {
    const dest = e.currentTarget.dataset.dest
    if (this.data.exporting) return
    if (this.data.freqLeft <= 0) {
      wx.showToast({ title: '今日频次已用完', icon: 'none' })
      return
    }
    if (!this.ctx) return
    this.setData({ exporting: true })
    const spec = this.data.activeSpec
    const backdrop = this.data.activeBackdrop
    const px = spec.px.split(' × ')
    const destWidth = Number(px[0]) * 2
    const destHeight = Number(px[1]) * 2
    render
      .toTempFile(this.canvas, {
        width: this.cw,
        height: this.ch,
        destWidth,
        destHeight,
        quality: 0.95
      })
      .then((tempFilePath) => {
        store.bumpFreq()
        this.refreshFreq()
        const record = {
          id: 'WK-' + Date.now(),
          title: spec.name + ' · ' + backdrop.name + '底',
          type: 'idphoto',
          layout: spec.name + '（' + spec.mm + '）',
          dest,
          destText: dest === 'album' ? '已保存到相册' : dest === 'sandbox' ? '临时暂存（24 小时）' : '仅本次查看',
          savedToAlbum: dest === 'album',
          source: '端侧生成',
          createdAt: new Date().toLocaleString('zh-CN'),
          spec: spec.name,
          size: spec.px,
          bg: { type: 'solid', color: backdrop.color }
        }
        store.addWork(record)
        app.globalData.lastResult = Object.assign({ tempFilePath, width: destWidth, height: destHeight }, record)
        this.setData({ exporting: false, showDest: false })
        wx.navigateTo({ url: '/pages/result/index' })
      })
      .catch(() => {
        this.setData({ exporting: false })
        wx.showToast({ title: '导出失败，请重试', icon: 'none' })
      })
  },

  noop() {},

  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  }
})
