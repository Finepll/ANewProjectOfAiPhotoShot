# 后端实现清单

> 模块：`backend/demo`（Spring Boot 4.1.1 · JDK 21 · JdbcTemplate · JWT · BCrypt）
> 统计口径：截至当前代码状态，接口 **22** 个，MySQL 表 **24** 张（代码实际使用 13 张），自动化用例 **25** 个 + 冒烟 **34** 项。

## 一、一句话定位

这套后端是**账号与权限底座**：实现了登录、授权、管账号、审计、记账等功能，但**还不能真正生成照片**。

---

## 二、已实现能力

| 模块 | 已实现内容 | 代码位置 |
| --- | --- | --- |
| C 端登录 | 手机号 + 验证码登录；**未注册自动注册**；JWT 7 天 | `user/service/UserAuthService` |
| 验证码 | 5 分钟有效、60 秒频控、单日 10 条上限、一次性消费、只存 SHA-256 | `user/service/SmsCodeService` |
| 手机号保护 | 只存 `HMAC-SHA256(号码+密钥)` 与掩码，明文不落库 | `user/service/PhoneCodec` |
| 协议存证 | 三类协议签署 / 撤回 / 重签，版本管理，存证指纹（用户+协议+版本+时间+设备） | `user/service/ConsentService` |
| 隐私开关 | 本地模式、云授权、是否本机保留人脸特征、自动清理天数（0~365） | `user/service/UserAuthService#updatePrivacy` |
| 额度体系 | 账户 + 流水双表，`biz_no` 幂等，余额不足拒绝（40001），预留 7 种变动类型 | `user/service/QuotaService` |
| 管理员登录 | 分配制（**无注册接口**）、BCrypt、错 5 次锁 30 分钟、停用拒登 | `admin/service/AdminAuthService` |
| 强制改密 | 首登 / 被重置后必须改密，服务端硬拦截（30007），不是只靠前端 | `AdminAuthService#assertPasswordChanged` |
| 账号管理 | 管理员列表、角色下拉、分配账号、启停、重置密码 | `admin/controller/AdminManageController` |
| 账号保护 | 不能停用自己；必须保留至少一个启用状态的超管 | `AdminAuthService#updateStatus` |
| 审计 | 登录日志（成功/失败原因/IP/UA）+ 操作日志（分配/改密/启停/重置），只读 | `admin/controller/AdminAuditController` |
| 鉴权隔离 | 用户令牌调 `/api/admin/**` → 20003；管理员令牌调 `/api/user/**` → 20003 | `security/AuthInterceptor` |
| 统一响应 | `ApiResult{code,message,data,timestamp}`，业务失败仍 HTTP 200 | `common/ApiResult` |
| 异常与校验 | Jakarta 参数校验 + 全局异常兜底（10001 / 10002） | `common/GlobalExceptionHandler` |
| 管理员引导 | 启动时按配置创建 `admin` / `ops`，不写死在 SQL 里 | `admin/service/AdminBootstrap` |
| 双运行模式 | MySQL（手动建表）/ H2（启动自动建表，免装数据库） | `application.yml` / `application-h2.yml` |
| 运维辅助 | 健康检查、前端日志接收、日志脱敏（不打印手机号/验证码/密码） | `controller/HealthController`、`controller/FrontLogController` |

---

## 三、接口清单（22 个）

### 3.1 公共 / 白名单（2）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 服务与数据库连通性、短信是否 dev 模式 |
| POST | `/api/log/save` | 前端日志上报（无返回体） |

### 3.2 C 端（11）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/user/auth/code` | 下发登录验证码 |
| POST | `/api/user/auth/email/code` | 下发邮箱登录验证码（SMTP，10 分钟有效） |
| POST | `/api/user/auth/login` | 登录 / 自动注册（可一并签署协议） |
| POST | `/api/user/auth/email/login` | 邮箱登录 / 自动注册 |
| GET | `/api/user/auth/me` | 资料 + 额度 + 隐私 + 协议状态 |
| GET | `/api/user/auth/agreement/list` | 协议列表（含签署时间、存证指纹） |
| POST | `/api/user/auth/agreement` | 补充签署单个协议 |
| POST | `/api/user/auth/agreement/revoke` | 撤回协议 |
| PUT | `/api/user/auth/privacy` | 更新隐私开关 |
| GET | `/api/user/auth/quota/flows?limit=20` | 额度流水（1~100） |
| POST | `/api/user/auth/logout` | 退出登录 |

### 3.3 管理端（11）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/admin/auth/login` | 公开 | 账号密码登录 |
| GET | `/api/admin/auth/me` | 任意管理员 | 当前身份 + 角色 + 权限点 |
| POST | `/api/admin/auth/change-password` | 任意管理员 | 改密（首登强制改密也走这里） |
| POST | `/api/admin/auth/logout` | 任意管理员 | 退出登录 |
| GET | `/api/admin/admins` | 超管 | 管理员列表 |
| GET | `/api/admin/admins/roles` | 任意管理员 | 角色下拉 |
| POST | `/api/admin/admins` | 超管 | 分配新账号（首登强制改密） |
| PUT | `/api/admin/admins/{id}/status` | 超管 | 启用（1）/ 停用（0） |
| POST | `/api/admin/admins/{id}/reset-password` | 超管 | 重置他人密码 |
| GET | `/api/admin/audit/login-logs?limit=50` | 超管 / 审计员 | 登录日志 |
| GET | `/api/admin/audit/operation-logs?limit=50` | 超管 / 审计员 | 操作审计日志 |

---

## 四、数据模型使用情况

MySQL 脚本共 **25 张表**，其中 **14 张已被代码真实读写**：

| 域 | 表 | 状态 |
| --- | --- | --- |
| 账号 | `app_user`、`app_sms_code`、`app_email_code`、`app_user_consent`、`app_user_privacy` | 已使用 |
| 额度 | `app_quota_account`、`app_quota_flow` | 已使用 |
| 后台 | `sys_admin`、`sys_admin_role`、`sys_role`、`sys_role_permission`、`sys_permission` | 已使用 |
| 审计 | `sys_admin_login_log`、`sys_operation_log` | 已使用 |
| 配置 | `sys_config` | 仅种子数据，代码未读取 |
| 业务 | `app_cloud_task`、`app_deletion_audit`、`app_studio_template`、`app_model_package`、`app_id_spec`、`app_member_plan`、`app_user_member`、`app_order`、`app_refund`、`app_daily_stat` | **已建表，无接口** |

H2 脚本是 MySQL 的**子集**（15 张表），只覆盖登录注册链路，用于免装数据库联调与测试。

---

## 五、关键业务规则（可配置）

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `app.sms.dev-mode` | `true` | 开发模式：验证码固定且随响应返回，**上线必须改 false** |
| `app.sms.dev-code` | `888888` | 开发模式固定验证码 |
| `app.sms.expire-seconds` | `300` | 验证码有效期 |
| `app.sms.resend-seconds` | `60` | 同号重发间隔 |
| `app.sms.daily-limit` | `10` | 同号单日下发上限 |
| `app.user.register-gift-quota` | `5` | 首次登录赠送额度 |
| `app.user.default-agreement-version` | `V3.4` | 协议版本 |
| `app.admin.login.fail-limit` | `5` | 连续失败锁定阈值 |
| `app.admin.login.lock-minutes` | `30` | 锁定时长 |
| `app.jwt.user-ttl-minutes` | `10080` | 用户令牌 7 天 |
| `app.jwt.admin-ttl-minutes` | `720` | 管理令牌 12 小时 |
| `app.cors.allowed-origins` | `localhost:5173` | 后台跨域白名单 |
| `app.admin.bootstrap-accounts` | `admin/admin123`、`ops/ops123` | 启动引导账号（ops 首登必须改密） |

---

## 六、错误码

| 段位 | 码 | 含义 |
| --- | --- | --- |
| 通用 | `0` / `10001` / `10002` | 成功 / 参数不合法 / 系统异常 |
| 账号 | `20001` / `20002` / `20003` | 未登录 / 令牌过期 / 无权限或跨端 |
| 账号 | `20010`~`20015` | 手机号非法 / 频控 / 单日上限 / 验证码错误 / 过期 / 封禁 |
| 后台 | `30001`~`30007` | 登录失败 / 停用 / 锁定 / 账号已存在 / 不存在 / 原密码错 / 必须先改密 |
| 额度 | `40001` / `40002` | 额度不足 / 幂等冲突 |
| 云增强 | `50001` / `50002` | 任务忙 / 未授权（预留） |

---

## 七、质量验证

| 项 | 结果 |
| --- | --- |
| JUnit 集成测试 | **25 / 25 通过**（真 HTTP + 真 SQL，每个测试类独立 H2 内存库） |
| 冒烟脚本 `tools/_smoke.ps1` | **34 / 34 通过** |
| MySQL 模式 | 已实跑：25 表导入 + 冒烟全绿 |
| H2 模式 | 已实跑：自动建表 + 冒烟全绿 |
| 测试文档 | `backend/demo/TESTING.md` |

```powershell
cd ~\demo
mvn test        # 25 个用例，不需要 MySQL
```

---

## 八、未实现（明确边界）

| 模块 | 现状 |
| --- | --- |
| 模板管理（上架/下架/预览） | 仅 `app_studio_template` 表 + 8 条种子数据 |
| 云增强任务 | 仅 `app_cloud_task` / `app_deletion_audit` 表 |
| 会员 / 订单 / 退款 | 仅 `app_member_plan` / `app_user_member` / `app_order` / `app_refund` 表 |
| 额度后台调整 | 额度服务已就绪，未开放管理接口 |
| 证件照规格 / 模型包 | 仅 `app_id_spec` / `app_model_package` 表 |
| 数据统计 | 仅 `app_daily_stat` 表 |
| C 端用户管理 | 无列表、无封禁接口（封禁能力在登录时已生效） |

因此管理后台的模板 / 用户 / 会员 / 云任务 / 流水页面仍是 mock 数据。

---

## 九、已知限制（上线前需处理）

1. **短信通道未接，邮箱通道已接**：邮箱走真实 SMTP（`app.mail.provider=smtp`，已实测投递 QQ 邮箱）；短信仍为 dev 模式，`app.sms.dev-mode=true` 时验证码随响应返回。
2. **密钥是占位值**：`app.jwt.secret`、`app.phone.hash-secret` 需改为环境变量注入的随机值。
3. **数据库密码明文**：当前写在 `application.yml`，部署时应走环境变量或配置中心。
4. **登出是「伪登出」**：JWT 无服务端黑名单，登出只清端上令牌，旧令牌在有效期内仍可用。
5. **无限流中间件**：目前只有验证码频控（DB 计数），接口级防刷需网关或 Redis 令牌桶。
6. **列表无分页**：管理员列表、审计日志都是 `limit` 截断，数据量大时需改分页。
7. **无 refresh token**：令牌过期后需重新登录。
8. **H2 只覆盖登录注册**：其余 9 张业务表仅在 MySQL 脚本中存在。
9. **SMTP 凭证写在配置文件里**：`app.mail.password` 目前带默认值，上线前必须改为环境变量 `MAIL_PASSWORD` 注入并轮换授权码。
