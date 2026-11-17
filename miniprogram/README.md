# AI 照相馆 · 微信小程序端（原生小程序）

按《AI照相馆-功能报告》V3.4 的小程序侧功能点实现，**原生 WXML / WXSS / JS + 自定义 tabBar**，不依赖任何 UI 框架；所有数据落在本机（`wx.setStorageSync`），演示环境不发起任何网络请求。

## 一、跑起来

1. 微信开发者工具 → 导入项目 → 目录选择 `aAiPhotoShot/miniprogram`；
2. AppID 现为 `touristappid`（游客模式，可直接跑）；正式预览/上传需换成你自己的 AppID；
3. 详情 → 本地设置：勾选「不校验合法域名」（当前无请求，仅为后续接后端预留）；
4. 编译即可。首次启动会写入演示数据（额度 5 次、2 条导出记录、2 笔订单）。

演示口径：邮箱验证码固定 `888888`；支付为模拟支付，不调用微信支付 SDK，不产生真实扣款。

## 二、配色

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--c-blue` | `#C7D3DB` | 雾蓝，主背景 / 按钮 / 图层 |
| `--c-tan` | `#A79A8A` | 驼灰，描边 / 次级标签 / 渐变端 |
| `--c-cream` | `#FCF7DF` | 米白，页面底色 / 反白文字 |
| `--c-ink` | `#3E3630` | 墨褐，主文字 / 主按钮 |

派生：`--c-card #FFFDF5`、`--c-ink-2 #6D6357`、`--c-ink-3 #9C9285`、`--c-line #E7E0D3`。
全局变量定义在 `app.wxss` 的 `page {}` 中，公共类：`.card` `.btn(--primary/--blue/--ghost/--sm/--block)` `.tag` `.cell` `.notice` `.sheet` `.slider` `.empty` `.bar`。

## 三、目录与页面对照

```
miniprogram/
├── app.js / app.json / app.wxss        全局登录态、协议校验、tabBar 注册、四色变量
├── custom-tab-bar/                     自定义 tabBar：影棚 / 模板 / 拍摄 / 记录 / 我的（CSS 绘制图标 + 中央快门）
├── utils/
│   ├── mock.js                         演示数据：影棚模板、规格库、底色、风格包、贴纸、会员规格、隐私看板项
│   ├── store.js                        本地存储层（登录态、协议、隐私、额度、导出记录、草稿、订单、每日频次）
│   ├── render.js                       端侧合成引擎（canvas 2d：加载、背景、人像羽化、风格、贴纸、裁切、导出）
│   └── request.js / log.js             预留给 SpringBoot 后端的请求与日志上报封装（当前未被调用）
└── pages/
    ├── index/        首页影棚：额度、引导轮播、隐私模式卡、模板横滑、快捷入口、最近导出记录
    ├── templates/    模板市场：影棚 / 规格 / 风格包 / 贴纸 四类
    ├── camera/       2D 引导式拍摄：引导框 + 光线提示 + 端侧质检 + 相册导入
    ├── editor/       轻量编辑器：人像层变换、背景虚化、贴纸、图层、编排进度、暂存、导出
    ├── idphoto/      证件照工作台：规格推荐 + 换底 + 构图校正 + 单张导出（去向三选一）
    ├── result/       成品预览 + 保存去向 + 一次拍摄·多份交付（6 寸拼版唯一出口）
    ├── works/        记录页（tab）：导出记录（仅元信息）+ 沙盒临时区 / 暂存工程
    ├── profile/      我的：账号、额度与会员、隐私看板、授权开关、协议与订单入口
    ├── member/       会员与增值规格橱窗 + 下单支付
    ├── orders/       会员权益 / 订单账单 / 退款售后
    ├── login/        手机号验证码登录（未注册自动注册）+ 协议勾选
    └── agreement/    肖像权授权 / 隐私政策 / 用户服务协议 正文与签署凭证
```

## 四、功能点对照（与 V3.4 报告一致）

| 编号 | 落地位置 |
| --- | --- |
| F-ACC-01 手机号验证码登录 | `pages/login` |
| F-ACC-02 一次性协议与肖像权授权 | `app.js#ensureAgreement`、`pages/agreement` |
| F-ACC-03 本地隐私模式与隐私看板 | `pages/profile`（含一键清理、自动清理天数） |
| F-ACC-04 云端能力显式授权 | `pages/profile` 开关 + `pages/member` 说明 |
| F-CAP-01 2D 引导式拍照 | `pages/camera` |
| F-CAP-02 相册导入 | `pages/camera#importAlbum`、`pages/index#importFromAlbum` |
| F-CAP-03 端侧质检与重拍引导 | `pages/camera` 质检 sheet |
| F-ID-01~04 证件照线 | `pages/idphoto`（推荐 / 换底 / 校正 / 单张导出） |
| F-STU-01 模板浏览与一键套用 | `pages/templates`、`pages/index` |
| F-STU-02 多模型编排与影棚合成 | `pages/editor#runPipeline`（演示为端侧流水线） |
| F-STU-03 人像层变换与构图 | `pages/editor` 缩放 / 左右 / 上下 / 拖动 |
| F-STU-04 背景虚化与调焦 | `pages/editor` 虚化滑块 |
| F-EDT-01 贴纸与文字 | `pages/editor` 贴纸层 |
| F-EDT-02 本机滤镜与主题风格包 | `pages/editor` 风格 chip、`pages/templates` 风格包 |
| F-EDT-03 图层管理与临时暂存 | `pages/editor` 图层 sheet + 暂存；`pages/works`、`pages/profile` 清理 |
| F-OUT-01 高清导出与保存去向 | `pages/result`（仅本次查看 / 临时暂存 24h / 保存到相册） |
| F-OUT-02 一次拍摄·多份交付 | `pages/result` 批量勾选（6 寸拼版、方图、长图海报） |
| F-CLD-01/02 云增强与即时删除 | `pages/member` 额度购买 + `pages/result` 云增强说明（演示不下真实上行） |
| F-PAY-01~05 会员与支付 | `pages/member`、`pages/orders` |

## 五、当前为演示、需要真实素材/资质的位置

1. **人脸分割**：`utils/render.js#drawPerson` 用椭圆羽化近似 alpha 通道，接入真实端侧分割模型（小程序插件 / WASM）后替换该函数即可；
2. **影棚背景与模板**：`utils/mock.js#STUDIO_TEMPLATES` 用 CSS 渐变占位，替换为真实素材图；
3. **贴纸**：`utils/mock.js#STICKERS` 使用 emoji 占位，替换为版权登记的位图素材；
4. **人脸检测/质检**：`pages/camera` 的质检为演示模拟，接真实检测能力；
5. **支付**：`pages/member#confirmPay` 为模拟支付，正式需服务端下单 + `wx.requestPayment` + 回调验签；
6. **登录**：`pages/login` 未走真实短信，正式需接服务端验证码接口并返回 JWT；
7. **模型下发**：F-STU-02 的模型包分发、版本化与沙盒缓存策略需要后端配合（`utils/request.js` 已预留）。

## 六、隐私口径（红线，改动前请先读）

- 照片不出本机：无任何图片上行；键值存储只存登录态、协议凭证、隐私计数与配置版本号，禁止写入图片或人脸特征；
- 产品不建立长期作品库：「记录」页只有元信息（时间、版式、去向、是否入相册），没有缩略图与图片副本；
- 默认不落盘：导出必须经过去向选择；沙盒只是临时工作区，到期自动清理，不提示「已安全保存」；
- 证件照线禁用虚化、调焦、贴纸、涂鸦与风格化；拼版只在 F-OUT-02 生成，且计入每日频次（默认 5 张）。
