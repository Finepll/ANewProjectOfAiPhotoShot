const app = getApp()
const mock = require('../../utils/mock')
const store = require('../../utils/store')
const render = require('../../utils/render')

Page({
  data: {
    ready: false,
    template: null,
    themePacks: mock.THEME_PACKS,
    activeTheme: mock.THEME_PACKS[0],
    stickers: [],
    stickerLib: mock.STICKERS,
    stickerPacks: ['全部'],
    activePack: '全部',
    visibleStickers: mock.STICKERS,
    selectedSticker: '',
    dragTarget: 'person',
    // 人像层参数（F-STU-03）
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    feather: 0.22,
    // 背景虚化（F-STU-04）
    blur: 0,
    // 图层（F-EDT-03）
    layers: [
      { key: 'bg', name: '影棚背景层', visible: true },
      { key: 'person', name: '人像层（抠图羽化）', visible: true },
      { key: 'sticker', name: '贴纸 / 文字层', visible: true },
      { key: 'theme', name: '风格包调整层', visible: true }
    ],
    showStickerSheet: false,
    showLayerSheet: false,
    showPipeline: false,
    pipeline: mock.PIPELINE_STEPS.map((item) => Object.assign({}, item, { state: 'wait' })),
    pipelineIndex: -1,
    pipelinePercent: 0,
    exporting: false
  },

  onLoad(query) {
    const packs = ['全部']
    mock.STICKERS.forEach((item) => {
      if (packs.indexOf(item.pack) === -1) packs.push(item.pack)
    })
    const template =
      (query.templateId && mock.STUDIO_TEMPLATES.find((item) => item.id === query.templateId)) ||
      app.globalData.activeTemplate ||
      mock.STUDIO_TEMPLATES[0]
    const theme =
      (query.themeId && mock.THEME_PACKS.find((item) => item.id === query.themeId)) || mock.THEME_PACKS[0]
    const stickers = []
    if (query.stickerId) {
      const sticker = mock.STICKERS.find((item) => item.id === query.stickerId)
      if (sticker) stickers.push(Object.assign({}, sticker))
    }
    app.globalData.activeTemplate = template
    app.globalData.activeTheme = theme
    this.setData({
      template,
      activeTheme: theme,
      stickers,
      stickerPacks: packs,
      selectedSticker: stickers.length ? stickers[0].id : ''
    })
  },

  onReady() {
    this.initCanvas()
  },

  onUnload() {
    this.canvas = null
    this.ctx = null
    this.image = null
  },

  /* ---------------- 画布初始化 ---------------- */
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
        const dpr = (wx.getSystemInfoSync().pixelRatio || 2)
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
            content: '请先拍摄或从相册导入一张人像照。',
            showCancel: false,
            success: () => wx.switchTab({ url: '/pages/camera/index' })
          })
          return
        }
        render
          .loadImage(canvas, src)
          .then((image) => {
            this.image = image
            this.setData({ ready: true })
            this.canvas.width = this.cw * this.dpr
            this.canvas.height = this.ch * this.dpr
            this.ctx.scale(this.dpr, this.dpr)
            this.paint()
          })
          .catch(() => {
            wx.showToast({ title: '照片加载失败', icon: 'none' })
          })
      })
  },

  /* ---------------- 绘制 ---------------- */
  paint() {
    if (!this.ctx || !this.cw) return
    const ctx = this.ctx
    const cw = this.cw
    const ch = this.ch
    const visible = {}
    this.data.layers.forEach((item) => {
      visible[item.key] = item.visible
    })

    ctx.clearRect(0, 0, cw, ch)
    if (visible.bg) {
      render.drawBackground(ctx, cw, ch, this.data.template.bg)
      if (this.data.blur > 0) render.drawBackgroundBlur(ctx, cw, ch, this.data.template.bg, this.data.blur)
    }
    if (visible.sticker && this.data.dragTarget === 'sticker') {
      render.drawStickers(ctx, cw, ch, this.data.stickers)
    }
    if (visible.person && this.image) {
      render.drawPerson(ctx, this.canvas, this.image, cw, ch, {
        zoom: this.data.zoom,
        offsetX: this.data.offsetX,
        offsetY: this.data.offsetY,
        feather: this.data.feather,
        filter: this.data.activeTheme.filter
      })
    }
    if (visible.sticker && this.data.dragTarget !== 'sticker') {
      render.drawStickers(ctx, cw, ch, this.data.stickers)
    }
    if (visible.theme) {
      render.applyTheme(ctx, this.canvas, cw, ch, this.data.activeTheme)
    }
    // 选中贴纸提示
    if (this.data.selectedSticker && visible.sticker) {
      const target = this.data.stickers.find((item) => item.id === this.data.selectedSticker)
      if (target) {
        ctx.save()
        ctx.strokeStyle = 'rgba(252,247,223,0.95)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        const size = cw * 0.16
        ctx.strokeRect(target.x * cw - size / 2, target.y * ch - size / 2, size, size)
        ctx.restore()
      }
    }
  },

  /* ---------------- 拖动（人像层 / 贴纸） ---------------- */
  onTouchStart(e) {
    const touch = e.touches[0]
    this.dragFrom = { x: touch.x, y: touch.y, offsetX: this.data.offsetX, offsetY: this.data.offsetY }
    if (this.data.dragTarget === 'sticker' && this.data.selectedSticker) {
      const target = this.data.stickers.find((item) => item.id === this.data.selectedSticker)
      if (target) this.dragFrom.sticker = { x: target.x, y: target.y }
    }
  },

  onTouchMove(e) {
    if (!this.cw) return
    const touch = e.touches[0]
    const dx = (touch.x - this.dragFrom.x) / this.cw
    const dy = (touch.y - this.dragFrom.y) / this.ch
    if (this.data.dragTarget === 'sticker' && this.dragFrom.sticker) {
      const stickers = this.data.stickers.map((item) =>
        item.id === this.data.selectedSticker
          ? Object.assign({}, item, {
              x: Math.min(0.94, Math.max(0.06, this.dragFrom.sticker.x + dx)),
              y: Math.min(0.94, Math.max(0.06, this.dragFrom.sticker.y + dy))
            })
          : item
      )
      this.setData({ stickers }, () => this.paint())
      return
    }
    this.setData(
      {
        offsetX: Math.min(0.6, Math.max(-0.6, this.dragFrom.offsetX + dx)),
        offsetY: Math.min(0.6, Math.max(-0.6, this.dragFrom.offsetY + dy))
      },
      () => this.paint()
    )
  },

  /* ---------------- 参数调节 ---------------- */
  onZoom(e) {
    this.setData({ zoom: e.detail.value / 100 }, () => this.paint())
  },
  onOffsetX(e) {
    this.setData({ offsetX: e.detail.value / 100 }, () => this.paint())
  },
  onOffsetY(e) {
    this.setData({ offsetY: e.detail.value / 100 }, () => this.paint())
  },
  onFeather(e) {
    this.setData({ feather: e.detail.value / 100 }, () => this.paint())
  },
  onBlur(e) {
    this.setData({ blur: e.detail.value / 10 }, () => this.paint())
  },
  resetPerson() {
    this.setData({ zoom: 1, offsetX: 0, offsetY: 0, feather: 0.22 }, () => this.paint())
  },

  pickTheme(e) {
    const theme = this.data.themePacks.find((item) => item.id === e.currentTarget.dataset.id)
    this.setData({ activeTheme: theme }, () => this.paint())
  },

  /* ---------------- 贴纸（F-EDT-01） ---------------- */
  openStickerSheet() {
    this.setData({ showStickerSheet: true })
  },
  closeStickerSheet() {
    this.setData({ showStickerSheet: false })
  },
  switchPack(e) {
    const pack = e.currentTarget.dataset.pack
    this.setData({
      activePack: pack,
      visibleStickers: pack === '全部' ? mock.STICKERS : mock.STICKERS.filter((item) => item.pack === pack)
    })
  },
  addSticker(e) {
    const item = this.data.stickerLib.find((s) => s.id === e.currentTarget.dataset.id)
    const stickers = this.data.stickers.concat([Object.assign({}, item)])
    this.setData({ stickers, selectedSticker: item.id, dragTarget: 'sticker', showStickerSheet: false }, () =>
      this.paint()
    )
  },
  selectSticker(e) {
    this.setData({ selectedSticker: e.currentTarget.dataset.id, dragTarget: 'sticker' }, () => this.paint())
  },
  removeSticker(e) {
    const id = e.currentTarget.dataset.id
    this.setData(
      {
        stickers: this.data.stickers.filter((item) => item.id !== id),
        selectedSticker: this.data.selectedSticker === id ? '' : this.data.selectedSticker
      },
      () => this.paint()
    )
  },
  usePersonDrag() {
    this.setData({ dragTarget: 'person' }, () => this.paint())
  },

  /* ---------------- 图层（F-EDT-03） ---------------- */
  openLayerSheet() {
    this.setData({ showLayerSheet: true })
  },
  closeLayerSheet() {
    this.setData({ showLayerSheet: false })
  },
  toggleLayer(e) {
    const key = e.currentTarget.dataset.key
    const layers = this.data.layers.map((item) =>
      item.key === key ? Object.assign({}, item, { visible: !item.visible }) : item
    )
    this.setData({ layers }, () => this.paint())
  },
  moveLayer(e) {
    const { key, dir } = e.currentTarget.dataset
    const layers = this.data.layers.slice()
    const index = layers.findIndex((item) => item.key === key)
    const target = index + Number(dir)
    if (target < 0 || target >= layers.length) return
    const tmp = layers[index]
    layers[index] = layers[target]
    layers[target] = tmp
    this.setData({ layers }, () => {
      if (key === 'person') {
        this.setData({ dragTarget: dir > 0 ? 'person' : 'sticker' })
      }
      this.paint()
    })
  },

  /* ---------------- F-STU-02 多模型能力编排 ---------------- */
  runPipeline() {
    if (this.data.showPipeline) return
    this.setData({
      showPipeline: true,
      pipeline: mock.PIPELINE_STEPS.map((item) => Object.assign({}, item, { state: 'wait' })),
      pipelineIndex: -1,
      pipelinePercent: 0
    })
    const steps = mock.PIPELINE_STEPS
    let percent = 0
    steps.forEach((step, index) => {
      setTimeout(() => {
        const pipeline = this.data.pipeline.map((item, i) =>
          Object.assign({}, item, { state: i < index ? 'done' : i === index ? 'run' : 'wait' })
        )
        this.setData({ pipeline, pipelineIndex: index })
      }, 620 * index)

      const timer = setInterval(() => {
        percent = Math.min(100, percent + Math.round(step.cost / 2))
        this.setData({ pipelinePercent: percent })
        if (percent >= 100) clearInterval(timer)
      }, 90)
    })

    setTimeout(() => {
      const pipeline = this.data.pipeline.map((item) => Object.assign({}, item, { state: 'done' }))
      this.setData({ pipeline, pipelinePercent: 100 })
      wx.showToast({ title: '编排完成', icon: 'success' })
      setTimeout(() => this.setData({ showPipeline: false }), 700)
    }, 620 * steps.length + 400)
  },

  /* ---------------- F-EDT-03 临时暂存 ---------------- */
  saveDraft() {
    const draft = {
      id: 'DR-' + Date.now(),
      templateId: this.data.template.id,
      themeId: this.data.activeTheme.id,
      zoom: this.data.zoom,
      offsetX: this.data.offsetX,
      offsetY: this.data.offsetY,
      feather: this.data.feather,
      blur: this.data.blur,
      stickers: this.data.stickers,
      createdAt: new Date().toLocaleString('zh-CN')
    }
    store.saveDraft(draft)
    wx.showToast({ title: '已暂存到本机', icon: 'success' })
  },

  /* ---------------- F-OUT-01 导出 ---------------- */
  exportImage() {
    if (this.data.exporting) return
    if (!this.canvas) return
    this.setData({ exporting: true })
    const destWidth = Math.round(this.cw * this.dpr * 1.6)
    const destHeight = Math.round(this.ch * this.dpr * 1.6)
    render
      .toTempFile(this.canvas, { width: this.cw, height: this.ch, destWidth, destHeight, quality: 0.95 })
      .then((tempFilePath) => {
        app.globalData.lastResult = {
          tempFilePath,
          title: `${this.data.template.name} · ${this.data.activeTheme.name}`,
          type: 'studio',
          width: destWidth,
          height: destHeight,
          source: '端侧生成',
          template: this.data.template,
          theme: this.data.activeTheme
        }
        this.setData({ exporting: false })
        wx.navigateTo({ url: '/pages/result/index' })
      })
      .catch(() => {
        this.setData({ exporting: false })
        wx.showToast({ title: '导出失败，请重试', icon: 'none' })
      })
  },

  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  }
})
