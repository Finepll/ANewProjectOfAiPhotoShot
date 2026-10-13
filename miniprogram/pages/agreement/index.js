const app = getApp()
const store = require('../../utils/store')

const DOCS = {
  portrait: {
    key: 'portrait',
    name: '肖像权授权承诺',
    version: 'V3.4',
    intro: '本承诺是你使用 AI 照相馆生成能力的必要前提，签署后本机留存一份签署凭证。',
    sections: [
      {
        h: '一、授权范围',
        p: [
          '你仅可上传本人肖像照片，或已取得肖像权人明确书面授权的照片；不得上传他人照片用于换脸、换装、换底或任何合成。',
          '生成结果仅供你本人使用；用于商业用途的，由你自行取得相应授权并承担全部责任。'
        ]
      },
      {
        h: '二、明确禁止的行为',
        p: [
          '禁止用于伪造身份证件、护照、签证、资格证等任何证件材料；',
          '禁止用于恶搞、丑化、侮辱他人，或制作可能损害他人名誉的内容；',
          '禁止用于冒充他人身份、欺诈、虚假宣传等违法用途。',
          '出现上述行为时，我们有权拒绝服务、清除本机数据并保留追究法律责任的权利。'
        ]
      },
      {
        h: '三、未成年人',
        p: ['如你未满 18 周岁，需在监护人陪同下阅读并同意本承诺后方可使用。']
      },
      {
        h: '四、凭证与撤回',
        p: [
          '签署记录包含协议版本、签署时间与设备标识，不包含任何人脸特征信息，可在本机随时查看。',
          '你可以随时撤回授权；撤回后拍摄、导入与导出入口将不可用。'
        ]
      }
    ]
  },
  privacy: {
    key: 'privacy',
    name: '隐私政策',
    version: 'V3.4',
    intro: '我们采取「默认不留记忆」策略：照片与蒙版只存在于本次会话内存，退出页面即释放。',
    sections: [
      {
        h: '一、我们如何处理你的照片',
        p: [
          '拍摄、导入、抠图、合成、滤镜与导出全部在本机完成，不产生图片上行；',
          '未选择「临时暂存」或「保存到相册」时，任何照片、蒙版与工程参数都不写入持久存储；',
          '沙盒只作为临时工作区，随时可能被系统清理，因此我们不会提示「照片已安全保存」。'
        ]
      },
      {
        h: '二、键值存储的边界',
        p: [
          '仅允许保存登录态、协议签署凭证、隐私计数与配置版本号，容量上限 10MB；',
          '禁止写入图片、缩略图或人脸特征；人脸特征默认不保存，开启后仅存本机、不同步、可随时清除。'
        ]
      },
      {
        h: '三、云增强（可选上行）',
        p: [
          '仅当你逐次显式授权后，才会上行 1 张图片用于本次生成；',
          '结果回传后服务端立即物理删除上行原图与全部中间产物，并写入删除审计记录；',
          '隐私看板中的上行次数由本机统计，断网与离线状态下同样如实展示。'
        ]
      },
      {
        h: '四、会员与支付数据',
        p: ['会员与订单流程只涉及账号、金额与权益计数，不携带任何图片、人脸数据或工程内容。']
      }
    ]
  },
  service: {
    key: 'service',
    name: '用户服务协议',
    version: 'V3.4',
    intro: '本协议说明服务范围、付费规则与双方责任，请在使用前完整阅读。',
    sections: [
      {
        h: '一、服务范围',
        p: [
          '证件照、虚拟影楼、轻量编辑器与多份交付属于端侧能力，免费可用；',
          '云增强（超分、模型级风格化、生成式背景）为可选增值能力，按次计费，由会员权益与额度共同约束。'
        ]
      },
      {
        h: '二、付费与退款',
        p: [
          '规格、价格与权益由运营后台配置下发，客户端不内置价格；',
          '支付结果以服务端回调为准，回调验签且幂等，未收到回调前不发放权益；',
          '虚拟商品支持在可退条件下申请退款，退款成功后回收未消费权益；权益已消费的场景会在下单前明确告知。',
          '微信小程序 iOS 端不销售虚拟商品，相关规格按平台规则处理。'
        ]
      },
      {
        h: '三、内容规范',
        p: [
          '贴纸、涂鸦与文字内容在本机做敏感词校验，命中违规内容时禁止导出；',
          '禁止生成违法、色情、暴力、恐怖或侵犯他人合法权益的内容。'
        ]
      },
      {
        h: '四、责任限制',
        p: ['因你将生成结果用于违法用途造成的后果，由你自行承担；因不可抗力或第三方服务中断造成的损失，我们将在法律允许范围内免责。']
      }
    ]
  }
}

Page({
  data: {
    tabs: [
      { key: 'portrait', name: '肖像权授权' },
      { key: 'privacy', name: '隐私政策' },
      { key: 'service', name: '服务协议' }
    ],
    type: 'portrait',
    doc: DOCS.portrait,
    signed: false,
    signedAt: '',
    signHash: ''
  },

  onLoad(options) {
    const type = options && DOCS[options.type] ? options.type : 'portrait'
    this.setData({ type, doc: DOCS[type] })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const agreements = store.getAgreements()
    const signed = !!agreements[this.data.type]
    this.setData({
      signed,
      signedAt: signed ? agreements.signedAt : '',
      signHash: signed ? 'LOCAL-' + String(agreements.signedAt).replace(/[^\d]/g, '').slice(0, 14) : ''
    })
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ type, doc: DOCS[type] }, () => this.refresh())
  },

  agree() {
    store.signAgreement(this.data.type)
    app.refreshGlobal()
    this.refresh()
    wx.showToast({ title: '已签署并本机存证', icon: 'success' })
  },

  revoke() {
    wx.showModal({
      title: '撤回该授权？',
      content: '撤回后，涉及该协议的能力（拍摄 / 导入 / 导出 / 云增强）将立即不可用。',
      confirmText: '撤回',
      success: (res) => {
        if (!res.confirm) return
        const agreements = Object.assign({}, store.getAgreements(), { [this.data.type]: false, signedAt: '' })
        store.setAgreements(agreements)
        app.refreshGlobal()
        this.refresh()
        wx.showToast({ title: '已撤回授权', icon: 'none' })
      }
    })
  }
})
