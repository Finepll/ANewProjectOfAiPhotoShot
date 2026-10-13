/**
 * 演示用数据 —— 正式环境由服务端下发（F-SRV-02 模板素材与端侧模型包下发）
 */

/* ---------------- F-STU-01 影棚背景模板 ---------------- */
const STUDIO_TEMPLATES = [
  {
    id: 'ST-01',
    name: '暖光影棚',
    scene: '米色幕布 · 柔光',
    tags: ['人像', '通用'],
    size: '12.4 MB',
    hot: true,
    bg: { type: 'linear', from: '#F3E3CE', to: '#C9A882', angle: 140 },
    light: '暖光'
  },
  {
    id: 'ST-02',
    name: '雾蓝影棚',
    scene: '灰蓝幕布 · 冷调',
    tags: ['证件', '商务'],
    size: '11.9 MB',
    hot: true,
    bg: { type: 'linear', from: '#DCE6EC', to: '#9FB3BF', angle: 140 },
    light: '冷光'
  },
  {
    id: 'ST-03',
    name: '落地窗自然光',
    scene: '侧逆光 · 通透',
    tags: ['写真', '氛围'],
    size: '14.2 MB',
    hot: false,
    bg: { type: 'linear', from: '#FCF7DF', to: '#C7D3DB', angle: 160 },
    light: '自然光'
  },
  {
    id: 'ST-04',
    name: '米白无影墙',
    scene: '纯色背景 · 干净',
    tags: ['简历', '通用'],
    size: '8.6 MB',
    hot: true,
    bg: { type: 'solid', color: '#F6F1E6' },
    light: '柔光'
  },
  {
    id: 'ST-05',
    name: '墨色影棚',
    scene: '深褐幕布 · 高对比',
    tags: ['质感', '高级'],
    size: '13.1 MB',
    hot: false,
    bg: { type: 'linear', from: '#4B4238', to: '#2E2822', angle: 150 },
    light: '轮廓光'
  },
  {
    id: 'ST-06',
    name: '驼色影棚',
    scene: '暖驼幕布 · 复古',
    tags: ['复古', '写真'],
    size: '12.0 MB',
    hot: false,
    bg: { type: 'linear', from: '#D8C6AE', to: '#A79A8A', angle: 145 },
    light: '柔光'
  },
  {
    id: 'ST-07',
    name: '校园草坪',
    scene: '毕业季 · 室外感',
    tags: ['毕业', '青春'],
    size: '15.4 MB',
    hot: true,
    bg: { type: 'linear', from: '#DCE8D8', to: '#A8BFA4', angle: 150 },
    light: '自然光'
  },
  {
    id: 'ST-08',
    name: '花房写真',
    scene: '清新 · 浅色花影',
    tags: ['写真', '清新'],
    size: '16.2 MB',
    hot: false,
    bg: { type: 'linear', from: '#FBEFF0', to: '#E0C3B0', angle: 155 },
    light: '柔光'
  }
]

/* ---------------- F-ID-01 证件照规格库与智能推荐 ---------------- */
const ID_SPECS = [
  { id: 'SP-1', name: '一寸', mm: '25 × 35 mm', px: '295 × 413', ratio: 295 / 413, headRatio: 0.63, usage: ['简历', '报名表'], tone: '#438EDB' },
  { id: 'SP-2', name: '二寸', mm: '35 × 49 mm', px: '413 × 579', ratio: 413 / 579, headRatio: 0.6, usage: ['资格证', '档案'], tone: '#438EDB' },
  { id: 'SP-3', name: '小一寸', mm: '22 × 32 mm', px: '260 × 378', ratio: 260 / 378, headRatio: 0.65, usage: ['驾驶证'], tone: '#438EDB' },
  { id: 'SP-4', name: '大一寸', mm: '33 × 48 mm', px: '390 × 567', ratio: 390 / 567, headRatio: 0.6, usage: ['护照', '签证'], tone: '#438EDB' },
  { id: 'SP-5', name: '小二寸', mm: '35 × 45 mm', px: '413 × 531', ratio: 413 / 531, headRatio: 0.61, usage: ['社保', '医保'], tone: '#438EDB' },
  { id: 'SP-6', name: '简历照（横版）', mm: '自定义', px: '600 × 600', ratio: 1, headRatio: 0.55, usage: ['社交头像', '简历头像'], tone: '#A79A8A' }
]

/** 用途 → 规格 的推荐映射（演示规则，正式环境由端侧规则/服务端推荐） */
const SPEC_RECOMMEND = {
  简历: 'SP-1',
  简历头像: 'SP-6',
  报名表: 'SP-1',
  资格证: 'SP-2',
  档案: 'SP-2',
  驾驶证: 'SP-3',
  护照: 'SP-4',
  签证: 'SP-4',
  社保: 'SP-5',
  医保: 'SP-5',
  社交头像: 'SP-6'
}

/** 证件照底色（自定义取色仅对非正式场景开放） */
const ID_BACKDROPS = [
  { key: 'blue', name: '标准蓝', color: '#438EDB', formal: true },
  { key: 'white', name: '标准白', color: '#FFFFFF', formal: true },
  { key: 'red', name: '标准红', color: '#D03B36', formal: true },
  { key: 'gray', name: '浅灰', color: '#D9DEE3', formal: true },
  { key: 'cream', name: '暖米（自定义）', color: '#FCF7DF', formal: false },
  { key: 'tan', name: '驼色（自定义）', color: '#A79A8A', formal: false }
]

/* ---------------- F-EDT-02 本机滤镜与主题风格包 ---------------- */
const THEME_PACKS = [
  { id: 'TH-0', name: '原图', desc: '不叠加风格', filter: 'none', tint: '#000000', alpha: 0, tag: '基础' },
  { id: 'TH-1', name: '暖阳', desc: '暖调 · 提升肤色', filter: 'none', tint: '#DFB199', alpha: 0.16, tag: '人像' },
  { id: 'TH-2', name: '冷调', desc: '清冷 · 通透', filter: 'none', tint: '#C7D3DB', alpha: 0.22, tag: '商务' },
  { id: 'TH-3', name: '黑白', desc: '灰度 · 高质感', filter: 'grayscale(1)', tint: '#000000', alpha: 0, tag: '经典' },
  { id: 'TH-4', name: '胶片', desc: '颗粒 · 低饱和', filter: 'sepia(0.35) saturate(1.15)', tint: '#A79A8A', alpha: 0.12, tag: '氛围' },
  { id: 'TH-5', name: '像素风', desc: '马赛克 · 复古', filter: 'none', pixel: 14, tag: '趣味' },
  { id: 'TH-6', name: '柔焦', desc: '柔光 · 朦胧', filter: 'blur(1.2px)', tint: '#FCF7DF', alpha: 0.18, tag: '写真' },
  { id: 'TH-7', name: '锐化描边', desc: '边缘强化', filter: 'contrast(1.18) saturate(1.1)', tint: '#000000', alpha: 0, tag: '风格化' }
]

/* ---------------- F-EDT-01 贴纸素材 ---------------- */
const STICKERS = [
  { id: 'SK-01', text: '✨', pack: '光点', x: 0.2, y: 0.24 },
  { id: 'SK-02', text: '🎓', pack: '毕业', x: 0.74, y: 0.2 },
  { id: 'SK-03', text: '🌸', pack: '清新', x: 0.22, y: 0.7 },
  { id: 'SK-04', text: '⭐', pack: '光点', x: 0.78, y: 0.66 },
  { id: 'SK-05', text: '🎀', pack: '少女', x: 0.3, y: 0.42 },
  { id: 'SK-06', text: '🎈', pack: '节日', x: 0.68, y: 0.46 },
  { id: 'SK-07', text: '🕶', pack: '趣味', x: 0.5, y: 0.3 },
  { id: 'SK-08', text: '🐚', pack: '清新', x: 0.5, y: 0.78 },
  { id: 'SK-09', text: '毕业快乐', pack: '文字', x: 0.5, y: 0.12, size: 34 },
  { id: 'SK-10', text: '2026', pack: '文字', x: 0.5, y: 0.88, size: 34 },
  { id: 'SK-11', text: 'BEST', pack: '文字', x: 0.2, y: 0.5, size: 30 },
  { id: 'SK-12', text: '☀️', pack: '光点', x: 0.8, y: 0.86 }
]

/* ---------------- 拍照引导（F-CAP-01） ---------------- */
const CAPTURE_GUIDES = [
  { key: 'center', text: '人像居中，头顶留出约 1/5 空间' },
  { key: 'head', text: '头部占画面 55% ~ 65%，肩线保持水平' },
  { key: 'light', text: '面向光源，避免背光与顶光直射' },
  { key: 'face', text: '摘掉口罩与帽子，保持表情自然' }
]

/* ---------------- F-CAP-03 端侧质检项 ---------------- */
const QUALITY_CHECKS = [
  { key: 'size', name: '分辨率', desc: '长边 ≥ 1200px' },
  { key: 'light', name: '亮度', desc: '不过暗 / 不过曝' },
  { key: 'face', name: '人脸', desc: '检测到 1 张清晰人脸' },
  { key: 'multi', name: '多人脸', desc: '画面中无其他人脸' }
]

/* ---------------- F-STU-02 多模型能力编排（大模型中枢拆解） ---------------- */
const PIPELINE_STEPS = [
  { key: 'llm', title: '意图理解', desc: '大模型解析「暖光影棚 + 学士服 + 柔焦」', cost: 6 },
  { key: 'matte', title: '人像分割', desc: '调用分割模型生成人像 alpha 通道', cost: 22 },
  { key: 'compose', title: '影棚合成', desc: '按模板光影参数合成到幕布层', cost: 16 },
  { key: 'face', title: '人脸保真', desc: '人脸区域回贴，保持五官细节', cost: 12 },
  { key: 'style', title: '风格化', desc: '按风格包应用滤镜与颗粒', cost: 9 }
]

/* ---------------- F-PAY-01 会员与增值规格 ---------------- */
const PLANS = [
  {
    id: 'PL-M',
    name: '月卡',
    price: 19,
    origin: 29,
    duration: '30 天',
    tag: '尝鲜',
    benefits: ['每日 5 张免费额度', '高清无水印导出', '端侧模型包全量下发']
  },
  {
    id: 'PL-Q',
    name: '季卡',
    price: 49,
    origin: 87,
    duration: '90 天',
    tag: '推荐',
    recommend: true,
    benefits: ['每日 5 张免费额度', '高清无水印导出', '影棚模板全解锁', '云增强 20 次/月']
  },
  {
    id: 'PL-Y',
    name: '年卡',
    price: 149,
    origin: 348,
    duration: '365 天',
    tag: '最划算',
    benefits: ['每日 5 张免费额度', '高清无水印导出', '影棚模板全解锁', '云增强 20 次/月', '新主题包优先体验']
  },
  {
    id: 'PL-P10',
    name: '单次包 · 10 张',
    price: 9.9,
    origin: 19.9,
    duration: '90 天有效',
    tag: '按次',
    benefits: ['10 张云增强额度', '高清无水印导出']
  }
]

/* ---------------- 隐私看板（F-ACC-03） ---------------- */
const PRIVACY_ITEMS = [
  { key: 'photo', name: '拍摄原图', where: '本机临时目录', keep: '生成完成即释放', risk: '低' },
  { key: 'work', name: '成品作品', where: '小程序本地存储', keep: '由你手动删除', risk: '低' },
  { key: 'draft', name: '编辑草稿', where: '小程序本地存储', keep: '最多保留 20 条', risk: '低' },
  { key: 'face', name: '人脸特征', where: '默认不保存', keep: '关闭后立即清除', risk: '高（默认关闭）' },
  { key: 'cloud', name: '云增强上行文件', where: '云端临时桶', keep: '回传后即时删除', risk: '中（需显式授权）' }
]

/* ---------------- 演示种子数据 ---------------- */
const SEED_QUOTA = 5

const SEED_WORKS = [
  {
    id: 'WK-DEMO-1',
    title: '雾蓝影棚 · 证件照',
    type: 'idphoto',
    source: '端侧生成',
    createdAt: '2026-10-10 20:14',
    demo: true,
    bg: { type: 'linear', from: '#DCE6EC', to: '#9FB3BF', angle: 140 },
    spec: '一寸 · 标准蓝底',
    size: '295 × 413'
  },
  {
    id: 'WK-DEMO-2',
    title: '暖光影棚 · 写真',
    type: 'studio',
    source: '端侧生成',
    createdAt: '2026-10-09 19:02',
    demo: true,
    bg: { type: 'linear', from: '#F3E3CE', to: '#C9A882', angle: 140 },
    theme: '暖阳',
    size: '1080 × 1440'
  }
]

const SEED_ORDERS = [
  {
    id: 'AP202610092013',
    planName: '季卡',
    amount: 49,
    status: '已支付',
    channel: '微信支付',
    tradeNo: '4200002288202610920',
    createdAt: '2026-10-09 20:13',
    delivered: true
  },
  {
    id: 'AP202610081021',
    planName: '单次包 · 10 张',
    amount: 9.9,
    status: '已关闭',
    channel: '微信支付',
    tradeNo: '-',
    createdAt: '2026-10-08 10:21',
    delivered: false
  }
]

module.exports = {
  STUDIO_TEMPLATES,
  ID_SPECS,
  SPEC_RECOMMEND,
  ID_BACKDROPS,
  THEME_PACKS,
  STICKERS,
  CAPTURE_GUIDES,
  QUALITY_CHECKS,
  PIPELINE_STEPS,
  PLANS,
  PRIVACY_ITEMS,
  SEED_QUOTA,
  SEED_WORKS,
  SEED_ORDERS
}
