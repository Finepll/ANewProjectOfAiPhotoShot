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

/** 把走势序列里落在「本月」的那些天加起来。
    KPI 卡上的「本月新增」和它下面那根柱子本该是同一批数据，
    写死一个数就会和曲线相加的结果对不上（前者 3120、曲线只有 1951）。 */
export function sumThisMonth(days, values) {
  const prefix = String(TODAY.getMonth() + 1).padStart(2, '0')
  return values.reduce((sum, value, i) => (days[i].startsWith(prefix) ? sum + value : sum), 0)
}

/* 用户增长序列。放在 KPI 之前定义，下面 userStats / dashboardKpis 都要从它取值。 */
export const userGrowth = {
  days: lastDays(14),
  newUsers: wave(14, 205, 90, 5.2),
  /* 量级直接落在这里：views 曾用 members.map(v => v/3) 在渲染时缩放，
     掩盖了真实数量，也让「付费转化」这个口径对不上。 */
  members: wave(14, 29, 13, 6.4)
}

/** Date / 时间字符串 → YYYY-MM-DD，供日期区间控件与列表里的时间文本做比较 */
export function dateKey(value) {
  const d = value instanceof Date ? value : new Date(value)
  const p = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 演示用的「当前时间」文本，与 TODAY 同源。
   各处需要「刚刚发生」的时间戳都应调它，避免写死成固定字符串而与页面其它时间脱节。 */
export function todayStamp(offsetMinutes = 0) {
  const d = new Date(TODAY.getTime() + offsetMinutes * 60000)
  const p = (v) => String(v).padStart(2, '0')
  return `${dateKey(d)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 依据现有编号生成下一个连号 id：取列表里最大的数字后缀 +1。
    不要用「数组长度」或「时间戳末几位」推编号——前者删掉一条再新增就会算出
    已存在的编号（列表出现重复 id，:key 也跟着重复），后者每 10 秒循环一次。 */
export function nextId(prefix, list, floor = 0) {
  const max = list.reduce((acc, item) => {
    const n = Number(String(item.id ?? '').slice(prefix.length))
    return Number.isFinite(n) && n > acc ? n : acc
  }, floor)
  return `${prefix}${max + 1}`
}

/* ============================ 版本信息 ============================ */
/* 登录页与侧边栏页脚共用的展示字段，只有这两个有消费方。
   原先还挂着 docName / moduleCount / env，三个都没人读：
   · env 的内容和 AdminLayout 里写死的「演示数据 · 未接后端」是同一件事的两种说法；
   · docName 那个合成标题在页面上从没出现过（「AI 照相馆」和「功能报告 V3.4」是分开放的）；
   · moduleCount 的 10 确实等于侧边栏的叶子页面数，但界面上没有它该待的位置。
   留着没人读的字段，最坏的效果是让人以为改了它会有效果。 */
export const demoMeta = {
  version: 'V3.4',
  featureCount: 39
}

/** 成功率走势。不能直接借 wave()：那是带向上漂移的随机游走，还取整，
    拿来当百分比会一路顶到 100——trend14 里 14 个点有 12 个被钳到 99.6，
    画在 y 轴上限 100 的图上就是一条贴着顶边的直线，看着像坏了。
    这里直接按「97.2 ± 1.6」构造，天生落在 95.6~98.8，不需要任何钳位。 */
export function successSeries(n, seed = 1) {
  const list = []
  for (let i = 0; i < n; i += 1) {
    const pseudo = Math.abs(Math.sin((i + 1) * seed * 12.9898) * 43758.5453) % 1
    list.push(Number((97.2 + (pseudo - 0.5) * 3.2).toFixed(1)))
  }
  return list
}

/** 把走势序列整体等比缩放到末点 = target（保留 N 位小数由调用方决定）。
    KPI 卡上的「今日 X」和它下面那根柱子的最后一格是同一个量：
    曲线由 wave() 随机游走、卡上另写一个数，两者必然对不上——
    「今日订单 96」配一条末点 92 的曲线、「今日 GMV 18640」配 15921，
    同一屏并排摆着，一眼就能看出有一个是假的。 */
export function pinLast(values, target) {
  const k = target / values[values.length - 1]
  const out = values.map((v) => Math.max(1, Math.round(v * k)))
  out[out.length - 1] = target
  return out
}

/** 按权重把总量切成整数份（最大余数法），结果求和恒等于 total。
    用于「一份总量、几种切法」的场景：各切法分别写死数字，改总量就会互相打架。 */
export function splitTotal(total, weights) {
  const sum = weights.reduce((acc, w) => acc + w, 0)
  const raw = weights.map((w) => (w * total) / sum)
  const out = raw.map((v) => Math.floor(v))
  let rest = total - out.reduce((acc, v) => acc + v, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && rest > 0; k += 1) { out[order[k].i] += 1; rest -= 1 }
  return out
}

/** 今日口径的唯一来源。看板 KPI、订单页 KPI、对账表首行、曲线末点都从这里取，
    任何一处要改都只改这里。 */
export const todayStats = {
  orders: 96,
  paidOrders: 88,
  gmv: 18640,
  /* 端侧 + 云端的今日生成量，以及云增强在其中占的比例（%） */
  genTotal: 1286,
  cloudShare: 38.6
}

/** 云端今日量按占比从总量里分出来，端侧拿剩下的——
    两个数相加恒等于 genTotal，占比也恒等于 cloudShare */
const CLOUD_TODAY = Math.round((todayStats.genTotal * todayStats.cloudShare) / 100)
const LOCAL_TODAY = todayStats.genTotal - CLOUD_TODAY

/* KPI 数组的唯一构造点：把「这几个数各自从哪来」集中在一处。
   看板首屏和刷新后的快照都调它，就不再有两份写法各算一遍的机会。 */
function dashboardKpiList({ gen, cloudShare, successRate, gmv, newUsers, pendingRefund }) {
  return [
    { key: 'gen', label: '今日生成量', value: gen, unit: '张', delta: 12.4, icon: 'PictureFilled', tone: 'primary', hint: '端侧+云端合计' },
    { key: 'cloud', label: '云增强占比', value: cloudShare, unit: '%', delta: -2.1, icon: 'Cloudy', tone: 'light', digits: 1, hint: '占全部生成' },
    { key: 'success', label: '生成成功率', value: successRate, unit: '%', delta: 0.8, icon: 'CircleCheckFilled', tone: 'warm', digits: 1, hint: '近 24 小时' },
    { key: 'user', label: '今日新增用户', value: newUsers, unit: '人', delta: 6.2, icon: 'UserFilled', tone: 'accent', hint: '小程序扫码授权' },
    { key: 'income', label: '今日会员收入', value: gmv, unit: '元', delta: 18.9, icon: 'Wallet', tone: 'primary', hint: '含单次包' },
    { key: 'refund', label: '待处理退款', value: pendingRefund, unit: '笔', delta: -3, icon: 'RefreshLeft', tone: 'accent', hint: '需主管复核' }
  ]
}

/* 由一组走势序列算出对应的 KPI 数组——卡片上的每个数都能在某一根曲线上指出出处 */
function kpisFromSeries({ local, cloud, successRate, gmv, newUsers, pendingRefund }) {
  const lt = local[local.length - 1]
  const ct = cloud[cloud.length - 1]
  return dashboardKpiList({
    gen: lt + ct,
    cloudShare: Number(((ct / (lt + ct)) * 100).toFixed(1)),
    /* 成功率卡片直接念曲线上最后一个点：这张卡旁边的图里就画着这条线，
       卡片另写一个数的话，出现「卡片 102.5%」而曲线天花板 100% 的场面。 */
    successRate: successRate[successRate.length - 1],
    gmv,
    newUsers,
    pendingRefund
  })
}

/* ============================ 运营看板 ============================ */
/* 看板 KPI 做成函数而不是常量数组：其中几项是别的页面的真实数据，
   必须在调用时才算得出来——
   「今日新增用户」= 用户增长序列的最后一天（原写死 214，曲线末点是 313）；
   「待处理退款」= 退款表里待复核的条数（原写死 7，实际只有 1 笔，
     而同一页的待办里就写着「1 笔退款申请待主管复核」，一张卡片当场自相矛盾）；
   「今日生成量」「云增强占比」「生成成功率」= 各自曲线末点算出来的（见 trend14）。
   写成函数还避开了 mock 里常量声明顺序的坑：常量数组在初始化时引用不到后面定义的表。 */
export function buildDashboardKpis() {
  return kpisFromSeries({
    local: trend14.local,
    cloud: trend14.cloud,
    successRate: trend14.successRate,
    gmv: todayStats.gmv,
    newUsers: userGrowth.newUsers[userGrowth.newUsers.length - 1],
    pendingRefund: refunds.filter((item) => item.status === '待复核').length
  })
}

/* 点「刷新数据」时用的一整套新数据。曲线由种子重新随机游走，
   相关的 KPI 卡再从这套新曲线里算出来——于是刷新后卡片和柱子仍然对得上。
   但只限于看板自己拥有的量：会员收入归对账表、新增用户归用户增长序列、
   待处理退款归退款表，这三项在别的页面同时显示着，看板刷新不许改它们。
   原先刷新是分三处各自随机的（曲线用新种子、每张卡片再各乘一个独立的 ±6% 系数），
   结果刷出过「生成成功率 102.5%」，还有卡片写 1319 张而柱子末点还是另一套数。 */
export function buildDashboardSnapshot(seed) {
  const local = wave(14, 780, 260, seed)
  const cloud = wave(14, 430, 180, seed + 0.7)
  const successRate = successSeries(14, seed + 1.3)
  return {
    trend: {
      days: lastDays(14),
      local,
      cloud,
      successRate,
      revenue: wave(14, 15200, 5200, seed + 2.1)
    },
    kpis: kpisFromSeries({
      local,
      cloud,
      successRate,
      /* 这三项不动，见上面的注释 */
      gmv: todayStats.gmv,
      newUsers: userGrowth.newUsers[userGrowth.newUsers.length - 1],
      pendingRefund: refunds.filter((item) => item.status === '待复核').length
    })
  }
}

export const trend14 = {
  days: lastDays(14),
  /* 两条曲线的末点由 todayStats 定死，中间的日子仍是随机游走 */
  local: pinLast(wave(14, 780, 260, 1.4), LOCAL_TODAY),
  cloud: pinLast(wave(14, 430, 180, 2.7), CLOUD_TODAY),
  successRate: successSeries(14, 3.3),
  revenue: wave(14, 15200, 5200, 4.1)
}

export const categoryDist = [
  { name: '证件照', value: 4820 },
  { name: '虚拟影楼', value: 3160 },
  { name: '毕业学士服', value: 2180 },
  { name: '职业形象照', value: 1460 },
  { name: '节日主题', value: 890 }
]

/* 名称必须与 templates 表里的 name 逐字一致：这份榜是「模板表按调用量排序」的视图，
   写别名（「蓝底一寸证件照」对应表里的「标准蓝底一寸」）会让榜单上的名字在模板表里查无此人，
   运营拿着这个榜去下架/置顶素材时找不到对象。
   调用量降序，合计 8502，占同期总量的大头。 */
export const hotTemplates = [
  { name: '标准蓝底一寸', value: 1842 },
  { name: '学士服 · 礼堂', value: 1526 },
  { name: '暖光影棚 · 米色幕布', value: 1388 },
  { name: '标准白底二寸', value: 1120 },
  { name: '职业形象 · 深灰', value: 968 },
  { name: '清新写真 · 花房', value: 742 },
  { name: '国风 · 红墙', value: 610 },
  { name: '学士服 · 校园草坪', value: 486 }
]

export const taskStatusDist = [
  { name: '端侧完成', value: 68 },
  { name: '云增强成功', value: 26 },
  { name: '排队 / 处理中', value: 4 },
  { name: '失败待重试', value: 2 }
]

/* 「模板与素材」页同时管背景模板和主题风格包，版权告警必须扫两边：
   原先只筛 templates，页面上写着「1 个素材缺少版权来源登记」，
   可同一个页面的主题页签里 THM-04 也是「待补充来源」。
   看板待办和右上角通知都从这里取，避免两处各写一份又走散。 */
export function copyrightRisky() {
  return [...templates, ...themePacks].filter((item) => item.copyright?.includes('待补充'))
}

/* 待办里的条数一律从各页面的真实数据算出来，不写死：
   原先固定写了「2 个模板素材缺少版权来源登记」「3 笔退款申请待主管复核」，
   而模板页按同一份数据只筛出 1 个、退款页只有 1 笔待复核——
   两个页面并排一看就自相矛盾，而且以后改数据还会继续错。
   plansSource 允许调用方传入自己那份规格数据：会员规格页编辑的是本地副本，
   不改传入的话，把年卡的生效日期改掉，看板待办还念着旧日期。 */
export function buildTodoList(plansSource = plans) {
  const pendingReview = refunds.filter((item) => item.status === '待复核').length
  const copyright = copyrightRisky().length
  const failed = cloudTasks.filter((item) => item.status === '失败').length
  const annual = plansSource.find((item) => item.name === '年卡')
  return [
    { id: 1, level: 'accent', text: `${pendingReview} 笔退款申请待主管复核`, path: '/member/refunds', time: '10 分钟前' },
    { id: 2, level: 'warm', text: `${copyright} 个素材缺少版权来源登记`, path: '/templates', time: '32 分钟前' },
    { id: 3, level: 'primary', text: `${failed} 个云增强任务失败待重试`, path: '/cloud-tasks', time: '1 小时前' },
    {
      id: 4,
      level: 'mute',
      text: annual ? `「${annual.name}」权益配置将于 ${annual.effectAt.slice(5, 10)} 生效` : '暂无待生效的规格调整',
      path: '/member/plans',
      time: '今天 09:12'
    }
  ]
}

/* ============================ 模板与素材 ============================ */
export const templateCategories = ['全部', '证件照', '虚拟影楼', '毕业照', '职业形象', '节日主题']

/* referenced = 引用过这个模板的历史工程数。报告 I-01 要求「被历史工程引用的模板
   只允许下架不允许删除」——工程不落盘、按模板快照回放，删掉模板记录就没有可核对的来源。
   待补充来源、从未上架的那个是 0，删除通道得有真能删的对象才验得出来。 */
/* cover / assets / blur / stylize 四项对应报告 I-01：「维护背景模板（分类、标签、名称、
   封面、底图资源、是否支持虚化、是否支持风格化）」。

   cover 存的是模板自己的渐变档位（0~3，对应 .tpl-card__cover--N），不是算出来的下标：
   原先卡片按 `index % 4` 取色，筛一次分类或翻一次页，全表封面颜色整体重排，
   同一个模板在不同筛选下长得不一样——那是个「按位置轮换的装饰」，不是「封面」。

   assets 是底图资源清单。报告 J-02 要求下发内容仅为素材与模型且需携带体积信息，
   所以它写的是资源构成（底图尺寸 / 换装层 / 蒙版），体积另由 size 字段承担。

   blur / stylize 不是装饰性标签：报告 B 线明确规定「证件照线禁用虚化、调焦、贴纸、
   涂鸦、文字与全部风格化能力，保证成品可用于正式场合」，所以证件照那三条必须都是
   false。这条约束由 mock_integrity 断言钉住，改数据时改不错。 */
export const templates = [
  { id: 'TPL-1001', name: '标准蓝底一寸', category: '证件照', theme: '官方标准', size: 1.8, copyright: '自有拍摄', status: true, updated: '2026-10-08', spec: '25×35mm / 295×413px', tags: ['免登记', '高频'], referenced: 186, cover: 0, assets: '纯色底 600×800 / 蒙版 512×512', blur: false, stylize: false },
  { id: 'TPL-1002', name: '标准白底二寸', category: '证件照', theme: '官方标准', size: 2.1, copyright: '自有拍摄', status: true, updated: '2026-10-08', spec: '35×49mm / 413×579px', tags: ['免登记'], referenced: 154, cover: 0, assets: '纯色底 600×800 / 蒙版 512×512', blur: false, stylize: false },
  { id: 'TPL-1003', name: '红底一寸（考研）', category: '证件照', theme: '官方标准', size: 1.6, copyright: '自有拍摄', status: true, updated: '2026-09-28', spec: '25×35mm / 295×413px', tags: ['考试'], referenced: 42, cover: 1, assets: '纯色底 600×800 / 蒙版 512×512', blur: false, stylize: false },
  { id: 'TPL-2001', name: '暖光影棚 · 米色幕布', category: '虚拟影楼', theme: '暖调影棚', size: 12.4, copyright: '合作摄影师授权', status: true, updated: '2026-10-05', spec: '1080×1440 引导框', tags: ['2D 引导'], referenced: 78, cover: 1, assets: '底图 1080×1440 / 蒙版 1024×1024', blur: true, stylize: false },
  { id: 'TPL-2002', name: '冷调影棚 · 灰蓝幕布', category: '虚拟影楼', theme: '冷调影棚', size: 11.9, copyright: '合作摄影师授权', status: true, updated: '2026-10-05', spec: '1080×1440 引导框', tags: ['2D 引导'], referenced: 63, cover: 1, assets: '底图 1080×1440 / 蒙版 1024×1024', blur: true, stylize: false },
  { id: 'TPL-2003', name: '写真棚 · 落地窗逆光', category: '虚拟影楼', theme: '自然光', size: 14.2, copyright: '待补充来源', status: false, updated: '2026-10-01', spec: '1080×1440 引导框', tags: ['待审核'], referenced: 0, cover: 2, assets: '底图 1080×1440 / 蒙版 1024×1024', blur: true, stylize: false },
  { id: 'TPL-3001', name: '学士服 · 礼堂', category: '毕业照', theme: '毕业季', size: 9.8, copyright: '自有设计', status: true, updated: '2026-09-30', spec: '换装 + 背景', tags: ['换装'], referenced: 31, cover: 2, assets: '底图 1080×1440 / 换装层 2 / 蒙版 1024×1024', blur: true, stylize: false },
  { id: 'TPL-3002', name: '学士服 · 校园草坪', category: '毕业照', theme: '毕业季', size: 10.6, copyright: '自有设计', status: true, updated: '2026-09-30', spec: '换装 + 背景', tags: ['换装'], referenced: 27, cover: 3, assets: '底图 1080×1440 / 换装层 2 / 蒙版 1024×1024', blur: true, stylize: false },
  { id: 'TPL-4001', name: '职业形象 · 深灰', category: '职业形象', theme: '商务', size: 8.4, copyright: '自有设计', status: true, updated: '2026-09-22', spec: '换装 + 换底', tags: ['简历'], referenced: 95, cover: 0, assets: '底图 1080×1440 / 换装层 2 / 蒙版 1024×1024', blur: false, stylize: false },
  { id: 'TPL-4002', name: '职业形象 · 藏青正装', category: '职业形象', theme: '商务', size: 8.9, copyright: '自有设计', status: false, updated: '2026-09-18', spec: '换装 + 换底', tags: ['下架中'], referenced: 18, cover: 0, assets: '底图 1080×1440 / 换装层 2 / 蒙版 1024×1024', blur: false, stylize: false },
  { id: 'TPL-5001', name: '国风 · 红墙', category: '节日主题', theme: '国风', size: 6.2, copyright: '第三方素材（已附授权书）', status: true, updated: '2026-09-15', spec: '风格化背景', tags: ['风格化'], referenced: 12, cover: 3, assets: '风格化底图 1080×1440 / LUT / 蒙版 1024×1024', blur: true, stylize: true },
  { id: 'TPL-5002', name: '清新写真 · 花房', category: '节日主题', theme: '清新', size: 7.1, copyright: '第三方素材（已附授权书）', status: true, updated: '2026-09-12', spec: '风格化背景', tags: ['风格化'], referenced: 9, cover: 2, assets: '风格化底图 1080×1440 / LUT / 蒙版 1024×1024', blur: true, stylize: true }
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
  /* 本月新增从增长序列里切出来求和，不写死：
     原先写 3120，而上面那张「近 14 天用户增长」的柱子落在 10 月的部分只有 1951，
     KPI 卡和它自己的图差 60%。 */
  monthNew: sumThisMonth(userGrowth.days, userGrowth.newUsers),
  member: 6842,
  banned: 37
}

/* 剩余额度分布的统计口径是「付费会员」：免费用户额度恒为 0，混进来会让
   「额度 0（已耗尽）」这一档虚高、也读不出耗尽与否。
   所以四档之和必须等于 userStats.member——页面上的合计由这组数自己求和，
   不再手写一个和档位无关的人数。
   分档要首尾相接不重叠：原先「6~20」与「20 以上」在 20 这个点上重叠。 */
export const quotaDistribution = [
  { name: '额度 0（已耗尽）', value: 812 },
  { name: '额度 1~5', value: 2140 },
  { name: '额度 6~20', value: 2460 },
  { name: '额度 21 以上', value: 1430 }
]

/* tasks 与 grants 对应报告 I-02：「用户列表与详情（脱敏展示，仅含手机号掩码、注册时间、
   任务次数、剩余额度与授权签署记录，不提供任何人脸原图查看能力）」。

   tasks 是累计生成任务次数（端侧 + 云端）。它不能拿 orders 顶替：一次订单可能产出多次
   任务，所以恒有 tasks ≥ orders；而没有订单的免费用户照样会有任务（每日免费额度那 5 张），
   反过来 orders 为 0 而 tasks 不为 0 是常态。

   grants 是云增强能力的授权签署记录，对应报告 A-04：首次使用超分 / 模型级风格化 /
   生成式背景时逐次弹授权说明，记录可在隐私看板随时撤回——所以它有「已撤回」这个状态，
   不是只有签或不签两种。空数组不代表缺数据，代表「从未授权过云能力」，列表里要显示
   成「无记录」而不是留白。
   签署时间是已经发生过的历史记录，所以与 registered / lastActive 一样写死字符串；
   todayStamp 留给「刚刚发生」的流水时间（见 quotaLogsFor），两者不要混用——
   演示时钟 TODAY 是写死的常量，用偏移量去凑一个「注册之后的时刻」会随常量漂移。 */
export const users = [
  {
    id: 'U-88201', phone: '138****6621', nick: '小满同学', registered: '2026-10-09 14:22',
    quota: 12, member: '月卡', status: '正常', lastActive: '今天 10:02', orders: 3, tasks: 18,
    grants: [{ ability: '超分', signedAt: '2026-10-09 20:00', status: '已签署' }]
  },
  {
    id: 'U-88200', phone: '139****1043', nick: '阿屿', registered: '2026-10-09 11:05',
    quota: 3, member: '无', status: '正常', lastActive: '今天 09:41', orders: 1, tasks: 6,
    grants: []
  },
  {
    id: 'U-88198', phone: '155****8890', nick: 'Luna', registered: '2026-10-08 20:37',
    quota: 0, member: '年卡', status: '正常', lastActive: '昨天 22:10', orders: 6, tasks: 34,
    grants: [
      { ability: '超分', signedAt: '2026-10-09 21:30', status: '已签署' },
      { ability: '生成式背景', signedAt: '2026-10-08 22:00', status: '已撤回' }
    ]
  },
  {
    id: 'U-88195', phone: '186****3321', nick: '摄影小白', registered: '2026-10-08 09:18',
    quota: 5, member: '季卡', status: '正常', lastActive: '昨天 19:02', orders: 2, tasks: 11,
    grants: [{ ability: '模型级风格化', signedAt: '2026-10-09 19:00', status: '已签署' }]
  },
  {
    id: 'U-88190', phone: '137****4477', nick: '小张', registered: '2026-10-07 16:44',
    quota: 1, member: '无', status: '额度冻结', lastActive: '10-07 17:20', orders: 0, tasks: 2,
    grants: []
  },
  {
    id: 'U-88184', phone: '188****9021', nick: '橘子汽水', registered: '2026-10-06 10:02',
    quota: 22, member: '年卡', status: '正常', lastActive: '今天 08:33', orders: 9, tasks: 52,
    grants: [
      { ability: '超分', signedAt: '2026-10-07 14:00', status: '已签署' },
      { ability: '生成式背景', signedAt: '2026-10-08 16:00', status: '已签署' },
      { ability: '模型级风格化', signedAt: '2026-10-09 10:00', status: '已撤回' }
    ]
  },
  {
    id: 'U-88180', phone: '133****5580', nick: '夜行灯', registered: '2026-10-05 21:19',
    quota: 4, member: '月卡', status: '正常', lastActive: '昨天 21:44', orders: 2, tasks: 9,
    grants: []
  },
  {
    id: 'U-88177', phone: '177****2210', nick: '毕业季', registered: '2026-10-05 15:08',
    quota: 0, member: '无', status: '封禁', lastActive: '10-05 16:31', orders: 0, tasks: 1,
    grants: [{ ability: '生成式背景', signedAt: '2026-10-05 16:00', status: '已撤回' }]
  },
  {
    id: 'U-88170', phone: '150****7788', nick: '一只猫', registered: '2026-10-04 13:26',
    quota: 8, member: '季卡', status: '正常', lastActive: '今天 07:58', orders: 4, tasks: 23,
    grants: [{ ability: '超分', signedAt: '2026-10-06 10:00', status: '已签署' }]
  },
  {
    id: 'U-88162', phone: '159****0092', nick: '可乐不加冰', registered: '2026-10-03 19:55',
    quota: 2, member: '无', status: '正常', lastActive: '10-08 22:04', orders: 1, tasks: 4,
    grants: []
  }
]

/** 单个用户的额度流水。
    原先是一份所有用户共用的 quotaLogs，抽屉里无论点谁都是同一串记录，
    余额还与列表中的额度对不上。这里按用户自身数据从「当前余额」往回推，
    保证最新一条的余额恒等于 user.quota；无随机，刷新结果稳定。 */
export function quotaLogsFor(user) {
  const grant = { 月卡: 30, 季卡: 90, 年卡: 365 }[user.member] || 0
  const remark = ['证件照·标准蓝底一寸', '虚拟影楼·暖光棚', '证件照·白底二寸', '写真·胶片质感']
  /* 历史窗口长度：跟订单数挂钩，用户之间条数不同；发放额太大时窗口装不下则只列消耗 */
  const used = Math.min(10, Math.max(3 + (user.orders % 3), grant - user.quota))

  const rows = []
  let balance = user.quota
  for (let i = 0; i < used; i += 1) {
    rows.push({
      time: todayStamp(-(25 + i * 95)),
      type: '生成扣减',
      amount: -1,
      balance,
      remark: remark[i % remark.length],
      operator: '系统'
    })
    balance += 1 // 这条扣减发生之前的余额
  }
  /* 仅当历史足够长、发放前余额不为负时才列出会员发放 */
  if (grant && balance >= grant) {
    rows.push({
      time: todayStamp(-30 * 60),
      type: '会员发放',
      amount: grant,
      balance,
      remark: `${user.member}权益入账`,
      operator: 'F-SRV-05'
    })
  }
  return rows.reverse() // 最新的在前
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

/* grant 是这张规格实际发放的东西，单列一个字段而不是从 benefits 的句子里面抠数字：
   「10 张云增强额度」这种文案里数字和单位的位置随时会被人改掉。
   订阅制发的是时长（天），计次包发的是张数——订单流水、人工补发下拉框都读它。
   原先这几处各写各的：月卡那笔流水的权益写成「+ 30 张」，
   而月卡和年卡、季卡一样是订阅制，年卡写「+ 365 天」、季卡写「+ 90 天」，
   只有月卡把「30 天」的天字写成了张。 */
export const plans = [
  { id: 'PLAN-M', name: '月卡', type: '订阅', price: 19, origin: 29, duration: '30 天', grant: '30 天', status: true, effectAt: '2026-09-01 00:00', sellCount: 3820, recommend: false, upgrade: '按剩余天数折算 50%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出'] },
  { id: 'PLAN-Q', name: '季卡', type: '订阅', price: 49, origin: 87, duration: '90 天', grant: '90 天', status: true, effectAt: '2026-09-01 00:00', sellCount: 1642, recommend: true, upgrade: '按剩余天数折算 60%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出', '虚拟影楼全部背景模板'] },
  { id: 'PLAN-Y', name: '年卡', type: '订阅', price: 149, origin: 348, duration: '365 天', grant: '365 天', status: true, effectAt: '2026-10-15 00:00', sellCount: 680, recommend: false, upgrade: '按剩余天数折算 70%', benefits: ['每日 5 张免费额度', '云增强免费用量（20 次/月）', '高清无水印导出', '虚拟影楼全部背景模板', '风格化主题包全解锁', '优先生成队列'] },
  { id: 'PLAN-P10', name: '单次包 · 10 张', type: '计次', price: 9.9, origin: 19.9, duration: '90 天有效', grant: '10 张', status: true, effectAt: '2026-08-20 00:00', sellCount: 5240, recommend: false, upgrade: '不支持折算升级', benefits: ['10 张云增强额度', '高清无水印导出'] },
  { id: 'PLAN-P50', name: '单次包 · 50 张', type: '计次', price: 39, origin: 99, duration: '180 天有效', grant: '50 张', status: false, effectAt: '2026-08-20 00:00', sellCount: 1120, recommend: false, upgrade: '不支持折算升级', benefits: ['50 张云增强额度', '高清无水印导出'] }
]

/** 某个规格发放的权益文案，例如「30 天」「10 张」。
    权益流水与人工补发弹窗都从这里取，不再各写一份。 */
export function planGrant(planName) {
  return plans.find((item) => item.name === planName)?.grant || '—'
}

/* 销售额 = 单价 × 销量，五项都对得上：月卡 19×3820、季卡 49×1642、年卡 149×680、
   单次包 10 张 9.9×5240、单次包 50 张 39×1120。
   月卡原先记 72460，比 19×3820 少 120 元，是五档里唯一的例外——
   这类「差一点点」的数字最容易被当成四舍五入放过去，但对着单价一乘就露馅。 */
export const planSales = {
  names: ['月卡', '季卡', '年卡', '单次包 10 张', '单次包 50 张'],
  amounts: [72580, 80458, 101320, 51876, 43680],
  counts: [3820, 1642, 680, 5240, 1120]
}

/* discount 是该单实际减免的金额（元），0 表示没用券。
   它是「金额」旁边的独立一列，不改 amount 的口径——
   amount 仍是订单金额，页面另有平台记账/渠道账单两条对账口径，
   再引入一个「实付」会让四条口径互相打架，对账视图就说不清了。 */
export const orders = [
  { id: 'AP202610101002', user: '138****6621', plan: '月卡', amount: 19, discount: 5, channel: '微信支付', status: '已支付', tradeNo: '4200002310202610107', created: '2026-10-10 10:02', abnormal: false, delivered: true },
  { id: 'AP202610100941', user: '139****1043', plan: '单次包 · 10 张', amount: 9.9, discount: 0, channel: '微信支付', status: '待支付', tradeNo: '-', created: '2026-10-10 09:41', abnormal: false, delivered: false },
  { id: 'AP202610092239', user: '155****8890', plan: '年卡', amount: 149, discount: 20, channel: '微信支付', status: '已退款', tradeNo: '4200002309202609237', created: '2026-10-09 22:39', abnormal: false, delivered: false },
  { id: 'AP202610092013', user: '186****3321', plan: '季卡', amount: 49, discount: 0, channel: '微信支付', status: '已支付', tradeNo: '4200002288202610920', created: '2026-10-09 20:13', abnormal: false, delivered: true },
  { id: 'AP202610091812', user: '188****9021', plan: '月卡', amount: 19, discount: 0, channel: '微信支付', status: '退款中', tradeNo: '4200002277202609181', created: '2026-10-09 18:12', abnormal: true, delivered: true },
  { id: 'AP202610081933', user: '133****5580', plan: '单次包 · 10 张', amount: 9.9, discount: 0, channel: '微信支付', status: '退款中', tradeNo: '4200002266202608193', created: '2026-10-08 19:33', abnormal: false, delivered: true },
  { id: 'AP202610081021', user: '150****7788', plan: '季卡', amount: 49, discount: 0, channel: '微信支付', status: '支付超时', tradeNo: '-', created: '2026-10-08 10:21', abnormal: false, delivered: false },
  { id: 'AP202610072044', user: '159****0092', plan: '月卡', amount: 19, discount: 3, channel: '微信支付', status: '已退款', tradeNo: '4200002244202607204', created: '2026-10-07 20:44', abnormal: false, delivered: false },
  { id: 'AP202610071332', user: '137****4477', plan: '单次包 · 50 张', amount: 39, discount: 0, channel: '微信支付', status: '已关闭', tradeNo: '-', created: '2026-10-07 13:32', abnormal: true, delivered: false },
  { id: 'AP202610061155', user: '177****2210', plan: '月卡', amount: 19, discount: 0, channel: '微信支付', status: '已支付', tradeNo: '4200002222202606115', created: '2026-10-06 11:55', abnormal: false, delivered: true }
]
/* 订单状态是退款单的「上游事实」，必须跟着退款走：
   RF20261010002 待复核、RF20261009007 与 RF20261008011 已打款，
   对应订单却都停在「已支付」——钱已经退了，订单页还显示已支付，
   客服拿着这个订单号只会告诉用户「您的订单正常」。
   RF202610091812 那笔退款进行中，所以它对应的订单是「退款中」，两者一致。 */

export const orderTrend = {
  days: lastDays(14),
  /* 末点钉到今日 KPI：这一屏的卡片和曲线说的是同一天，
     卡片 18640 / 96 而曲线末点 15921 / 92 的话，两个数至少有一个是错的 */
  gmv: pinLast(wave(14, 16400, 6400, 7.3), todayStats.gmv),
  orders: pinLast(wave(14, 96, 42, 8.1), todayStats.orders)
}

export const channelDist = [
  { name: '微信支付', value: 86 },
  { name: 'Apple 内购', value: 9 },
  { name: '支付宝', value: 5 }
]

export const reconciliation = [
  /* 首行就是当天，金额取自 todayStats，跟看板卡片同一个数 */
  { day: '2026-10-10', platform: todayStats.gmv, channel: todayStats.gmv, diff: 0 },
  { day: '2026-10-09', platform: 21480, channel: 21480, diff: 0 },
  { day: '2026-10-08', platform: 16230, channel: 16230, diff: 0 },
  { day: '2026-10-07', platform: 17880, channel: 17781, diff: -99, note: '渠道手续费单笔差异，待核对' },
  { day: '2026-10-06', platform: 15240, channel: 15240, diff: 0 },
  { day: '2026-10-05', platform: 19360, channel: 19360, diff: 0 }
]

/* ============================ 退款与售后 ============================ */
/* 一张退款单要同时喂两个东西，所以字段各司其职、互不推断：
   - flow  ：真实发生过的流水事件，每条带 stage（对应 refundSteps 的第几步）
   - step  ：已完成的阶段数，只用来算 el-steps 的进度高亮
   - skipped：本单免走的阶段（金额 < 100 元时跳过的「主管复核」），渲染成灰色待定
   - rejectedAt：被驳回的阶段，渲染成红色，终态
   原先三者用同一个 step 数字推断，会把没发生的节点画成带完成时间的记录。 */
export const refunds = [
  {
    id: 'RF20261010003', order: 'AP202610091812', user: '188****9021', plan: '月卡', amount: 19,
    /* 19 元也要二级复核，走的是「已使用权益」这条触发条件（见 refundSteps 第 3 步）。
       改成 149 元年卡能让金额条件成立，但会连带订单表与权益流水（都写着月卡）对不上，
       所以这里把触发原因显式存下来，由 needSecondReview() 统一判定。 */
    usedBenefit: true,
    reason: '误购，本月已购季卡', status: '待复核', applyAt: '2026-10-10 09:58', channel: '微信支付',
    step: 2, operator: '客服·王琪',
    flow: [
      { stage: 1, title: '申请提交', detail: '2026-10-10 09:58 · 用户端' },
      { stage: 2, title: '客服初审', detail: '2026-10-10 10:12 · 客服·王琪 · 本月已用 14 张，按「已使用权益需复核」转主管判定' }
    ]
  },
  {
    id: 'RF20261010002', order: 'AP202610081933', user: '133****5580', plan: '单次包 · 10 张', amount: 9.9,
    reason: '生成效果与预览不符', status: '待初审', applyAt: '2026-10-10 08:41', channel: '微信支付',
    step: 1, operator: '-',
    flow: [{ stage: 1, title: '申请提交', detail: '2026-10-10 08:41 · 用户端' }]
  },
  {
    id: 'RF20261009007', order: 'AP202610072044', user: '159****0092', plan: '月卡', amount: 19,
    reason: '重复扣款', status: '已打款', applyAt: '2026-10-09 22:10', channel: '微信支付',
    /* 19 元免二级复核，但财务打款是第 4 步，所以 skipped 里补上第 3 步。
       第 5 步「权益回收」不是可跳过的条件步骤（refundSteps 里它没有前置条件），
       已打款的单子漏了它，订单页就会停在「已退款但权益还在用户手里」的假状态。 */
    step: 5, skipped: [3], operator: '财务·李默',
    flow: [
      { stage: 1, title: '申请提交', detail: '2026-10-09 22:10 · 用户端' },
      { stage: 2, title: '客服初审', detail: '2026-10-09 22:26 · 客服·王琪 · 确认渠道重复扣款，金额 < 100 元免复核' },
      { stage: 4, title: '财务打款', detail: '2026-10-09 23:05 · 财务·李默 · 渠道流水 4200002244202607204' },
      { stage: 5, title: '权益回收', detail: '2026-10-09 23:06 · F-SRV-05 · 已回收未使用权益并写入账单流水' }
    ]
  },
  {
    id: 'RF20261009005', order: 'AP202610061155', user: '177****2210', plan: '月卡', amount: 19,
    usedBenefit: true,
    reason: '账号违规被封禁，申请退款', status: '已驳回', applyAt: '2026-10-09 15:32', channel: '微信支付',
    step: 2, rejectedAt: 3, operator: '主管·赵宁',
    flow: [
      { stage: 1, title: '申请提交', detail: '2026-10-09 15:32 · 用户端' },
      { stage: 2, title: '客服初审', detail: '2026-10-09 15:50 · 客服·王琪 · 权益已使用，转主管判定' },
      { stage: 3, title: '驳回', tone: 'error', detail: '2026-10-09 16:05 · 主管·赵宁 · 账号因违规被封禁，不符合退款条件' }
    ]
  },
  {
    id: 'RF20261008011', order: 'AP202610092239', user: '155****8890', plan: '年卡', amount: 149,
    reason: '重复购买年卡', status: '已打款', applyAt: '2026-10-08 20:12', channel: '微信支付',
    step: 5, operator: '财务·李默',
    flow: [
      { stage: 1, title: '申请提交', detail: '2026-10-08 20:12 · 用户端' },
      { stage: 2, title: '客服初审', detail: '2026-10-08 20:30 · 客服·王琪 · 两笔订单间隔 6 分钟' },
      { stage: 3, title: '主管复核', detail: '2026-10-08 21:02 · 主管·赵宁 · 金额 ≥ 100 元，二级审批通过' },
      { stage: 4, title: '财务打款', detail: '2026-10-08 21:20 · 财务·李默 · 渠道流水 4200002309202609237' },
      { stage: 5, title: '权益回收', detail: '2026-10-08 21:21 · F-SRV-05 · 已回收未使用权益并写入账单流水' }
    ]
  }
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

/* 退款原因分布，口径是「近 30 天全部退款」。
   同屏的退款申请表里列的是近期申请样例（5 笔），两个数字口径不同——
   界面上必须把这个差别写出来，否则「饼图 42 笔 / 表格共 5 笔」看着就是自相矛盾。
   原先这组数据直接写在页面的图表配置里，四个数合计 42，
   页面上没有任何一处说明这 42 是什么。 */
export const refundReasons = [
  { name: '误购 / 重复购买', value: 18 },
  { name: '效果与预览不符', value: 12 },
  { name: '生成失败未补偿', value: 7 },
  { name: '其他', value: 5 }
]

/** 近 30 天退款总笔数，取原因分布的合计，页面上的标题直接标出来 */
export const REFUND_TOTAL_30D = refundReasons.reduce((sum, item) => sum + item.value, 0)

/* ============================ 云增强任务 ============================ */
export const cloudStats = {
  running: 6,
  /* 今日云增强任务数就是今日云端生成量：一个任务产出一张云端图片。
     这里原先是写死的 486，而看板那边由 genTotal × cloudShare 推出 496——
     同一个「今日云端量」有两个值，于是云任务页那句
     「今日云增强任务 486 次，占全部生成 38.6%」成了抄来的比例配自己的数：
     486 / 1286 其实是 37.8%。现在两边都从 todayStats 派生，恒等。 */
  todayTotal: CLOUD_TODAY,
  avgCost: 8.4,
  /* 上行文件在结果回传后即时销毁，所以还留着的只有进行中的那几个。
     原先写死 482，与 todayTotal 之间的关系看不出来，改一个另一个不会动。 */
  get fileDeleted() {
    return this.todayTotal - this.running
  }
}

/* failReason 只有失败任务才有值，其余是空串而不是固定文案——
   「原因」这个字段一旦给成功任务也填一句，失败筛选出来的原因列就没法一眼扫。
   两条失败原因刻意选了不同类别：一条是模型侧超时（可重试），
   一条是文件传输损坏（重试多少次都一样，得让用户重传），
   原因列的价值就在于区分这两种后续动作。 */
export const cloudTasks = [
  { id: 'CT20261010102', user: '138****6621', type: '超分增强', status: '成功', cost: 7.2, retry: 0, hash: 'a91f3c…7d20', upload: '已删除', created: '2026-10-10 10:12', failReason: '' },
  { id: 'CT20261010101', user: '188****9021', type: '换装生成', status: '处理中', cost: 12.6, retry: 0, hash: 'c02e77…41ba', upload: '使用中', created: '2026-10-10 10:09', failReason: '' },
  { id: 'CT20261010100', user: '186****3321', type: '背景替换', status: '成功', cost: 6.8, retry: 1, hash: 'ffee12…09ab', upload: '已删除', created: '2026-10-10 09:58', failReason: '' },
  { id: 'CT20261010098', user: '150****7788', type: '风格化', status: '失败', cost: 15.4, retry: 2, hash: '7ab901…cc34', upload: '待清理', created: '2026-10-10 09:41', failReason: '风格化模型推理超时（30s 上限）' },
  { id: 'CT20261010097', user: '133****5580', type: '超分增强', status: '成功', cost: 7.0, retry: 0, hash: '31cd88…5f77', upload: '已删除', created: '2026-10-10 09:22', failReason: '' },
  { id: 'CT20261010095', user: '155****8890', type: '换装生成', status: '排队中', cost: 0, retry: 0, hash: 'c9a044…1188', upload: '使用中', created: '2026-10-10 09:05', failReason: '' },
  { id: 'CT20261010093', user: '139****1043', type: '背景替换', status: '失败', cost: 14.1, retry: 3, hash: 'ee0192…aa30', upload: '待清理', created: '2026-10-10 08:47', failReason: '上行文件 MD5 校验不匹配，判定为传输损坏' },
  { id: 'CT20261010090', user: '159****0092', type: '风格化', status: '成功', cost: 11.2, retry: 0, hash: '55b7c1…9012', upload: '已删除', created: '2026-10-10 08:20', failReason: '' }
]

export const cloudTrend = {
  days: lastDays(14),
  /* 末点 = 今日云端量（cloudStats.todayTotal，也就是 trend14.cloud 的末点）。
     同一天的上下两个数不能各说各话：卡片写今日 N 次，曲线末格却是别的值，
     看的人第一反应是哪个统计漏了。 */
  upload: pinLast(wave(14, 520, 240, 11.3), cloudStats.todayTotal),
  /* 单位是秒，曲线围绕 8.4 波动，与 KPI「平均耗时 8.4s」同源。
     原先多除了一个 10，曲线落在 0.5~1.1，看着像 1 秒不到，与同一页的 8.4s 打架。 */
  cost: wave(14, 8.4, 3, 12.7).map((v) => Number(v.toFixed(1)))
}

/* ============================ 系统管理 ============================ */
export const roleOptions = ['超级管理员', '运营专员', '客服', '财务', '内容审核']

/* phone / email 存的就是掩码值本身，不是明文。
   报告 §三 规则(4) 要求「管理员手机号与邮箱在列表页一律脱敏展示」，
   实现上有两条路：前端拿明文再截断，或者服务端只返回掩码。
   这里按后者存——前端手里没有原文，就不存在「某个地方忘了脱敏」的口子，
   列表、详情、导出、DevTools 看到的是同一串掩码，是结构上做不到泄露。 */
export const admins = [
  { id: 'AD-001', account: 'admin', name: '林小满', phone: '138****2093', email: 'lin***@aiphoto.cn', role: '超级管理员', dept: '运营中心', lastLogin: '2026-10-10 09:41', status: true, failCount: 0, ip: '10.12.3.21' },
  { id: 'AD-002', account: 'ops', name: '陈屿', phone: '137****4416', email: 'chen***@aiphoto.cn', role: '运营专员', dept: '内容运营组', lastLogin: '2026-10-10 09:12', status: true, failCount: 0, ip: '10.12.3.44' },
  { id: 'AD-003', account: 'service01', name: '王琪', phone: '159****7728', email: 'wang***@aiphoto.cn', role: '客服', dept: '用户服务组', lastLogin: '2026-10-10 08:58', status: true, failCount: 1, ip: '10.12.4.02' },
  { id: 'AD-004', account: 'finance01', name: '李默', phone: '186****3054', email: 'li***@aiphoto.cn', role: '财务', dept: '财务组', lastLogin: '2026-10-09 18:20', status: true, failCount: 0, ip: '10.12.5.11' },
  { id: 'AD-005', account: 'audit01', name: '赵宁', phone: '135****6187', email: 'zhao***@aiphoto.cn', role: '内容审核', dept: '安全合规组', lastLogin: '2026-10-09 17:05', status: true, failCount: 0, ip: '10.12.6.30' },
  { id: 'AD-006', account: 'intern02', name: '周舟', phone: '177****9026', email: 'zhou***@aiphoto.cn', role: '运营专员', dept: '内容运营组', lastLogin: '2026-09-28 14:12', status: false, failCount: 5, ip: '10.12.3.87' }
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

/* 近 7 天的操作总量。按类型、按角色、按天是同一批操作的三种切法，
   合计必须相等——否则「操作审计」页写「近 7 天共 584 次」，
   而「管理员与权限」页五根角色柱相加是另一个数，同一系统两个数打架。
   下面三组数据都用 splitTotal 从它切出来：数组里的数字是权重、不是绝对值，
   改总量时三组会一起跟着变，不用去三个地方各调一次。 */
export const AUDIT_TOTAL_7D = 584

export const roleStats = {
  roles: ['超级管理员', '运营专员', '客服', '财务', '内容审核'],
  counts: splitTotal(AUDIT_TOTAL_7D, [64, 186, 148, 76, 110])
}

export const loginPolicy = {
  maxFail: 5,
  lockMinutes: 30,
  passwordDays: 90,
  /* 保留期存成数字而不是「180 天」这种字符串：
     操作审计页和模板与素材页都要读它渲染文案，数字才能直接参与运算；
     自由文本还能让人填出「三十天」这类没法消费的值。 */
  auditRetentionDays: 180
}

/* ============================ 操作审计 ============================ */
/* 报告 §三 规则(3) 点名了四类必须留痕的敏感操作：额度调整、封禁、删除云任务、
   模板上下架。原先这张枚举只有后两类加退款与登录，封禁和删云任务做完了没有
   对应的类型可记，于是页面上写着「已写入操作审计」而审计里查无此事。 */
export const auditTypes = ['全部', '模板上下架', '额度调整', '用户封禁', '云任务处置', '退款审批', '会员规格变更', '登录']

export const auditLogs = [
  { id: 'LOG-90231', time: '2026-10-10 10:12', account: 'ops', name: '陈屿', role: '运营专员', type: '模板上下架', target: 'TPL-2003 写真棚·落地窗逆光', result: '成功', ip: '10.12.3.44', detail: '因缺少版权来源登记，执行下架操作' },
  { id: 'LOG-90230', time: '2026-10-10 09:58', account: 'service01', name: '王琪', role: '客服', type: '退款审批', target: 'RF20261010003', result: '成功', ip: '10.12.4.02', detail: '提交主管复核，附用户沟通记录' },
  { id: 'LOG-90228', time: '2026-10-10 09:41', account: 'admin', name: '林小满', role: '超级管理员', type: '登录', target: '管理后台', result: '成功', ip: '10.12.3.21', detail: '密码登录，设备 Windows / Chrome' },
  { id: 'LOG-90225', time: '2026-10-10 09:22', account: 'ops', name: '陈屿', role: '运营专员', type: '会员规格变更', target: 'PLAN-Y 年卡', result: '成功', ip: '10.12.3.44', detail: '生效时间调整为 2026-10-15 00:00' },
  { id: 'LOG-90220', time: '2026-10-10 08:58', account: 'service01', name: '王琪', role: '客服', type: '额度调整', target: 'U-88170', result: '成功', ip: '10.12.4.02', detail: '任务失败补偿 +2 额度，流水号 QL202610100858' },
  { id: 'LOG-90211', time: '2026-10-09 22:10', account: 'finance01', name: '李默', role: '财务', type: '退款审批', target: 'RF20261009007', result: '成功', ip: '10.12.5.11', detail: '原路退回 19.00 元，渠道流水 4200002244202607204' },
  { id: 'LOG-90203', time: '2026-10-09 18:20', account: 'audit01', name: '赵宁', role: '内容审核', type: '模板上下架', target: 'TPL-5001 国风·红墙', result: '成功', ip: '10.12.6.30', detail: '复核第三方授权书后恢复上架' },
  { id: 'LOG-90198', time: '2026-10-09 17:05', account: 'intern02', name: '周舟', role: '运营专员', type: '登录', target: '管理后台', result: '失败', ip: '10.12.3.87', detail: '连续 5 次密码错误，账号已锁定 30 分钟' }
]

/* 敏感操作写入审计。

   报告 §三 规则(3)：额度调整、封禁、删除云任务、模板上下架均属敏感操作，
   必须写入审计日志（操作人、时间、业务号、变更前后内容）。

   这里刻意用普通数组原地 unshift，不做成响应式对象：
     · 写方有四个页面、读方只有审计页一个，而路由没有 keep-alive，
       审计页每次进入都重新挂载、setup 里重新读一遍，跨页响应式是多余的；
     · mock 是纯数据模块，mock_integrity 直接在 Node 里 import 它，
       在这里 import vue 会把纯数据检查拖上框架依赖。 */
export function appendAudit({ operator, type, target, detail, result = '成功' }) {
  auditLogs.unshift({
    id: nextId('LOG-', auditLogs, 90000),
    time: todayStamp(),
    account: operator?.account || 'admin',
    name: operator?.name || '—',
    role: operator?.role || '—',
    type,
    target,
    detail,
    result,
    /* 演示环境固定值。真实环境由服务端取客户端 IP，前端既拿不到也不该编 */
    ip: '10.12.3.21'
  })
}

/* 按类型的切法：权重与 auditTypeDist 的展示顺序一一对应 */
const AUDIT_BY_TYPE = splitTotal(AUDIT_TOTAL_7D, [160, 88, 34, 26, 60, 26, 190])

export const auditTypeDist = [
  { name: '模板上下架', value: AUDIT_BY_TYPE[0] },
  { name: '额度调整', value: AUDIT_BY_TYPE[1] },
  { name: '用户封禁', value: AUDIT_BY_TYPE[2] },
  { name: '云任务处置', value: AUDIT_BY_TYPE[3] },
  { name: '退款审批', value: AUDIT_BY_TYPE[4] },
  { name: '会员规格变更', value: AUDIT_BY_TYPE[5] },
  { name: '登录', value: AUDIT_BY_TYPE[6] }
]

export const auditTrend = {
  days: lastDays(7),
  counts: splitTotal(AUDIT_TOTAL_7D, [68, 92, 75, 104, 61, 73, 111])
}

/* ============================ 支付与权益流水（只读） ============================ */
/* from 记录真实前驱。CLOSED 由「支付中」超时或用户取消进入，
   并不是「权益入账」的下一步，所以标 branch——
   原先把它排在链尾、前面还接一个「→」，读起来像「入账之后再关闭」。 */
export const stateMachine = [
  { key: 'CREATED', title: '下单', desc: '小程序发起，生成预付单', from: null },
  { key: 'PAYING', title: '支付中', desc: '调起微信支付，等待回调', from: 'CREATED' },
  { key: 'PAID', title: '已支付', desc: '回调验签通过，写渠道流水', from: 'PAYING' },
  { key: 'GRANTED', title: '权益入账', desc: '发放额度 / 会员有效期', from: 'PAID' },
  { key: 'CLOSED', title: '已关闭', desc: '超时未支付或用户取消，未产生支付流水', from: 'PAYING', branch: true }
]

/* 「变更内容」是派生列，不是手写的事实：方向看流水类型，数量看订单所属规格的 grant。
   手写的话，改了规格的时长/张数，流水上那几个数字不会跟着动；
   「权益冻结」原先还手写成「- 月卡权益」——同一列别处都是「数量 + 单位」，
   只有这一行是名词短语，既看不出冻了多少天，也没法跟着规格改。

   grantLookup 让调用方传入自己那份规格数据：规格页是可编辑的（数据在 store 里），
   它改完「发放权益」，流水页要跟着变，所以页面侧传 store 的 grantOf；
   不传就用本模块的静态规格——纯数据检查走这条路。 */
export function ledgerAmountOf(flow, grantLookup = planGrant) {
  const sign = { 权益入账: '+', 权益冻结: '-', 权益回收: '-' }[flow.type]
  /* 订单关闭这类不动权益，没有额度可写 */
  if (!sign) return '—'
  const order = orders.find((item) => item.id === flow.order)
  return order ? `${sign} ${grantLookup(order.plan)}` : '—'
}

/* 表里只写事实（谁、何时、什么类型），amount 由上面那个函数算出来 */
const LEDGER_SEED = [
  { id: 'LG202610101002', order: 'AP202610101002', type: '权益入账', status: '成功', time: '2026-10-10 10:02', operator: 'F-SRV-05' },
  { id: 'LG202610092239', order: 'AP202610092239', type: '权益入账', status: '成功', time: '2026-10-09 22:39', operator: 'F-SRV-05' },
  { id: 'LG202610092013', order: 'AP202610092013', type: '权益入账', status: '成功', time: '2026-10-09 20:13', operator: 'F-SRV-05' },
  { id: 'LG202610091812', order: 'AP202610091812', type: '权益冻结', status: '处理中', time: '2026-10-09 18:12', operator: 'F-SRV-04' },
  { id: 'LG202610081933', order: 'AP202610081933', type: '权益入账', status: '成功', time: '2026-10-08 19:33', operator: 'F-SRV-05' },
  { id: 'LG202610081021', order: 'AP202610081021', type: '订单关闭', status: '成功', time: '2026-10-08 10:51', operator: 'F-SRV-04' },
  { id: 'LG202610071332', order: 'AP202610071332', type: '权益回收', status: '成功', time: '2026-10-07 13:40', operator: 'F-SRV-05' }
]

export const ledgerFlows = LEDGER_SEED.map((flow) => ({ ...flow, amount: ledgerAmountOf(flow) }))

export const stateDist = [
  { name: '已支付 + 已入账', value: 862 },
  { name: '支付中', value: 24 },
  { name: '已关闭 / 超时', value: 96 },
  { name: '退款中', value: 12 }
]

/* ============================ 通知 ============================ */
/* 与待办同理：通知里的条数也从业务数据算出来，并带上该去哪一页。
   原先写死「3 笔退款待复核」，而退款页按同一份数据只有 1 笔；
   三条通知也都没有 path，点哪儿都只回到看板。 */
export function buildNotifications() {
  const pending = refunds.filter((item) => item.status === '待复核')
  const pendingReview = pending.length
  /* 等待时长从最早一笔的申请时间读出来，不写「已等待 2 小时」这种
     跟数据无关的常数——改一条申请的 applyAt，这里会跟着变。 */
  const oldest = [...pending].sort((a, b) => a.applyAt.localeCompare(b.applyAt))[0]
  const failed = cloudTasks.filter((item) => item.status === '失败').length
  const risky = copyrightRisky()
  /* count 是「真要处理几件事」，角标按它求和：
     没有待办时条目照样列出（给一条说明性的灰条目），但 count 为 0。 */
  return [
    pendingReview
      ? { id: 1, count: pendingReview, title: `${pendingReview} 笔退款待复核`, desc: `最早一笔 ${oldest.id} 于 ${oldest.applyAt.slice(11)} 提交`, time: '10 分钟前', type: 'accent', path: '/member/refunds' }
      : { id: 1, count: 0, title: '退款复核已清空', desc: '暂无待主管处理的退款单', time: '10 分钟前', type: 'mute', path: '/member/refunds' },
    failed
      ? { id: 2, count: failed, title: `云任务失败 ${failed} 条`, desc: '可手动重试或删除', time: '1 小时前', type: 'warm', path: '/cloud-tasks' }
      : { id: 2, count: 0, title: '云任务无失败记录', desc: '全部任务执行正常', time: '1 小时前', type: 'mute', path: '/cloud-tasks' },
    risky.length
      ? {
          id: 3,
          count: risky.length,
          title: '版权来源待补充',
          desc: `${risky.map((item) => item.id).join('、')} 已自动下架`,
          time: '今天 09:12',
          type: 'primary',
          path: '/templates'
        }
      : { id: 3, count: 0, title: '版权来源登记齐全', desc: '无需处理', time: '今天 09:12', type: 'mute', path: '/templates' }
  ]
}
