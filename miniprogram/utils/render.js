/**
 * 端侧合成引擎（F-STU-02 / F-ID-02 / F-EDT-* 的渲染底座）
 * 说明：真实抠图由端侧分割模型输出 alpha 通道（见功能报告 1.5 端侧模型预算），
 *      演示环境用「椭圆羽化遮罩 + 人脸回贴」近似，接口保持一致，后续换成模型输出即可。
 */

/** 在 canvas 上加载图片 */
function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('缺少图片路径'))
      return
    }
    const image = canvas.createImage()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

/** 画背景：纯色或线性渐变 */
function drawBackground(ctx, width, height, bg) {
  if (!bg) return
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color || '#FCF7DF'
  } else {
    const angle = ((bg.angle || 135) * Math.PI) / 180
    const x2 = width * Math.cos(angle) * 0.5 + width * 0.5
    const y2 = height * Math.sin(angle) * 0.5 + height * 0.5
    const gradient = ctx.createLinearGradient(0, 0, x2, y2)
    gradient.addColorStop(0, bg.from || '#FCF7DF')
    gradient.addColorStop(1, bg.to || '#C7D3DB')
    ctx.fillStyle = gradient
  }
  ctx.fillRect(0, 0, width, height)
}

/** 背景虚化/调焦（F-STU-04）：叠层近似，blurRadius 0~10 */
function drawBackgroundBlur(ctx, width, height, bg, blurRadius) {
  if (!blurRadius) return
  ctx.save()
  ctx.globalAlpha = Math.min(0.5, blurRadius / 22)
  for (let i = 1; i <= 3; i += 1) {
    const offset = (blurRadius * i) / 6
    ctx.drawImage(ctx.canvas, -offset, -offset, width + offset * 2, height + offset * 2)
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/** 人像层：缩放 + 位移 + 羽化遮罩（F-STU-03 人像层变换） */
function drawPerson(ctx, canvas, image, width, height, options) {
  const opt = options || {}
  const zoom = opt.zoom || 1
  const offsetX = (opt.offsetX || 0) * width
  const offsetY = (opt.offsetY || 0) * height
  const baseScale = Math.max(width / image.width, height / image.height) * 0.92
  const drawW = image.width * baseScale * zoom
  const drawH = image.height * baseScale * zoom
  const dx = (width - drawW) / 2 + offsetX
  const dy = (height - drawH) / 2 + offsetY

  const feather = opt.feather === undefined ? 0.22 : opt.feather
  ctx.save()
  if (opt.filter && opt.filter !== 'none') {
    try {
      ctx.filter = opt.filter
    } catch (e) {
      /* 部分低版本基础库不支持 filter，忽略 */
    }
  }
  ctx.drawImage(image, dx, dy, drawW, drawH)
  try {
    ctx.filter = 'none'
  } catch (e) {}

  // 羽化遮罩：模拟端侧抠图输出的 alpha 通道
  if (feather > 0) {
    const gradient = ctx.createRadialGradient(
      width / 2 + offsetX,
      height * 0.46 + offsetY,
      Math.min(width, height) * (0.42 - feather * 0.2),
      width / 2 + offsetX,
      height * 0.5 + offsetY,
      Math.max(width, height) * (0.62 + feather * 0.12)
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

/** 风格包与滤镜（F-EDT-02） */
function applyTheme(ctx, canvas, width, height, theme) {
  if (!theme) return
  if (theme.pixel) {
    // 像素风：缩小再放大，做出马赛克颗粒
    const step = Math.max(4, theme.pixel)
    const w = Math.max(8, Math.floor(width / step))
    const h = Math.max(8, Math.floor(height / step))
    const tmp = wx.createOffscreenCanvas({ type: '2d', width: w, height: h })
    const tmpCtx = tmp.getContext('2d')
    tmpCtx.drawImage(canvas, 0, 0, width, height, 0, 0, w, h)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, w, h, 0, 0, width, height)
    ctx.restore()
    return
  }
  if (theme.alpha) {
    ctx.save()
    ctx.fillStyle = theme.tint || '#000000'
    ctx.globalAlpha = theme.alpha
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

/** 贴纸与文字（F-EDT-01），位置为 0~1 相对坐标 */
function drawStickers(ctx, width, height, stickers) {
  if (!stickers || !stickers.length) return
  stickers.forEach((item) => {
    const size = item.size ? (item.size / 400) * width : width * 0.13
    ctx.save()
    ctx.globalAlpha = item.hidden ? 0 : 1
    ctx.font = `${size}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#3E3630'
    ctx.fillText(item.text, item.x * width, item.y * height)
    ctx.restore()
  })
}

/** 证件照裁切：按规格比例 + 头部占比自动构图（F-ID-03） */
function computeCrop(imageWidth, imageHeight, targetRatio, zoom, headOffset) {
  const safeRatio = targetRatio || 1
  let cropW = imageWidth
  let cropH = imageWidth / safeRatio
  if (cropH > imageHeight) {
    cropH = imageHeight
    cropW = imageHeight * safeRatio
  }
  const z = zoom || 1
  cropW /= z
  cropH /= z
  const sx = Math.max(0, Math.min(imageWidth - cropW, (imageWidth - cropW) / 2))
  const baseTop = imageHeight * 0.08
  const sy = Math.max(0, Math.min(imageHeight - cropH, baseTop + (headOffset || 0) * imageHeight * 0.5))
  return { sx, sy, sw: cropW, sh: cropH }
}

/** 一键合成主流程 */
function compose(canvas, ctx, width, height, payload) {
  const data = payload || {}
  ctx.clearRect(0, 0, width, height)
  drawBackground(ctx, width, height, data.background)
  if (data.blur) drawBackgroundBlur(ctx, width, height, data.background, data.blur)
  if (data.image) {
    drawPerson(ctx, canvas, data.image, width, height, {
      zoom: data.zoom,
      offsetX: data.offsetX,
      offsetY: data.offsetY,
      feather: data.feather,
      filter: data.filter
    })
  }
  applyTheme(ctx, canvas, width, height, data.theme)
  drawStickers(ctx, width, height, data.stickers)
}

/** 导出为临时文件（F-OUT-01） */
function toTempFile(canvas, options) {
  const opt = options || {}
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: opt.width,
      height: opt.height,
      destWidth: opt.destWidth || opt.width,
      destHeight: opt.destHeight || opt.height,
      fileType: 'jpg',
      quality: opt.quality || 0.95,
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => reject(err)
    })
  })
}

module.exports = {
  loadImage,
  drawBackground,
  drawBackgroundBlur,
  drawPerson,
  applyTheme,
  drawStickers,
  computeCrop,
  compose,
  toTempFile
}
