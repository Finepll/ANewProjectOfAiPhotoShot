const app = getApp()
const mock = require('../../utils/mock')

Page({
  data: {
    guides: mock.CAPTURE_GUIDES,
    guideIndex: 0,
    // 光线检测（F-CAP-01 光线提示）
    lightText: '正在检测光线…',
    lightLevel: 'ok',
    brightness: 0,
    // 相机
    device: 'front',
    cameraReady: false,
    cameraError: false,
    // 质检（F-CAP-03）
    checking: false,
    checkList: [],
    checkPass: false,
    checkScore: 0,
    checkingIndex: 0,
    showSheet: false,
    shotPath: '',
    shotFrom: 'camera'
  },

  onLoad() {
    this.cameraContext = wx.createCameraContext()
    this.startFrameDetect()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(2)
    }
    this.rotateGuide()
  },

  onHide() {
    this.stopTimers()
  },

  onUnload() {
    this.stopTimers()
    this.stopFrameDetect()
  },

  stopTimers() {
    if (this.guideTimer) clearInterval(this.guideTimer)
    if (this.lightTimer) clearInterval(this.lightTimer)
  },

  rotateGuide() {
    if (this.guideTimer) clearInterval(this.guideTimer)
    this.guideTimer = setInterval(() => {
      this.setData({ guideIndex: (this.data.guideIndex + 1) % this.data.guides.length })
    }, 2800)
  },

  /* ---------------- F-CAP-01 光线实时提示 ---------------- */
  startFrameDetect() {
    if (!this.cameraContext || typeof this.cameraContext.onCameraFrame !== 'function') {
      // 低版本基础库不支持实时帧，退化为环境光估计
      this.setData({ lightText: '光线提示需基础库 2.7.0+', lightLevel: 'ok' })
      return
    }
    try {
      this.frameListener = this.cameraContext.onCameraFrame((frame) => {
        if (!frame || !frame.data) return
        const data = new Uint8ClampedArray(frame.data)
        let sum = 0
        let count = 0
        const step = 4 * 37 // 稀疏采样，降低计算量
        for (let i = 0; i < data.length; i += step) {
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3
          count += 1
        }
        const avg = count ? Math.round(sum / count) : 0
        let lightText = '光线良好，保持不动'
        let lightLevel = 'ok'
        if (avg < 70) {
          lightText = '画面偏暗，请面向光源'
          lightLevel = 'dark'
        } else if (avg > 205) {
          lightText = '画面过曝，避免直射强光'
          lightLevel = 'bright'
        }
        if (Math.abs(avg - this.data.brightness) > 6) {
          this.setData({ brightness: avg, lightText, lightLevel })
        }
      })
      this.frameListener.start()
    } catch (e) {
      this.setData({ lightText: '光线检测不可用，已跳过', lightLevel: 'ok' })
    }
  },

  stopFrameDetect() {
    if (this.frameListener && typeof this.frameListener.stop === 'function') {
      this.frameListener.stop()
    }
    this.frameListener = null
  },

  onCameraReady() {
    this.setData({ cameraReady: true, cameraError: false })
  },

  onCameraError() {
    this.setData({ cameraError: true, cameraReady: false })
  },

  switchCamera() {
    this.setData({ device: this.data.device === 'front' ? 'back' : 'front' })
  },

  /* ---------------- 拍摄 ---------------- */
  takePhoto() {
    if (!this.data.cameraReady) {
      wx.showToast({ title: '相机还没准备好', icon: 'none' })
      return
    }
    if (!app.ensureAgreement()) return
    wx.vibrateShort({ type: 'light' })
    this.cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        this.setData({ shotPath: res.tempImagePath, shotFrom: 'camera' })
        this.runQuality(res.tempImagePath)
      },
      fail: () => wx.showToast({ title: '拍摄失败，请重试', icon: 'none' })
    })
  },

  /* ---------------- F-CAP-02 相册导入 ---------------- */
  importAlbum() {
    if (!app.ensureAgreement()) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({ shotPath: file.tempFilePath, shotFrom: 'album' })
        app.globalData.sourceMeta = { width: file.width, height: file.height, size: file.size }
        this.runQuality(file.tempFilePath)
      }
    })
  },

  /* ---------------- F-CAP-03 端侧质检与重拍引导 ---------------- */
  runQuality(path) {
    const checks = mock.QUALITY_CHECKS.map((item) => ({ key: item.key, name: item.name, desc: item.desc, state: 'wait' }))
    this.setData({ showSheet: true, checking: true, checkList: checks, checkingIndex: 0, checkScore: 0, checkPass: false })

    const finish = (pass, list, score) => {
      this.setData({ checking: false, checkList: list, checkPass: pass, checkScore: score })
    }

    // 逐项“端侧检测”动效
    checks.forEach((item, index) => {
      setTimeout(() => {
        const next = this.data.checkList.slice()
        let pass = true
        let hint = item.desc
        if (item.key === 'size') {
          pass = !!(this.imageInfo && Math.max(this.imageInfo.width, this.imageInfo.height) >= 600)
          hint = this.imageInfo ? `${this.imageInfo.width}×${this.imageInfo.height}` : '读取中'
        }
        if (item.key === 'light') {
          pass = this.data.brightness === 0 || (this.data.brightness >= 60 && this.data.brightness <= 210)
          hint = this.data.brightness ? `亮度 ${this.data.brightness}` : '环境光正常'
        }
        if (item.key === 'face' || item.key === 'multi') {
          // 演示：真实环境由端侧人脸检测 SDK 输出（见功能报告 1.5）
          pass = true
          hint = this.data.shotFrom === 'album' ? '模拟检测通过（未接入 SDK）' : '模拟检测通过'
        }
        next[index] = Object.assign({}, item, { state: pass ? 'pass' : 'fail', hint })
        const passed = next.filter((n) => n.state === 'pass').length
        this.setData({ checkList: next, checkingIndex: index + 1, checkScore: Math.round((passed / next.length) * 100) })
      }, 420 * (index + 1))
    })

    wx.getImageInfo({
      src: path,
      success: (info) => {
        this.imageInfo = { width: info.width, height: info.height, type: info.type }
      },
      fail: () => {}
    })

    setTimeout(() => {
      const list = this.data.checkList
      const passed = list.filter((n) => n.state !== 'fail').length
      finish(passed >= 3, list, Math.round((passed / list.length) * 100))
    }, 420 * (checks.length + 1))
  },

  retake() {
    this.setData({ showSheet: false, shotPath: '' })
  },

  /** 使用这张：按用户当前意图分流 */
  usePhoto() {
    const path = this.data.shotPath
    app.globalData.sourcePhoto = path
    app.globalData.sourceFrom = this.data.shotFrom
    const template = app.globalData.activeTemplate
    const spec = app.globalData.activeSpec
    this.setData({ showSheet: false })

    if (spec && !template) {
      wx.navigateTo({ url: '/pages/idphoto/index' })
      return
    }
    const query = template ? `?templateId=${template.id}` : ''
    wx.navigateTo({ url: `/pages/editor/index${query}` })
  },

  goSettings() {
    wx.openSetting({})
  }
})
