const app = getApp()
const mock = require('../../utils/mock')
const store = require('../../utils/store')

/** 各规格赠送的云增强次数（正式环境由后台 F-ADM-05 下发） */
const QUOTA_GAIN = { 'PL-M': 20, 'PL-Q': 60, 'PL-Y': 240, 'PL-P10': 10 }

const COMPARE_ROWS = [
  { key: 'duration', name: '有效期' },
  { key: 'quota', name: '云增强次数' },
  { key: 'hd', name: '无水印高清导出' },
  { key: 'studio', name: '影棚模板全解锁' },
  { key: 'price', name: '价格' }
]

Page({
  data: {
    plans: mock.PLANS,
    compareRows: COMPARE_ROWS,
    member: null,
    quota: 0,
    selected: null,
    showConfirm: false,
    paying: false,
    showResult: false,
    payMethod: '微信支付',
    lastOrder: null
  },

  onShow() {
    app.refreshGlobal()
    this.setData({
      member: app.globalData.member,
      quota: app.globalData.quota,
      compare: this.buildCompare()
    })
  },

  /** 规格对比矩阵（演示数据；正式环境由后台 F-ADM-05 下发） */
  buildCompare() {
    return COMPARE_ROWS.map((row) => ({
      key: row.key,
      name: row.name,
      cells: this.data.plans.map((plan) => this.planValue(plan, row.key))
    }))
  },

  planValue(plan, key) {
    if (key === 'duration') return plan.duration
    if (key === 'quota') return (QUOTA_GAIN[plan.id] || 0) + ' 次'
    if (key === 'hd') return '✓'
    if (key === 'studio') return plan.benefits.join('').indexOf('影棚模板') > -1 ? '✓' : '—'
    if (key === 'price') return '¥' + plan.price
    return '—'
  },

  /* ---------------- F-PAY-01 橱窗 ---------------- */
  pickPlan(e) {
    const id = e.currentTarget.dataset.id
    const plan = this.data.plans.find((item) => item.id === id)
    if (!plan) return
    if (!app.ensureLogin()) return
    if (!app.ensureAgreement()) return
    this.setData({ selected: plan, selectedBenefitsText: plan.benefits.join(' / '), showConfirm: true })
  },

  closeConfirm() {
    this.setData({ showConfirm: false })
  },

  payMethodTap() {
    wx.showToast({ title: '演示环境为模拟支付，不调用微信支付 SDK', icon: 'none' })
  },

  /* ---------------- F-PAY-02 下单与支付 ---------------- */
  confirmPay() {
    const plan = this.data.selected
    if (!plan || this.data.paying) return
    this.setData({ paying: true })
    const orderId = 'AP' + Date.now()
    const tradeNo = '4200' + String(Date.now()).slice(-12)
    const order = {
      id: orderId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      status: '已支付',
      channel: '微信支付',
      tradeNo,
      createdAt: new Date().toLocaleString('zh-CN'),
      delivered: true,
      refundable: plan.id !== 'PL-P10',
      refundStatus: '不可退款',
      quotaGain: QUOTA_GAIN[plan.id] || 0
    }
    const expireAt = this.computeExpire(plan)
    const member = {
      active: true,
      planId: plan.id,
      planName: plan.name,
      expireAt,
      benefits: plan.benefits,
      orderId
    }
    // 演示：跳过真实 wx.requestPayment，正式环境由服务端下单 + 支付回调为准
    setTimeout(() => {
      store.addOrder(order)
      store.setMember(member)
      store.setQuota((app.globalData.quota || 0) + (QUOTA_GAIN[plan.id] || 0))
      app.refreshGlobal()
      this.setData({
        paying: false,
        showConfirm: false,
        showResult: true,
        lastOrder: order,
        member,
        quota: app.globalData.quota
      })
    }, 1100)
  },

  computeExpire(plan) {
    const days = plan.id === 'PL-M' ? 30 : plan.id === 'PL-Q' ? 90 : plan.id === 'PL-Y' ? 365 : 90
    const date = new Date()
    date.setDate(date.getDate() + days)
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  },

  closeResult() {
    this.setData({ showResult: false, selected: null })
  },

  goOrders() {
    this.setData({ showResult: false })
    wx.navigateTo({ url: '/pages/orders/index' })
  },

  goCamera() {
    this.setData({ showResult: false })
    wx.switchTab({ url: '/pages/camera/index' })
  },

  noop() {}
})
