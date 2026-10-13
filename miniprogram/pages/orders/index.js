const app = getApp()
const store = require('../../utils/store')

const FILTERS = ['全部', '已支付', '已关闭', '退款中', '已退款']
const REASONS = ['重复购买', '功能与描述不符', '误操作下单', '不再需要', '其他原因']

Page({
  data: {
    tab: 'benefit',
    member: null,
    quota: 0,
    orders: [],
    filters: FILTERS,
    filter: '全部',
    filtered: [],
    daysLeft: 0,
    expiring: false,
    showRefund: false,
    refundTarget: null,
    reasons: REASONS,
    reasonIndex: 0,
    remark: '',
    submitting: false
  },

  onShow() {
    app.refreshGlobal()
    this.refresh()
  },

  refresh() {
    const orders = store.getOrders()
    const member = app.globalData.member
    let daysLeft = 0
    if (member && member.active && member.expireAt) {
      const target = new Date(member.expireAt.replace(/-/g, '/'))
      daysLeft = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000))
    }
    this.setData(
      {
        member,
        quota: app.globalData.quota,
        orders,
        daysLeft,
        expiring: member && member.active && daysLeft <= 7
      },
      () => this.applyFilter()
    )
  },

  applyFilter() {
    const filter = this.data.filter
    const filtered = filter === '全部' ? this.data.orders : this.data.orders.filter((item) => item.status === filter)
    this.setData({ filtered })
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter }, () => this.applyFilter())
  },

  /* ---------------- F-PAY-04 订单操作 ---------------- */
  continuePay(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.orders.find((item) => item.id === id)
    if (!order) return
    wx.showModal({
      title: '继续支付',
      content: `订单 ${order.id} · ¥${order.amount}，演示环境不再调起真实支付。`,
      confirmText: '模拟支付成功',
      success: (res) => {
        if (!res.confirm) return
        store.updateOrder(id, { status: '已支付', delivered: true, tradeNo: '4200' + String(Date.now()).slice(-12) })
        this.refresh()
        wx.showToast({ title: '已支付', icon: 'success' })
      }
    })
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '关闭订单？',
      content: '未支付订单可随时关闭，关闭后需重新下单。',
      success: (res) => {
        if (!res.confirm) return
        store.updateOrder(id, { status: '已关闭' })
        this.refresh()
        wx.showToast({ title: '订单已关闭', icon: 'none' })
      }
    })
  },

  /* ---------------- F-PAY-05 退款 ---------------- */
  openRefund(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.orders.find((item) => item.id === id)
    if (!order) return
    if (order.id && order.refundable === false) {
      wx.showModal({
        title: '不可退款',
        content: '该规格的权益已使用或本身为按次包，按规则不可退款。',
        showCancel: false
      })
      return
    }
    this.setData({ refundTarget: order, showRefund: true, reasonIndex: 0, remark: '' })
  },

  closeRefund() {
    this.setData({ showRefund: false })
  },

  onReason(e) {
    this.setData({ reasonIndex: Number(e.detail.value) })
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  submitRefund() {
    const order = this.data.refundTarget
    if (!order || this.data.submitting) return
    this.setData({ submitting: true })
    setTimeout(() => {
      const gain = order.quotaGain || 0
      store.updateOrder(order.id, {
        status: '已退款',
        refundStatus: '已退款',
        refundReason: this.data.reasons[this.data.reasonIndex],
        refundAt: new Date().toLocaleString('zh-CN')
      })
      if (gain && app.globalData.quota >= gain) {
        store.setQuota(app.globalData.quota - gain)
      }
      app.refreshGlobal()
      this.setData({ submitting: false, showRefund: false })
      this.refresh()
      wx.showModal({
        title: '退款已提交并受理（演示）',
        content: `订单 ${order.id} 退款 ¥${order.amount}；同步回收未消费权益 ${gain} 次云增强。正式环境退款进度以渠道回调为准。`,
        showCancel: false
      })
    }, 900)
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/index' })
  },

  noop() {}
})
