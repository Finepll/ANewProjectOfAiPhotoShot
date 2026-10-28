# 后端测试指南（AI 照相馆 · 账号与权限模块）

> 适用版本：`backend/demo`（Spring Boot 4.1.1 + JDK 21 + JdbcTemplate）
> 覆盖范围：C 端手机号登录/自动注册、协议存证、隐私开关、额度流水；管理端分配制登录、强制改密、账号分配、审计日志。
> 不在覆盖范围：模板、云增强任务、会员/订单、统计报表（只有表结构，接口尚未实现）。

---

## 一、测试前准备

### 1.1 环境要求

| 项 | 要求 | 检查命令 |
| --- | --- | --- |
| JDK | 21（项目 `java.version=21`） | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| 数据库 | MySQL 8/9 **或** 用 H2 免安装 | `mysql --version` |
| 终端 | 建议 PowerShell 7（`pwsh`），5.1 也能跑但中文易乱码 | `pwsh -v` |

### 1.2 两种启动方式（二选一）

**方式 A：H2 内存库（最快，适合纯接口测试）**

```powershell
cd G:\system_computer\dangd\Documents\aaatestcodex\aAiPhotoShot\backend\demo
mvn spring-boot:run "-Dspring-boot.run.profiles=h2"
```

- 启动时自动执行 `db/schema-h2.sql` + `db/data-h2.sql`；
- **数据只在内存里，进程重启即清空**（每次重启都是全新库，适合反复跑回归）。

**方式 B：MySQL（验证真实建表脚本与持久化）**

```powershell
cd G:\system_computer\dangd\Documents\aaatestcodex
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS photoshot DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
cmd /c "mysql -uroot -p photoshot < aAiPhotoShot\backend\demo\src\main\resources\db\schema.sql"
cmd /c "mysql -uroot -p photoshot < aAiPhotoShot\backend\demo\src\main\resources\db\data.sql"

cd aAiPhotoShot\backend\demo
mvn spring-boot:run
```

- 脚本含 24 条 `DROP TABLE`，**重跑等于清库重建**；
- `application.yml` 里 `spring.sql.init.mode: never`，所以**必须手动导入**，应用不会自动建表；
- 密码写在 `application.yml` 的 `spring.datasource.password`。

### 1.3 启动成功的判断标准

日志中应出现：

```
Tomcat started on port 3000 (http)
HikariPool-1 - Start completed.
已创建引导管理员账号 username=admin role=SUPER_ADMIN mustChangePassword=false
已创建引导管理员账号 username=ops role=OPS mustChangePassword=true
```

再用健康检查确认：

```powershell
curl.exe -s http://127.0.0.1:3000/api/health
```

期望返回 `code=0` 且 `data.database="up"`：

```json
{"code":0,"message":"ok","data":{"service":"photoshot-backend","time":"2026-10-28T00:02:57","smsDevMode":true,"database":"up"},"timestamp":1791977696000}
```

> 端口默认 **3000**（`application.yml` 的 `server.port`）。被占用时可临时换端口：
> `mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=3001"`，
> 同时要把 `frontend/vite.config.js` 代理和 `miniprogram/utils/request.js` 的 `BASE_URL` 一起改。

---

## 二、5 分钟手工冒烟

以下脚本可直接整段粘贴到 PowerShell 7 执行（默认后端在 3000）。

```powershell
$base = 'http://127.0.0.1:3000'

# 1) 健康检查
Invoke-RestMethod "$base/api/health" | ConvertTo-Json -Depth 5

# 2) 下发验证码（dev 模式固定 888888，且响应会回传）
$codeResp = Invoke-RestMethod "$base/api/user/auth/code" -Method Post `
  -ContentType 'application/json' -Body '{"phone":"13900002888"}'
$codeResp | ConvertTo-Json -Depth 5

# 3) 登录（未注册会自动注册，并一次性签三类协议）
$loginBody = @'
{
  "phone": "13900002888",
  "code": "888888",
  "deviceId": "dev-001",
  "registerSource": "MINIPROGRAM",
  "agreements": [
    {"code": "PORTRAIT", "version": "V3.4"},
    {"code": "PRIVACY",  "version": "V3.4"},
    {"code": "SERVICE",  "version": "V3.4"}
  ]
}
'@
$login = Invoke-RestMethod "$base/api/user/auth/login" -Method Post `
  -ContentType 'application/json' -Body $loginBody
$login | ConvertTo-Json -Depth 5
$token = $login.data.token

# 4) 我的（资料 + 额度 + 隐私 + 协议状态）
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod "$base/api/user/auth/me" -Headers $headers | ConvertTo-Json -Depth 6

# 5) 额度流水（首次登录应有一条 +5 的赠送记录）
Invoke-RestMethod "$base/api/user/auth/quota/flows" -Headers $headers | ConvertTo-Json -Depth 5

# 6) 管理员登录
$adminBody = '{"username":"admin","password":"admin123"}'
$admin = Invoke-RestMethod "$base/api/admin/auth/login" -Method Post `
  -ContentType 'application/json' -Body $adminBody
$admin | ConvertTo-Json -Depth 5
$adminHeaders = @{ Authorization = "Bearer $($admin.data.token)" }

# 7) 管理员列表（仅超管可用）
Invoke-RestMethod "$base/api/admin/admins" -Headers $adminHeaders | ConvertTo-Json -Depth 5
```

**通过标准**

| 步骤 | 期望 |
| --- | --- |
| 1 健康检查 | `code=0`，`data.database="up"` |
| 2 验证码 | `code=0`，`data.devCode="888888"` |
| 3 登录 | `code=0`，`data.newUser=true`，`data.quota.balance=5`，`needAgreement=false` |
| 4 我的 | `phoneMasked=139****2888`，`privacy.localMode=1`、`cloudAllowed=0`，三条协议 `effective=true` |
| 5 流水 | 至少一条 `bizNo=GIFT-REGISTER-1`、`delta=5`、`balanceAfter=5` |
| 6 管理员登录 | `code=0`，`roles=["SUPER_ADMIN"]`，`mustChangePassword=false` |
| 7 管理员列表 | 返回 `admin`、`ops` 两个账号 |

> curl.exe 版本（PowerShell 里用**单引号**包 JSON，别用反斜杠转义）：
> ```powershell
> curl.exe -s http://127.0.0.1:3000/api/health
> curl.exe -s -X POST http://127.0.0.1:3000/api/user/auth/code -H 'Content-Type: application/json' -d '{"phone":"13900002888"}'
> ```

---

### 2.1 邮箱登录（SMTP 通道）

前提：`app.mail.provider=smtp`，`app.mail.dev-mode=true`（本地调试）。测试/`h2` profile 固定走 `log` 通道，不会真的发信。

```powershell
$base = "http://127.0.0.1:3000"
# 1) 下发（会真的发一封邮件）
Invoke-RestMethod "$base/api/user/auth/email/code" -Method Post -ContentType "application/json" `
  -Body '{"email":"you@example.com"}' | ConvertTo-Json -Depth 4

# 2) 登录（dev 模式固定 888888）
$login = Invoke-RestMethod "$base/api/user/auth/email/login" -Method Post -ContentType "application/json" `
  -Body '{"email":"you@example.com","code":"888888","deviceId":"manual-1","registerSource":"H5","agreements":[{"code":"PORTRAIT","version":"V3.4"},{"code":"PRIVACY","version":"V3.4"},{"code":"SERVICE","version":"V3.4"}]}'
$login | ConvertTo-Json -Depth 6

# 3) 用返回的 token 查我的
$h = @{ Authorization = "Bearer " + $login.data.token }
Invoke-RestMethod "$base/api/user/auth/me" -Headers $h | ConvertTo-Json -Depth 5
```

| 步骤 | 期望 |
| --- | --- |
| 1 下发 | `code=0`，`expireSeconds=600`；日志出现 `验证码邮件已投递 provider=smtp` |
| 2 60 秒内重发 | `code=20021` |
| 3 登录 | `code=0`，`newUser=true`，`user.emailMasked=3***@qq.com`，且 `phoneMasked` 字段不出现 |
| 4 我的 | `emailMasked` 同上；隐私默认 `localMode=1`、`cloudAllowed=0` |
| 5 同一验证码再登 | `code=20023`（一次性） |
| 6 SMTP 失败 | `code=20025`，且 `app_email_code` 不留记录（可立即重发） |

> 上线切换：`app.mail.dev-mode=false`（不再回传验证码）+ 用 `MAIL_PASSWORD` 环境变量注入授权码。

## 三、接口一览

### 3.1 公共接口（免登录白名单）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（服务 + 数据库连通性 + 短信是否 dev 模式） |
| POST | `/api/log/save` | 前端日志上报（body：`{"type":"error","message":"..."}`，无返回体） |
| POST | `/api/user/auth/code` | 下发登录验证码 |
| POST | `/api/user/auth/email/code` | 下发邮箱登录验证码（SMTP） |
| POST | `/api/user/auth/login` | C 端登录 / 自动注册 |
| POST | `/api/user/auth/email/login` | 邮箱登录 / 自动注册 |
| POST | `/api/admin/auth/login` | 管理员登录 |

### 3.2 C 端接口（需用户令牌）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/user/auth/me` | 资料 + 额度 + 隐私开关 + 协议状态 |
| GET | `/api/user/auth/agreement/list` | 协议列表（含签署时间、存证指纹） |
| POST | `/api/user/auth/agreement` | 补充签署单个协议 |
| POST | `/api/user/auth/agreement/revoke` | 撤回协议（肖像权撤回后拍摄/导出入口关闭） |
| PUT | `/api/user/auth/privacy` | 更新隐私开关 |
| GET | `/api/user/auth/quota/flows?limit=20` | 额度流水（1~100） |
| POST | `/api/user/auth/logout` | 退出登录（JWT 无状态，端上删令牌即可） |

### 3.3 管理端接口（需管理员令牌）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/auth/me` | 任意管理员 | 当前身份 + 角色 + 权限点 |
| POST | `/api/admin/auth/change-password` | 任意管理员 | 改密（首登强制改密也走这里） |
| POST | `/api/admin/auth/logout` | 任意管理员 | 退出登录 |
| GET | `/api/admin/admins` | 超管 | 管理员列表 |
| GET | `/api/admin/admins/roles` | 任意管理员 | 角色下拉 `[[码, 名称], ...]` |
| POST | `/api/admin/admins` | 超管 | 分配新账号（首次登录强制改密） |
| PUT | `/api/admin/admins/{id}/status` | 超管 | 启用/停用（`status`: 1 启用 / 0 停用） |
| POST | `/api/admin/admins/{id}/reset-password` | 超管 | 重置他人密码 |
| GET | `/api/admin/audit/login-logs?limit=50` | 超管 / 审计员 | 登录日志（含失败原因） |
| GET | `/api/admin/audit/operation-logs?limit=50` | 超管 / 审计员 | 操作审计日志 |

### 3.4 关键请求体

```json
// 下发验证码
{ "phone": "13900002888" }

// C 端登录（agreements 可只传需要补签的，缺省则不签）
{
  "phone": "13900002888",
  "code": "888888",
  "deviceId": "dev-001",
  "registerSource": "MINIPROGRAM",
  "agreements": [{ "code": "PORTRAIT", "version": "V3.4" }]
}

// 协议：code 只能是 PORTRAIT / PRIVACY / SERVICE
{ "code": "PORTRAIT", "version": "V3.4", "deviceId": "dev-001", "reason": "撤回原因（选填）" }

// 隐私开关（四个字段都可选，只传要改的）
{ "localMode": 1, "cloudAllowed": 0, "faceFeatureSaved": 0, "autoCleanDays": 7 }

// 管理员登录
{ "username": "admin", "password": "admin123" }

// 分配账号（用户名 3~32 位字母数字下划线；密码 8~32 位且含字母+数字）
{
  "username": "ops2",
  "password": "ops2pass1",
  "realName": "张小二",
  "phoneMasked": "138****0009",
  "emailMasked": "op***@photoshot.com",
  "roleCode": "OPS"
}

// 改密 / 重置密码
{ "oldPassword": "ops123", "newPassword": "ops12345" }
{ "newPassword": "reset1234", "reason": "离职交接" }

// 启停账号
{ "status": 0, "reason": "违规操作" }
```

---

## 四、鉴权与令牌规则

1. 所有需登录接口都要带请求头：`Authorization: Bearer <token>`。
2. 令牌分两类，**不能混用**：
   - 用户令牌访问 `/api/admin/**` → `20003`「请使用管理员账号登录后台」；
   - 管理员令牌访问 `/api/user/**` → `20003`「请使用用户端登录态访问该接口」。
3. 有效期：用户 7 天（`10080` 分钟），管理员 12 小时（`720` 分钟）。
4. 响应约定：
   - **业务失败也是 HTTP 200**，靠 `code != 0` 判断；
   - **只有登录态失效**（缺令牌、令牌非法/过期、跨端使用）返回 **HTTP 401**，body 里是 `code=20001/20002/20003`。
5. JWT 载荷只有 `sub`（账号 ID）、`typ`（USER/ADMIN）、`name`（掩码或账号名）、`roles`，不含手机号明文与人脸信息。

---

## 五、错误码对照表

| 段位 | 码 | 含义 | 典型触发方式 |
| --- | --- | --- | --- |
| 通用 | `0` | 成功 | — |
| 通用 | `10001` | 参数不合法 | 手机号格式错、密码强度不够、撤回不存在的协议 |
| 通用 | `10002` | 系统异常 | 数据库断开等 |
| 账号 | `20001` | 未登录 | 不带 `Authorization` |
| 账号 | `20002` | 令牌过期 | 改系统时间或等 7 天 |
| 账号 | `20003` | 无权限 / 跨端 | 用户令牌调管理接口 |
| 账号 | `20010` | 手机号非法 | `12345678901` |
| 账号 | `20011` | 验证码频控 | 60 秒内第二次下发 |
| 账号 | `20012` | 单日上限 | 同一号码当天第 11 次下发 |
| 账号 | `20013` | 验证码错误 | 传 `123456` |
| 账号 | `20014` | 验证码过期 | 5 分钟后使用 |
| 账号 | `20015` | 账号封禁 | `app_user.status=0`（封禁）时登录 |
| 后台 | `30001` | 账号或密码错误 | 错密码（账号不存在同码，防枚举） |
| 后台 | `30002` | 账号已停用 | 停用后登录 |
| 后台 | `30003` | 账号锁定 | 连续错 5 次 |
| 后台 | `30004` | 账号已存在 | 重复分配同名账号 |
| 后台 | `30005` | 管理员不存在 | 操作已删除账号 |
| 后台 | `30006` | 原密码错误 | 改密时旧密码填错 |
| 后台 | `30007` | 必须先改密 | 首登/被重置后直接调管理接口 |
| 额度 | `40001` | 额度不足 | 扣减后余额为负 |
| 额度 | `40002` | 幂等冲突 | 业务号重复（预留） |
| 云增强 | `50001` | 任务排队中 | 预留 |
| 云增强 | `50002` | 未授权云端 | 预留 |

---

## 六、必须验证的业务规则

### 6.1 C 端

| # | 规则 | 测试方法 | 期望 |
| --- | --- | --- | --- |
| 1 | 60 秒频控 | 连续两次 `/code` | 第二次 `20011` |
| 2 | 验证码 5 分钟有效 | 下发后等 5 分钟再登录 | `20014` |
| 3 | 验证码一次性 | 同一验证码登录两次 | 第二次 `20013`（请先获取验证码） |
| 4 | 单日 10 条上限 | 同号码循环下发（跳过 60 秒频控可用不同号码验证数据库） | 第 11 次 `20012` |
| 5 | 未注册自动注册 | 新号码直接登录 | `newUser=true`，`app_user` 新增一行 |
| 6 | 首次赠送只发一次 | 同一账号退出后再登录 | 只有一条 `GIFT-REGISTER-<id>` 流水，余额不变 |
| 7 | 三类协议 | 登录时传 `agreements` | `me.consents` 三条 `effective=true` |
| 8 | 撤回授权 | 调 `/agreement/revoke` 传 `PORTRAIT` | 该条 `effective=false`，`signedAt` 保留 |
| 9 | 重新签署 | 撤回后再签 | 生成新的 `signHash`，`effective=true` |
| 10 | 隐私开关 | `PUT /privacy` 改 `autoCleanDays=3` | 返回体里 `privacy.autoCleanDays=3` |
| 11 | 参数边界 | `autoCleanDays=400` | `10001`「需在 0~365 之间」 |
| 12 | 手机号脱敏 | 登录后看 `/me` | 只有 `139****2888`，全库无明文 |

### 6.2 管理端

| # | 规则 | 测试方法 | 期望 |
| --- | --- | --- | --- |
| 1 | 分配制无注册 | 找 `/api/admin/auth/register` | 404 |
| 2 | 错密码计数 | 连续错 4 次 | 提示剩余次数，第 5 次 `30003` 锁定 |
| 3 | 锁定 30 分钟 | 锁定期内再登录 | `30003`，提示剩余分钟 |
| 4 | 首登强制改密 | 用超管分配的新账号登录 | `mustChangePassword=true` |
| 5 | 服务端硬闸门 | 未改密就调 `/api/admin/admins` | `30007`（不是只靠前端拦） |
| 6 | 改密后放行 | 调 `/change-password` 再访问 | 正常返回；`mustChangePassword=false` |
| 7 | 密码策略 | 新密码 `abcdefgh` | `10001`「需含字母与数字」 |
| 8 | 新密码不能复用 | 新旧密码相同 | `10001`「不能与原密码相同」 |
| 9 | 不能停用自己 | 超管停用自己 | `10001` |
| 10 | 保留最后一个超管 | 停用唯一超管 | `10001` |
| 11 | 重置密码 | 超管重置他人密码 | 对方旧密码 `30001`，新密码可登 |
| 12 | 重置后强制改密 | 被重置账号登录 | `mustChangePassword=true` |
| 13 | 停用即拒登 | `status=0` 后登录 | `30002` |
| 14 | 审计留痕 | 分配/改密/启停后查操作日志 | `sys_operation_log` 有对应 `action` |
| 15 | 登录日志 | 登录失败后查登录日志 | `result=0` + `fail_reason` |
| 16 | 审计只读 | 找删除/修改日志的接口 | 不存在（设计如此） |

### 6.3 安全与合规断言

| # | 断言 | 验证方式 |
| --- | --- | --- |
| 1 | 库里没有图片表 | 查 `information_schema.tables` 无 `file_asset` / `artwork` / `ai_task` |
| 2 | 库里没有明文手机号 | 查 `app_user` 只有 `phone_hash`、`phone_masked` |
| 3 | 库里没有人脸特征 | 全库无 `face_feature` 类列 |
| 4 | 验证码只存哈希 | `app_sms_code.code_hash` 是 64 位十六进制 |
| 5 | 日志不打印敏感信息 | `logs/` 里搜不到手机号明文与验证码 |
| 6 | 密码 BCrypt | `sys_admin.password_hash` 以 `$2a$` 开头 |

---

## 七、自动化测试

### 7.1 JUnit 集成测试（推荐先跑这个）

```powershell
cd G:\system_computer\dangd\Documents\aaatestcodex\aAiPhotoShot\backend\demo
mvn test          # 25 个用例，约 25 秒
```

| 测试类 | 用例数 | 覆盖内容 |
| --- | --- | --- |
| `UserAuthApiTest` | 11 | 健康检查、未登录 401、手机号校验、60 秒频控、错验证码、自动注册、赠额度幂等、协议撤回/重签、隐私开关、跨端令牌、登出 |
| `AdminAuthApiTest` | 9 | 登录失败/成功、角色与权限、分配账号、重复账号、首登强制改密硬闸门、重置密码、停用/启用、不能停用自己、审计日志 |
| `ComplianceSchemaTest` | 4 | 无图片/人脸表、手机号只存哈希与掩码、密码 BCrypt、验证码哈希、JWT 不含明文手机号 |
| `DemoApplicationTests` | 1 | Spring 上下文加载 |

- 用**真实 HTTP 调用 + 真实 H2 数据库**，不是 Mock，接口与 SQL 都会被真正执行；
- 每个测试类使用**独立内存库**（随机库名，见 `ApiTestBase#freshDatabase`），重复执行、并行执行都不会互相污染；
- 不依赖 MySQL、不需要手工清库，`mvn test` 一条命令即可；
- 只看某个类：`mvn test -Dtest=UserAuthApiTest`。

### 7.2 冒烟脚本 `tools/_smoke.ps1`

仓库已带一个 34 项的冒烟脚本，覆盖上面绝大多数规则。

**前置条件（必须满足，否则会误判）**

1. 后端已启动，地址 `http://127.0.0.1:3000`；
2. **数据库是全新的**（脚本会创建用户 `13900002888`、管理员 `ops2`，并改 `ops2` 密码）；
3. 使用 `pwsh`（PowerShell 7）执行。

**运行**

```powershell
cd G:\system_computer\dangd\Documents\aaatestcodex

# H2 模式：重启进程即全新库
cd aAiPhotoShot\backend\demo
mvn spring-boot:run "-Dspring-boot.run.profiles=h2"

# 另开一个终端
cd G:\system_computer\dangd\Documents\aaatestcodex
pwsh -NoProfile -ExecutionPolicy Bypass -File tools\_smoke.ps1
```

期望最后一行：

```
================ 通过 34 项，失败 0 项 ================
```

**MySQL 模式重跑前先重置**

```powershell
cd G:\system_computer\dangd\Documents\aaatestcodex
cmd /c "mysql -uroot -p photoshot < aAiPhotoShot\backend\demo\src\main\resources\db\schema.sql"
cmd /c "mysql -uroot -p photoshot < aAiPhotoShot\backend\demo\src\main\resources\db\data.sql"
```

> 注意：重置会执行 24 条 `DROP TABLE`。仅用于开发库。

---

## 八、数据库核对 SQL

```sql
-- 账号（应只有哈希与掩码，无明文手机号）
SELECT id, phone_masked, nickname, status, login_count, register_source, register_at
FROM photoshot.app_user ORDER BY id DESC LIMIT 10;

-- 协议存证（三条 + 存证指纹）
SELECT user_id, agreement_code, agreement_version, status, signed_at, LEFT(sign_hash, 16) AS sign_hash_head
FROM photoshot.app_user_consent ORDER BY id DESC LIMIT 10;

-- 隐私开关（默认 local_mode=1, cloud_allowed=0, face_feature_saved=0）
SELECT * FROM photoshot.app_user_privacy;

-- 额度账户与流水（biz_no 唯一，可对账）
SELECT user_id, balance, total_granted, total_used FROM photoshot.app_quota_account;
SELECT biz_no, change_type, delta, balance_after, operator, remark, created_at
FROM photoshot.app_quota_flow ORDER BY id DESC LIMIT 10;

-- 管理员（password_hash 应为 $2a$ 开头的 BCrypt）
SELECT id, username, LEFT(password_hash, 7) AS hash_head, status, must_change_password, fail_count, locked_until
FROM photoshot.sys_admin;

-- 登录日志（成功/失败都留痕）
SELECT username, result, fail_reason, client_ip, created_at
FROM photoshot.sys_admin_login_log ORDER BY id DESC LIMIT 20;

-- 操作审计（分配/改密/启停）
SELECT username, module, action, biz_no, created_at
FROM photoshot.sys_operation_log ORDER BY id DESC LIMIT 20;

-- 合规断言：不应存在图片/人脸相关表（期望 0 行）
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'photoshot'
  AND (table_name LIKE '%file%' OR table_name LIKE '%artwork%' OR table_name LIKE '%face%');
```

常用运维语句：

```sql
-- 解锁账号（等不及 30 分钟时用）
UPDATE photoshot.sys_admin SET fail_count = 0, locked_until = NULL WHERE username = 'ops';

-- 清除「必须改密」标记（仅本地调试）
UPDATE photoshot.sys_admin SET must_change_password = 0 WHERE username = 'ops';
```

---

## 九、常见问题排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `Error 1046 No database selected` | 在 GUI 里直接跑脚本，没选库 | 先 `CREATE DATABASE`，再双击库名设为默认库，或命令行 `mysql photoshot < xxx.sql` |
| `Error 1045 Access denied` | MySQL 密码不对 | 改 `application.yml` 的 `password`；确认服务连的是同一个实例（3306） |
| 启动报 `Port 3000 was already in use` | 旧进程没退干净 | `Get-NetTCPConnection -LocalPort 3000 -State Listen` 找到 PID 后 `Stop-Process -Id <pid> -Force` |
| 所有接口 401 / `20001` | 没带 `Authorization: Bearer <token>` | 补请求头；注意 `Bearer` 后有一个空格 |
| 调管理接口返回 `20003` | 用了用户令牌 | 重新用 `/api/admin/auth/login` 换管理员令牌 |
| 一直 `30007` | 账号处于「必须改密」状态 | 先调 `/api/admin/auth/change-password` |
| 登录返回 `30003` | 连续错 5 次锁定 30 分钟 | 等 30 分钟，或用上面 SQL 解锁 |
| 验证码收不到 | `app.sms.dev-mode=true` 时不发真短信 | 直接用响应里的 `devCode`（默认 `888888`） |
| 第二次下发验证码报 `20011` | 60 秒频控 | 等 60 秒，或换测试号码 |
| 冒烟脚本第 18 项失败（`30004`） | 库不是全新的，`ops2` 已存在 | 重置库后重跑 |
| PowerShell 报 `Unknown lifecycle phase ".run.profiles=h2"` | `-D` 参数被拆开了 | 加引号：`mvn spring-boot:run "-Dspring-boot.run.profiles=h2"` |
| PowerShell 里 `curl` 行为异常 | `curl` 是 `Invoke-WebRequest` 的别名 | 用 `curl.exe`，或用 `Invoke-RestMethod` |
| 中文返回乱码 | PowerShell 5.1 默认编码 | 换 `pwsh`，或在脚本首行加 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` |

---

## 十、测试边界（避免误判为 Bug）

以下内容**本版未实现**，只有数据库表与种子数据，接口返回 404 属正常：

- 模板管理（`app_studio_template`）
- 云增强任务与删除审计（`app_cloud_task` / `app_deletion_audit`）
- 会员、订单、退款（`app_member_plan` / `app_user_member` / `app_order` / `app_refund`）
- 证件照规格、模型包、日报统计（`app_id_spec` / `app_model_package` / `app_daily_stat`）
- 额度后台调整接口（表与幂等机制已就绪，接口未开）

另外：

- `app.sms.dev-mode=true` 只用于开发/演示，**上线前必须改为 false 并接真实短信通道**，否则验证码会随响应回传；
- JWT 密钥、手机号哈希密钥当前是开发占位值，上线前必须换成环境变量注入的随机密钥；
- 管理后台默认只允许 `http://localhost:5173` 跨域（`app.cors.allowed-origins`）。

---

## 十一、附：可重复的测试数据准备

```powershell
# 清空 C 端测试痕迹（保留管理员与种子数据）
mysql -uroot -p photoshot -e "
DELETE FROM app_sms_code; DELETE FROM app_user_consent; DELETE FROM app_user_privacy;
DELETE FROM app_quota_flow;     DELETE FROM app_quota_account;  DELETE FROM app_user;
"

# 重置管理员失败计数与锁定
mysql -uroot -p photoshot -e "
UPDATE sys_admin SET fail_count = 0, locked_until = NULL;
"
```

> 只建议在本地开发库执行；生产环境不要这么干。
