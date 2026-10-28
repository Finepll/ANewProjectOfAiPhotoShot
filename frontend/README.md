# AI 照相馆 · 管理后台（前端 Demo）

Vue 3 + Vite + Element Plus + ECharts 搭建的运营管理后台演示，页面与导航按《AI 照相馆 · 功能报告 V3.4》的 F-ADM / F-SRV 模块划分，全部数据为本地 Mock，**未连接后端**。

## 快速启动

```bash
cd ANewProjectOfAiPhotoShot/frontend
npm install          # 首次运行
npm run dev          # 默认 http://localhost:5173
npm run build        # 产物输出到 dist/
npm run preview      # 预览构建产物
```

`vite.config.js` 中 `/api` 已代理到 `http://127.0.0.1:8081`（SpringBoot），接后端时直接调用 `/api/...` 即可。

## 演示账号

管理人员账号由开发人员分配，**系统不提供自助注册**。演示环境在本地校验：

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 超级管理员（全部菜单） |
| `ops` | `ops123` | 运营专员 |

登录页点击演示账号卡片可自动填入；退出登录在右上角头像菜单。

## 菜单与功能点对应

| 菜单 | 路由 | 功能点 |
| --- | --- | --- |
| 运营看板 | `/dashboard` | F-ADM-04 云任务处置与运营看板 |
| 模板与素材 | `/templates` | F-ADM-01 模板与主题素材包管理 |
| 用户与额度 | `/users` | F-ADM-02 用户与额度管理 |
| 会员与支付 / 会员规格 | `/member/plans` | F-ADM-05 会员规格与权益配置 |
| 会员与支付 / 订单与账单 | `/member/orders` | F-ADM-06 订单与账单管理 |
| 会员与支付 / 退款与售后 | `/member/refunds` | F-ADM-07 退款与售后处理 |
| 云增强任务 | `/cloud-tasks` | F-CLD-01 / F-CLD-02 云增强提交与即时删除 |
| 支付权益流水 | `/service/ledger` | F-SRV-04 / F-SRV-05（只读视图） |
| 系统管理 / 管理员与权限 | `/system/admins` | F-ADM-03 管理员与权限管理 |
| 系统管理 / 操作审计 | `/system/audit` | F-ADM-03 操作审计 |

## 设计规范

品牌四色（`src/style.css` 中的 CSS 变量，同时映射到 Element Plus 主题）：

| 变量 | 色值 | 用途 |
| --- | --- | --- |
| `--c-primary` | `#99B6B4` | 主色：侧边栏、主按钮、图表系列 1 |
| `--c-primary-light` | `#BACFCE` | 浅底、hover、图表系列 4 |
| `--c-accent` | `#D48982` | 强调 / 危险：退款、删除、图表系列 2 |
| `--c-warm` | `#DFB199` | 次强调：待办、提示、图表系列 3 |

派生色仅用于文字与语义（成功 `#7FA382`、警告 `#D9A05B`），不引入蓝紫系。

交互细节：

- 侧边栏：宽屏常驻，手动展开 / 收起为 **224px ↔ 68px 图标栏**；**≤767px 改为覆盖式抽屉**（浮在内容上，不挤占正文宽度，配半透明遮罩，点遮罩或点完菜单自动收起）。窗口宽度跨过 1180px 时自动收起，回宽屏后还原用户自己的选择。
- 卡片 hover 上浮 4px；表格行 hover 变色；菜单 hover 位移 2px 并变底色；**当前所在页**在菜单里显示左侧色条（标位置用，不是 hover 效果）。
- 图表点击联动提示（看板环形图点击弹出「某类目共生成 N 张，占 X%」，操作审计柱状图点击弹出次数）。
- 各类弹窗校验：额度调整原因必填、退款审批理由必填、版权来源未登记禁止上架（页头同时给出合规告警并自动下架）。

## 目录结构

```
src/
├─ layouts/AdminLayout.vue    # 侧边栏 + 顶栏 + 内容区（含面包屑、通知、用户菜单）
├─ views/                     # 11 个页面：Login + 10 个业务页
├─ components/                # ChartBox（ECharts 封装）、StatCard、PageHeader
├─ mock/index.js              # 全部演示数据（对接后端时替换数据来源）
├─ stores/                    # Pinia：auth（登录态）、app（侧边栏收起）
├─ router/index.js            # 路由 + 登录守卫 + 页面标题
└─ utils/                     # request（axios 实例）、chartTheme（图表主题）、log
```

## 对接后端时改哪里

1. `src/stores/auth.js` 的 `login()`：把本地校验换成 `request({ url: '/admin/login', method: 'post', data })`，保存返回的 JWT。
2. `src/utils/request.js`：在请求拦截器里加上 `Authorization` 头，响应 401 时跳转登录页。
3. 各页面把 `import { xxx } from '../mock'` 换成接口调用；Mock 数据结构即接口出参参考。
4. `src/utils/log.js` 中 `REMOTE_ENABLED = false` 改为 `true`，恢复 `/log/save` 上报。

## 说明

- 顶部与侧边栏底部均标注「演示数据」，所有金额、用户手机号、流水号均为虚构，手机号已脱敏。
- 页面中的语音/导出/批量重试等按钮为占位交互，会提示「演示 Demo 暂未开放」，不影响演示流程。
