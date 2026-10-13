/**
 * 演示用 Mock 数据（全部为虚构数据，仅用于前端 Demo 展示）
 * 真实环境应由 SpringBoot 接口提供，前端只需替换数据来源。
 */

const TODAY = new Date('2026-10-10T10:20:00')

/** 生成最近 n 天的 MM-DD 标签 */
export function lastDays(n) {
  const list = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(TODAY)
    d.setDate(d.getDate() - i)
    list.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return list
}

/** 生成走势数组：base + 随机波动 + 周末下沉 */
export function wave(n, base, spread, seed = 1) {
  const list = []
  let value = base
  for (let i = 0; i < n; i += 1) {
    const pseudo = Math.abs(Math.sin((i + 1) * seed * 12.9898) * 43758.5453) % 1
    value = value + (pseudo - 0.46) * spread
    value = Math.max(base * 0.45, value)
    list.push(Math.round(value))
  }
  return list
}

/* ============================ 版本信息 ============================ */
export const demoMeta = {
  version: 'V3.4',
  docName: 'AI 照相馆 · 功能报告',
  featureCount: 39,
  moduleCount: 10,
  env: '前端 Demo（Mock 数据，未接后端）'
}

/* ============================ 运营看板 ============================ */
export const dashboardKpis = [
  { key: 'gen', label: '今日生成量', value: 1286, unit: '张', delta: 12.4, icon: 'PictureFilled', tone: 'primary', hint: '端侧+云端合计' },
  { key: 'cloud', label: '云增强占比', value: 38.6, unit: '%', delta: -2.1, icon: 'Cloudy', tone: 'light', digits: 1, hint: '占全部生成' },
  { key: 'success', label: '生成成功率', value: 97.2, unit: '%', delta: 0.8, icon: 'CircleCheckFilled', tone: 'warm', digits: 1, hint: '近 24 小时' },
  { key: 'user', label: '今日新增用户', value: 214, unit: '人', delta: 6.2, icon: 'UserFilled', tone: 'accent', hint: '小程序扫码授权' },
  { key: 'income', label: '今日会员收入', value: 18640, unit: '元', delta: 18.9, icon: 'Wallet', tone: 'primary', hint: '含单次包' },
  { key: 'refund', label: '待处理退款', value: 7, unit: '笔', delta: -3, icon: 'RefreshLeft', tone: 'accent', hint: '需主管复核' }
]

export const trend14 = {
  days: lastDays(14),
  local: wave(14, 780, 260, 1.4),
  cloud: wave(14, 430, 180, 2.7),
  successRate: wave(14, 96, 4, 3.3).map((v) => Math.min(99.6, Math.max(90, v + 0.6))),
  revenue: wave(14, 15200, 5200, 4.1)
}

export const categoryDist = [
  { name: '证件照', value: 4820 },
  { name: '虚拟影楼', value: 3160 },
  { name: '毕业学士服', value: 2180 },
  { name: '职业形象照', value: 1460 },
  { name: '节日主题', value: 890 }
]

export const hotTemplates = [
  { name: '蓝底一寸证件照', value: 1842 },
  { name: '学士服 · 礼堂', value: 1526 },
  { name: '虚拟影楼 · 暖光棚', value: 1388 },
  { name: '白底二寸证件照', value: 1120 },
  { name: '职业形象 · 深灰', value: 968 },
  { name: '清新写真 · 花房', value: 742 },
  { name: '国风 · 红墙', value: 610 },
  { name: '毕业季 · 合影位', value: 486 }
]

export const taskStatusDist = [
  { name: '端侧完成', value: 68 },
  { name: '云增强成功', value: 26 },
  { name: '排队 / 处理中', value: 4 },
  { name: '失败待重试', value: 2 }
]

export const todoList = [
  { id: 1, level: 'accent', text: '3 笔退款申请待主管复核', path: '/member/refunds', time: '10 分钟前' },
  { id: 2, level: 'warm', text: '2 个模板素材缺少版权来源登记', path: '/templates', time: '32 分钟前' },
  { id: 3, level: 'primary', text: '4 个云增强任务失败待重试', path: '/cloud-tasks', time: '1 小时前' },
  { id: 4, level: 'mute', text: '年卡权益配置将于 10-15 生效', path: '/member/plans', time: '今天 09:12' }
]

/* ============================ 模板与素材 ============================ */
export const templateCategories = ['全部', '证件照', '虚拟影楼', '毕业照', '职业形象', '节日主题']

export const templates = [
  { id: 'TPL-1001', name: '标准蓝底一寸', category: '证件照', theme: '官方标准', size: 1.8, copyright: '自有拍摄', status: true, updated: '2026-10-08', spec: '25×35mm / 295×413px', tags: ['免登记', '高频'] },
  { id: 'TPL-1002', name: '标准白底二寸', category: '证件照', theme: '官方标准', size: 2.1, copyright: '自有拍摄', status: true, updated: '2026-10-08', spec: '35×49mm / 413×579px', tags: ['免登记'] },
  { id: 'TPL-1003', name: '红底一寸（考研）', category: '证件照', theme: '官方标准', size: 1.6, copyright: '自有拍摄', status: true, updated: '2026-09-28', spec: '25×35mm / 295×413px', tags: ['考试'] },
  { id: 'TPL-2001', name: '暖光影棚 · 米色幕布', category: '虚拟影楼', theme: '暖调影棚', size: 12.4, copyright: '合作摄影师授权', status: true, updated: '2026-10-05', spec: '1080×1440 引导框', tags: ['2D 引导'] },
  { id: 'TPL-2002', name: '冷调影棚 · 灰蓝幕布', category: '虚拟影楼', theme: '冷调影棚', size: 11.9, copyright: '合作摄影师授权', status: true, updated: '2026-10-05', spec: '1080×1440 引导框', tags: ['2D 引导'] },
  { id: 'TPL-2003', name: '写真棚 · 落地窗逆光', category: '虚拟影楼', theme: '自然光', size: 14.2, copyright: '待补充来源', status: false, updated: '2026-10-01', spec: '1080×1440 引导框', tags: ['待审核'] },
  { id: 'TPL-3001', name: '学士服 · 礼堂', category: '毕业照', theme: '毕业季', size: 9.8, copyright: '自有设计', status: true, updated: '2026-09-30', spec: '换装 + 背景', tags: ['换装'] },
  { id: 'TPL-3002', name: '学士服 · 校园草坪', category: '毕业照', theme: '毕业季', size: 10.6, copyright: '自有设计', status: true, updated: '2026-09-30', spec: '换装 + 背景', tags: ['换装'] },
  { id: 'TPL-4001', name: '职业形象 · 深灰', category: '职业形象', theme: '商务', size: 8.4, copyright: '自有设计', status: true, updated: '2026-09-22', spec: '换装 + 换底', tags: ['简历'] },
  { id: 'TPL-4002', name: '职业形象 · 藏青正装', category: '职业形象', theme: '商务', size: 8.9, copyright: '自有设计', status: false, updated: '2026-09-18', spec: '换装 + 换底', tags: ['下架中'] },
  { id: 'TPL-5001', name: '国风 · 红墙', category: '节日主题', theme: '国风', size: 6.2, copyright: '第三方素材（已附授权书）', status: true, updated: '2026-09-15', spec: '风格化背景', tags: ['风格化'] },
  { id: 'TPL-5002', name: '清新写真 · 花房', category: '节日主题', theme: '清新', size: 7.1, copyright: '第三方素材（已附授权书）', status: true, updated: '2026-09-12', spec: '风格化背景', tags: ['风格化'] }
]

export const idSpecs = [
  { id: 'SPEC-01', name: '一寸', sizeMm: '25 × 35 mm', px: '295 × 413', headRatio: '58% ~ 68%', margin: '上 8% / 下 12%', allowColor: false, status: true, usage: '简历、报名表' },
  { id: 'SPEC-02', name: '二寸', sizeMm: '35 × 49 mm', px: '413 × 579', headRatio: '55% ~ 65%', margin: '上 7% / 下 13%', allowColor: false, status: true, usage: '资格证、档案' },
  { id: 'SPEC-03', name: '小一寸', sizeMm: '22 × 32 mm', px: '260 × 378', headRatio: '60% ~ 70%', margin: '上 8% / 下 10%', allowColor: false, status: true, usage: '驾驶证' },
  { id: 'SPEC-04', name: '大一寸', sizeMm: '33 × 48 mm', px: '390 × 567', headRatio: '55% ~ 65%', margin: '上 8% / 下 12%', allowColor: false, status: true, usage: '护照、签证' },
  { id: 'SPEC-05', name: '小二寸', sizeMm: '35 × 45 mm', px: '413 × 531', headRatio: '56% ~ 66%', margin: '上 8% / 下 12%', allowColor: false, status: true, usage: '社保、医保' },
  { id: 'SPEC-06', name: '自定义取色底', sizeMm: '随规格', px: '随规格', headRatio: '随规格', margin: '随规格', allowColor: true, status: false, usage: '仅限非正式场景' }
]

export const stickers = [
  { id: 'STK-01', name: '毕业季', pack: '毕业季礼包', count: 24, size: 3.2, status: true, updated: '2026-09-30' },
  { id: 'STK-02', name: '节日氛围', pack: '节日礼包', count: 36, size: 4.6, status: true, updated: '2026-09-26' },
  { id: 'STK-03', name: '职场标签', pack: '商务礼包', count: 18, size: 2.4, status: true, updated: '2026-09-20' },
  { id: 'STK-04', name: '手绘涂鸦', pack: '涂鸦礼包', count: 42, size: 5.1, status: false, updated: '2026-09-11' }
]

export const themePacks = [
  { id: 'THM-01', name: '像素风', style: '像素化 / 描边', models: '风格化模型 A', size: 22.6, status: true, copyright: '内置模型', updated: '2026-10-02' },
  { id: 'THM-02', name: '胶片质感', style: '颗粒 / 柔光', models: '风格化模型 B', size: 18.4, status: true, copyright: '内置模型', updated: '2026-10-02' },
  { id: 'THM-03', name: '锐化描边', style: '边缘增强', models: '端侧滤镜', size: 0.6, status: true, copyright: '端侧算法', updated: '2026-09-29' },
  { id: 'THM-04', name: '水彩插画', style: '风格迁移', models: '风格化模型 C', size: 26.8, status: false, copyright: '待补充来源', updated: '2026-09-19' }
]

/* ============================ 用户与额度 ============================ */
export const userStats = {
  total: 48260,
  monthNew: 3120,
  member: 6842,
  banned: 37
}

export const users = [
  { id: 'U-88201', phone: '138****6621', nick: '小满同学', registered: '2026-10-09 14:22', quota: 12, member: '月卡', status: '正常', lastActive: '今天 10:02', orders: 3 },
  { id: 'U-88200', phone: '139****1043', nick: '阿屿', registered: '2026-10-09 11:05', quota: 3, member: '无', status: '正常', lastActive: '今天 09:41', orders: 1 },
  { id: 'U-88198', phone: '155****8890', nick: 'Luna', registered: '2026-10-08 20:37', quota: 0, member: '年卡', status: '正常', lastActive: '昨天 22:10', orders: 6 },
  { id: 'U-88195', phone: '186****3321', nick: '摄影小白', registered: '2026-10-08 09:18', quota: 5, member: '季卡', status: '正常', lastActive: '昨天 19:02', orders: 2 },
  { id: 'U-88190', phone: '137****4477', nick: '小张', registered: '2026-10-07 16:44', quota: 1, member: '无', status: '额度冻结', lastActive: '10-07 17:20', orders: 0 },
  { id: 'U-88184', phone: '188****9021', nick: '橘子汽水', registered: '2026-10-06 10:02', quota: 22, member: '年卡', status: '正常', lastActive: '今天 08:33', orders: 9 },
  { id: 'U-88180', phone: '133****5580', nick: '夜行灯', registered: '2026-10-05 21:19', quota: 4, member: '月卡', status: '正常', lastActive: '昨天 21:44', orders: 2 },
  { id: 'U-88177', phone: '177****2210', nick: '毕业季', registered: '2026-10-05 15:08', quota: 0, member: '无', status: '封禁', lastActive: '10-05 16:31', orders: 0 },
  { id: 'U-88170', phone: '150****7788', nick: '一只猫', registered: '2026-10-04 13:26', quota: 8, member: '季卡', status: '正常', lastActive: '今天 07:58', orders: 4 },
  { id: 'U-88162', phone: '159****0092', nick: '可乐不加冰', registered: '2026-10-03 19:55', quota: 2, member: '无', status: '正常', lastActive: '10-08 22:04', orders: 1 }
]

export const quotaLogs = [
  { time: '2026-10-10 10:02', type: '生成扣减', amount: -1, balance: 12, remark: '证件照·标准蓝底一寸', operator: '系统' },
  { time: '2026-10-09 20:14', type: '会员发放', amount: 30, balance: 30, remark: '月卡权益入账', operator: 'F-SRV-05' },
  { time: '2026-10-09 20:13', type: '支付成功', amount: 0, balance: 0, remark: '订单 AP202610092013', operator: '微信支付' },
  { time: '2026-10-08 11:36', type: '生成回滚', amount: 1, balance: 1, remark: '任务失败自动回滚', operator: '系统' },
  { time: '2026-10-08 11:35', type: '生成扣减', amount: -1, balance: 0, remark: '虚拟影楼·暖光棚', operator: '系统' }
]

export const userGrowth = {
  days: lastDays(14),
  newUsers: wave(14, 205, 90, 5.2),
  members: wave(14, 42, 26, 6.4)
}

/* ============================ 会员与支付 ============================ */
export const benefitOptions = [
  '每日 5 张免费额度',
  '云增强免费用量（20 次/月）',
  '高清无水印导出',
  '虚拟影楼全部背景模板',
  '风格化主题包全解锁',
  '优先生成队列'
]

export const plans = [
  { id: 'PLAN-M', name: '月卡', type: '订阅', price: 19, origin: 29, duration: '30 天', status: true, effectAt: '2026-09-01 00:00', sellCount: 3820, recommend: false, upgrade: '按剩余天数折算 50%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出'] },
  { id: 'PLAN-Q', name: '季卡', type: '订阅', price: 49, origin: 87, duration: '90 天', status: true, effectAt: '2026-09-01 00:00', sellCount: 1642, recommend: true, upgrade: '按剩余天数折算 60%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出', '虚拟影楼全部背景模板'] },
  { id: 'PLAN-Y', name: '年卡', type: '订阅', price: 149, origin: 348, duration: '365 天', status: true, effectAt: '2026-10-15 00:00', sellCount: 680, recommend: false, upgrade: '按剩余天数折算 70%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出', '虚拟影楼全部背景模板', '风格化主题包全解锁', '优先生成队列'] },
  { id: 'PLAN-P10', name: '单次包 · 10 张', type: '计次', price: 9.9, origin: 19.9, duration: '90 天有效', status: true, effectAt: '2026-08-20 00:00', sellCount: 5240, recommend: false, upgrade: '不支持折算升级', benefits: ['10 张云增强额度', '高清无水印导出'] },
  { id: 'PLAN-P50', name: '单次包 · 50 张', type: '计次', price: 39, origin: 99, duration: '180 天有效', status: false, effectAt: '2026-08-20 00:00', sellCount: 1120, recommend: false, upgrade: '不支持折算升级', benefits: ['50 张云增强额度', '高清无水印导出'] }
]

export const planSales = {
  names: ['月卡', '季卡', '年卡', '单次包 10 张', '单次包 50 张'],
  amounts: [72460, 80458, 101320, 51876, 43680],
  counts: [3820, 1642, 680, 5240, 1120]
}

export const orders = [
  { id: 'AP202610101002', user: '138****6621', plan: '月卡', amount: 19, channel: '微信支付', status: '已支付', tradeNo: '4200002310202610107', created: '2026-10-10 10:02', abnormal: false, delivered: true },
  { id: 'AP202610100941', user: '139****1043', plan: '单次包 · 10 张', amount: 9.9, channel: '微信支付', status: '待支付', tradeNo: '-', created: '2026-10-10 09:41', abnormal: false, delivered: false },
  { id: 'AP202610092239', user: '155****8890', plan: '年卡', amount: 149, channel: '微信支付', status: '已支付', tradeNo: '4200002309202609237', created: '2026-10-09 22:39', abnormal: false, delivered: true },
  { id: 'AP202610092013', user: '186****3321', plan: '季卡', amount: 49, channel: '微信支付', status: '已支付', tradeNo: '4200002288202610920', created: '2026-10-09 20:13', abnormal: false, delivered: true },
  { id: 'AP202610091812', user: '188****9021', plan: '月卡', amount: 19, channel: '微信支付', status: '退款中', tradeNo: '4200002277202609181', created: '2026-10-09 18:12', abnormal: true, delivered: true },
  { id: 'AP202610081933', user: '133****5580', plan: '单次包 · 10 张', amount: 9.9, channel: '微信支付', status: '已支付', tradeNo: '4200002266202608193', created: '2026-10-08 19:33', abnormal: false, delivered: true },
  { id: 'AP202610081021', user: '150****7788', plan: '季卡', amount: 49, channel: '微信支付', status: '支付超时', tradeNo: '-', created: '2026-10-08 10:21', abnormal: false, delivered: false },
  { id: 'AP202610072044', user: '159****0092', plan: '月卡', amount: 19, channel: '微信支付', status: '已支付', tradeNo: '4200002244202607204', created: '2026-10-07 20:44', abnormal: false, delivered: true },
  { id: 'AP202610071332', user: '137****4477', plan: '单次包 · 50 张', amount: 39, channel: '微信支付', status: '已关闭', tradeNo: '-', created: '2026-10-07 13:32', abnormal: true, delivered: false },
  { id: 'AP202610061155', user: '177****2210', plan: '月卡', amount: 19, channel: '微信支付', status: '已支付', tradeNo: '4200002222202606115', created: '2026-10-06 11:55', abnormal: false, delivered: true }
]

export const orderTrend = {
  days: lastDays(14),
  gmv: wave(14, 16400, 6400, 7.3),
  orders: wave(14, 96, 42, 8.1)
}

export const channelDist = [
  { name: '微信支付', value: 86 },
  { name: 'Apple 内购', value: 9 },
  { name: '支付宝', value: 5 }
]

export const reconciliation = [
  { day: '2026-10-10', platform: 18640, channel: 18640, diff: 0 },
  { day: '2026-10-09', platform: 21480, channel: 21480, diff: 0 },
  { day: '2026-10-08', platform: 16230, channel: 16230, diff: 0 },
  { day: '2026-10-07', platform: 17880, channel: 17781, diff: -99, note: '渠道手续费单笔差异，待核对' },
  { day: '2026-10-06', platform: 15240, channel: 15240, diff: 0 },
  { day: '2026-10-05', platform: 19360, channel: 19360, diff: 0 }
]

/* ============================ 退款与售后 ============================ */
export const refunds = [
  { id: 'RF20261010003', order: 'AP202610091812', user: '188****9021', plan: '月卡', amount: 19, reason: '误购，本月已购季卡', status: '待复核', applyAt: '2026-10-10 09:58', channel: '微信支付', step: 2, operator: '客服·王琪' },
  { id: 'RF20261010002', order: 'AP202610081933', user: '133****5580', plan: '单次包 · 10 张', amount: 9.9, reason: '生成效果与预览不符', status: '待初审', applyAt: '2026-10-10 08:41', channel: '微信支付', step: 1, operator: '-' },
  { id: 'RF20261009007', order: 'AP202610072044', user: '159****0092', plan: '月卡', amount: 19, reason: '重复扣款', status: '已打款', applyAt: '2026-10-09 22:10', channel: '微信支付', step: 4, operator: '财务·李默' },
  { id: 'RF20261009005', order: 'AP202610061155', user: '177****2210', plan: '月卡', amount: 19, reason: '账号违规被封禁，申请退款', status: '已驳回', applyAt: '2026-10-09 15:32', channel: '微信支付', step: 2, operator: '主管·赵宁' },
  { id: 'RF20261008011', order: 'AP202610092239', user: '155****8890', plan: '年卡', amount: 149, reason: '重复购买年卡', status: '已打款', applyAt: '2026-10-08 20:12', channel: '微信支付', step: 5, operator: '财务·李默' }
]

export const refundTrend = {
  days: lastDays(14),
  amount: wave(14, 260, 220, 9.4),
  rate: wave(14, 12, 8, 10.6).map((v) => Math.max(4, v) / 10)
}

export const refundSteps = [
  { title: '用户申请', desc: '小程序内提交，附订单号与理由' },
  { title: '客服初审', desc: '核验订单与权益使用情况' },
  { title: '主管复核', desc: '金额 ≥ 100 元或已使用权益需复核' },
  { title: '财务打款', desc: '原路退回，同步渠道流水号' },
  { title: '权益回收', desc: '回收未使用权益并写入账单流水' }
]

/* ============================ 云增强任务 ============================ */
export const cloudStats = {
  running: 6,
  todayTotal: 486,
  avgCost: 8.4,
  fileDeleted: 482
}

export const cloudTasks = [
  { id: 'CT20261010102', user: '138****6621', type: '超分增强', status: '成功', cost: 7.2, retry: 0, hash: 'a91f3c…7d20', upload: '已删除', created: '2026-10-10 10:12' },
  { id: 'CT20261010101', user: '188****9021', type: '换装生成', status: '处理中', cost: 12.6, retry: 0, hash: 'c02e77…41ba', upload: '使用中', created: '2026-10-10 10:09' },
  { id: 'CT20261010100', user: '186****3321', type: '背景替换', status: '成功', cost: 6.8, retry: 1, hash: 'ffee12…09ab', upload: '已删除', created: '2026-10-10 09:58' },
  { id: 'CT20261010098', user: '150****7788', type: '风格化', status: '失败', cost: 15.4, retry: 2, hash: '7ab901…cc34', upload: '待清理', created: '2026-10-10 09:41' },
  { id: 'CT20261010097', user: '133****5580', type: '超分增强', status: '成功', cost: 7.0, retry: 0, hash: '31cd88…5f77', upload: '已删除', created: '2026-10-10 09:22' },
  { id: 'CT20261010095', user: '155****8890', type: '换装生成', status: '排队中', cost: 0, retry: 0, hash: 'c9a044…1188', upload: '使用中', created: '2026-10-10 09:05' },
  { id: 'CT20261010093', user: '139****1043', type: '背景替换', status: '失败', cost: 14.1, retry: 3, hash: 'ee0192…aa30', upload: '待清理', created: '2026-10-10 08:47' },
  { id: 'CT20261010090', user: '159****0092', type: '风格化', status: '成功', cost: 11.2, retry: 0, hash: '55b7c1…9012', upload: '已删除', created: '2026-10-10 08:20' }
]

export const cloudTrend = {
  days: lastDays(14),
  upload: wave(14, 520, 240, 11.3),
  cost: wave(14, 8.4, 3, 12.7).map((v) => Number((v / 10).toFixed(1)))
}

/* ============================ 系统管理 ============================ */
export const roleOptions = ['超级管理员', '运营专员', '客服', '财务', '内容审核']

export const admins = [
  { id: 'AD-001', account: 'admin', name: '林小满', role: '超级管理员', dept: '运营中心', lastLogin: '2026-10-10 09:41', status: true, failCount: 0, ip: '10.12.3.21' },
  { id: 'AD-002', account: 'ops', name: '陈屿', role: '运营专员', dept: '内容运营组', lastLogin: '2026-10-10 09:12', status: true, failCount: 0, ip: '10.12.3.44' },
  { id: 'AD-003', account: 'service01', name: '王琪', role: '客服', dept: '用户服务组', lastLogin: '2026-10-10 08:58', status: true, failCount: 1, ip: '10.12.4.02' },
  { id: 'AD-004', account: 'finance01', name: '李默', role: '财务', dept: '财务组', lastLogin: '2026-10-09 18:20', status: true, failCount: 0, ip: '10.12.5.11' },
  { id: 'AD-005', account: 'audit01', name: '赵宁', role: '内容审核', dept: '安全合规组', lastLogin: '2026-10-09 17:05', status: true, failCount: 0, ip: '10.12.6.30' },
  { id: 'AD-006', account: 'intern02', name: '周舟', role: '运营专员', dept: '内容运营组', lastLogin: '2026-09-28 14:12', status: false, failCount: 5, ip: '10.12.3.87' }
]

export const permissionTree = [
  {
    id: 'content',
    label: '内容与素材',
    children: [
      { id: 'content:view', label: '查看模板素材' },
      { id: 'content:edit', label: '新增 / 编辑模板' },
      { id: 'content:online', label: '上下架操作' }
    ]
  },
  {
    id: 'user',
    label: '用户运营',
    children: [
      { id: 'user:view', label: '查看用户列表' },
      { id: 'user:quota', label: '额度调整' },
      { id: 'user:ban', label: '封禁 / 解封' }
    ]
  },
  {
    id: 'pay',
    label: '会员与支付',
    children: [
      { id: 'pay:plan', label: '会员规格配置' },
      { id: 'pay:order', label: '订单查询与补发' },
      { id: 'pay:refund', label: '退款审批' }
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    children: [
      { id: 'system:admin', label: '管理员与权限' },
      { id: 'system:audit', label: '操作审计查看' }
    ]
  }
]

export const roleStats = {
  roles: ['超级管理员', '运营专员', '客服', '财务', '内容审核'],
  counts: [128, 486, 312, 164, 208]
}

export const loginPolicy = {
  maxFail: 5,
  lockMinutes: 30,
  passwordDays: 90,
  auditRetention: '180 天'
}

/* ============================ 操作审计 ============================ */
export const auditTypes = ['全部', '模板上下架', '额度调整', '退款审批', '会员规格变更', '登录']

export const auditLogs = [
  { id: 'LOG-90231', time: '2026-10-10 10:12', account: 'ops', name: '陈屿', role: '运营专员', type: '模板上下架', target: 'TPL-2003 写真棚·落地窗逆光', result: '成功', ip: '10.12.3.44', detail: '因缺少版权来源登记，执行下架操作' },
  { id: 'LOG-90230', time: '2026-10-10 09:58', account: 'service01', name: '王琪', role: '客服', type: '退款审批', target: 'RF20261010003', result: '成功', ip: '10.12.4.02', detail: '提交主管复核，附用户沟通记录' },
  { id: 'LOG-90228', time: '2026-10-10 09:41', account: 'admin', name: '林小满', role: '超级管理员', type: '登录', target: '管理后台', result: '成功', ip: '10.12.3.21', detail: '密码登录，设备 Windows / Chrome' },
  { id: 'LOG-90225', time: '2026-10-10 09:22', account: 'ops', name: '陈屿', role: '运营专员', type: '会员规格变更', target: 'PLAN-Y 年卡', result: '成功', ip: '10.12.3.44', detail: '生效时间调整为 2026-10-15 00:00' },
  { id: 'LOG-90220', time: '2026-10-10 08:58', account: 'service01', name: '王琪', role: '客服', type: '额度调整', target: 'U-88170', result: '成功', ip: '10.12.4.02', detail: '任务失败补偿 +2 额度，流水号 QL202610100858' },
  { id: 'LOG-90211', time: '2026-10-09 22:10', account: 'finance01', name: '李默', role: '财务', type: '退款审批', target: 'RF20261009007', result: '成功', ip: '10.12.5.11', detail: '原路退回 19.00 元，渠道流水 4200002288202610920' },
  { id: 'LOG-90203', time: '2026-10-09 18:20', account: 'audit01', name: '赵宁', role: '内容审核', type: '模板上下架', target: 'TPL-5001 国风·红墙', result: '成功', ip: '10.12.6.30', detail: '复核第三方授权书后恢复上架' },
  { id: 'LOG-90198', time: '2026-10-09 17:05', account: 'intern02', name: '周舟', role: '运营专员', type: '登录', target: '管理后台', result: '失败', ip: '10.12.3.87', detail: '连续 5 次密码错误，账号已锁定 30 分钟' }
]

export const auditTypeDist = [
  { name: '模板上下架', value: 182 },
  { name: '额度调整', value: 96 },
  { name: '退款审批', value: 64 },
  { name: '会员规格变更', value: 28 },
  { name: '登录', value: 214 }
]

export const auditTrend = {
  days: lastDays(7),
  counts: [48, 62, 55, 74, 41, 33, 58]
}

/* ============================ 支付与权益流水（只读） ============================ */
export const stateMachine = [
  { key: 'CREATED', title: '下单', desc: '小程序发起，生成预付单' },
  { key: 'PAYING', title: '支付中', desc: '调起微信支付，等待回调' },
  { key: 'PAID', title: '已支付', desc: '回调验签通过，写渠道流水' },
  { key: 'GRANTED', title: '权益入账', desc: '发放额度 / 会员有效期' },
  { key: 'CLOSED', title: '关闭', desc: '超时未支付或用户取消' }
]

export const ledgerFlows = [
  { id: 'LG202610101002', order: 'AP202610101002', type: '权益入账', amount: '+ 30 张', status: '成功', time: '2026-10-10 10:02', operator: 'F-SRV-05' },
  { id: 'LG202610092239', order: 'AP202610092239', type: '权益入账', amount: '+ 365 天', status: '成功', time: '2026-10-09 22:39', operator: 'F-SRV-05' },
  { id: 'LG202610092013', order: 'AP202610092013', type: '权益入账', amount: '+ 90 天', status: '成功', time: '2026-10-09 20:13', operator: 'F-SRV-05' },
  { id: 'LG202610091812', order: 'AP202610091812', type: '权益冻结', amount: '- 月卡权益', status: '处理中', time: '2026-10-09 18:12', operator: 'F-SRV-04' },
  { id: 'LG202610081933', order: 'AP202610081933', type: '权益入账', amount: '+ 10 张', status: '成功', time: '2026-10-08 19:33', operator: 'F-SRV-05' },
  { id: 'LG202610081021', order: 'AP202610081021', type: '订单关闭', amount: '—', status: '成功', time: '2026-10-08 10:51', operator: 'F-SRV-04' },
  { id: 'LG202610071332', order: 'AP202610071332', type: '权益回收', amount: '- 50 张', status: '成功', time: '2026-10-07 13:40', operator: 'F-SRV-05' }
]

export const stateDist = [
  { name: '已支付 + 已入账', value: 862 },
  { name: '支付中', value: 24 },
  { name: '已关闭 / 超时', value: 96 },
  { name: '退款中', value: 12 }
]

/* ============================ 通知 ============================ */
export const notifications = [
  { id: 1, title: '3 笔退款待复核', desc: '最早一笔已等待 2 小时', time: '10 分钟前', type: 'accent' },
  { id: 2, title: '云任务失败 2 条', desc: '可手动重试或删除', time: '1 小时前', type: 'warm' },
  { id: 3, title: '版权来源待补充', desc: 'TPL-2003 已自动下架', time: '今天 09:12', type: 'primary' }
]
