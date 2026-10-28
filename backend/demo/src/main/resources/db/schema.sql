-- =====================================================================
-- AI 照相馆 · MySQL 8.0 建表脚本（V3.4）
-- 依据：《AI照相馆-功能报告》V3.4（F-ACC / F-CAP / F-ID / F-STU / F-EDT / F-OUT /
--       F-CLD / F-PAY / F-ADM / F-SRV）与《AI照相馆-需求分析报告》
-- 技术栈：SpringBoot 4（JDBC + JdbcTemplate） + Vue3 管理后台 + 微信小程序
--
-- 【设计约定】
--   1. 引擎 InnoDB / 字符集 utf8mb4 / 排序 utf8mb4_0900_ai_ci
--   2. 主键 BIGINT UNSIGNED AUTO_INCREMENT；对外用业务号（uk_* 唯一索引）保证幂等
--   3. 状态用 TINYINT + COMMENT，不用 ENUM（便于灰度与扩展）
--   4. 不建物理外键：关系由应用层保证并配索引，便于归档与分表
--   5. 时间列统一 DATETIME，由应用侧写入，避免时区与幂等歧义
--   6. 资金与额度相关表一律带业务号 + 唯一索引，任何一笔变动都可对账追溯
--
-- 【合规红线（与 V3.4 一致，改表前请先读）】
--   R1 服务端不存用户原始照片、人像蒙版、人脸特征向量 → 本脚本没有 file_asset / face_feature 类表；
--   R2 服务端不存用户作品与编辑工程 → 本脚本没有 artwork / edit_project 类表；
--   R3 唯一允许图片上行的通道是云增强（app_cloud_task），上行文件按「限时数据」处理，
--      回传确认后物理删除并写入 app_deletion_audit（只允许插入，不允许业务侧修改）；
--   R4 手机号不存明文：只存 HMAC-SHA256(手机号) 与掩码，用于账号归属与脱敏展示；
--   R5 后台不提供人脸原图与作品查看能力，因此后台相关表里不存在任何图片字段。
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 一、后台管理域（F-ADM-03 管理员与权限 / F-SRV-01 账号与鉴权）
--     管理员账号由超管或开发人员分配，系统不提供自助注册
-- =====================================================================

DROP TABLE IF EXISTS `sys_admin`;
CREATE TABLE `sys_admin` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username`             VARCHAR(64)  NOT NULL                COMMENT '登录账号（由超管/开发分配，无自助注册入口）',
  `password_hash`        VARCHAR(100) NOT NULL                COMMENT 'BCrypt 加盐哈希，禁止明文与可逆加密',
  `real_name`            VARCHAR(64)  NOT NULL DEFAULT ''      COMMENT '姓名',
  `phone_masked`         VARCHAR(20)  NOT NULL DEFAULT ''      COMMENT '手机号掩码（列表页一律脱敏展示）',
  `email_masked`         VARCHAR(96)  NOT NULL DEFAULT ''      COMMENT '邮箱掩码',
  `status`               TINYINT      NOT NULL DEFAULT 1       COMMENT '1启用 0停用',
  `must_change_password` TINYINT      NOT NULL DEFAULT 1       COMMENT '1=首次登录强制改密',
  `fail_count`           INT          NOT NULL DEFAULT 0       COMMENT '连续登录失败次数',
  `locked_until`         DATETIME     NULL                     COMMENT '锁定截止时间（失败 5 次锁 30 分钟）',
  `last_login_at`        DATETIME     NULL,
  `last_login_ip`        VARCHAR(64)  NULL,
  `created_by`           BIGINT UNSIGNED NOT NULL DEFAULT 0    COMMENT '创建人（超管 id，0=系统初始化）',
  `created_at`           DATETIME     NOT NULL,
  `updated_at`           DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`),
  KEY `idx_admin_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='后台管理员账号（分配制，不开放注册）';

DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code`   VARCHAR(32) NOT NULL COMMENT '角色码：SUPER_ADMIN / OPS / AUDITOR',
  `role_name`   VARCHAR(64) NOT NULL,
  `description` VARCHAR(200) NOT NULL DEFAULT '',
  `status`      TINYINT NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色（RBAC）';

DROP TABLE IF EXISTS `sys_permission`;
CREATE TABLE `sys_permission` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `perm_code`   VARCHAR(64) NOT NULL COMMENT '权限点：cloud:retry / refund:approve …（按钮级）',
  `perm_name`   VARCHAR(64) NOT NULL,
  `module`      VARCHAR(32) NOT NULL COMMENT '所属模块，用于菜单级控制',
  `perm_type`   TINYINT NOT NULL DEFAULT 1 COMMENT '1菜单 2按钮',
  `created_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_perm_code` (`perm_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='权限点（菜单级 + 按钮级）';

DROP TABLE IF EXISTS `sys_admin_role`;
CREATE TABLE `sys_admin_role` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`   BIGINT UNSIGNED NOT NULL,
  `role_id`    BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_role` (`admin_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员-角色';

DROP TABLE IF EXISTS `sys_role_permission`;
CREATE TABLE `sys_role_permission` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id`       BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `created_at`    DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色-权限';

DROP TABLE IF EXISTS `sys_admin_login_log`;
CREATE TABLE `sys_admin_login_log` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '失败且账号不存在时为 0',
  `username`    VARCHAR(64) NOT NULL,
  `result`      TINYINT NOT NULL COMMENT '1成功 0失败',
  `fail_reason` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '密码错误 / 账号停用 / 锁定中 / 账号不存在',
  `client_ip`   VARCHAR(64) NULL,
  `user_agent`  VARCHAR(300) NULL,
  `created_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_login_admin_time` (`admin_id`, `created_at`),
  KEY `idx_login_username_time` (`username`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员登录日志（异常登录可追溯）';

DROP TABLE IF EXISTS `sys_operation_log`;
CREATE TABLE `sys_operation_log` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    BIGINT UNSIGNED NOT NULL,
  `username`    VARCHAR(64) NOT NULL,
  `module`      VARCHAR(32) NOT NULL COMMENT '模块：TEMPLATE / USER / QUOTA / ORDER / REFUND / ADMIN / CLOUD',
  `action`      VARCHAR(64) NOT NULL COMMENT '动作：QUOTA_ADJUST / BAN_USER / TEMPLATE_OFFLINE …',
  `biz_no`      VARCHAR(64) NULL COMMENT '业务号：订单号 / 任务号 / 用户 id，便于按业务号追溯',
  `before_json` TEXT NULL COMMENT '变更前内容',
  `after_json`  TEXT NULL COMMENT '变更后内容',
  `client_ip`   VARCHAR(64) NULL,
  `created_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_op_admin_time` (`admin_id`, `created_at`),
  KEY `idx_op_biz_no` (`biz_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='后台操作审计（敏感操作必写）';

DROP TABLE IF EXISTS `sys_config`;
CREATE TABLE `sys_config` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key`   VARCHAR(64) NOT NULL,
  `config_value` VARCHAR(300) NOT NULL,
  `value_type`   VARCHAR(16) NOT NULL DEFAULT 'STRING' COMMENT 'STRING / INT / BOOL / JSON',
  `remark`       VARCHAR(200) NOT NULL DEFAULT '',
  `updated_by`   VARCHAR(64) NOT NULL DEFAULT 'system',
  `updated_at`   DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='运行配置（频次上限、分辨率上限、模型开关等）';

-- =====================================================================
-- 二、C 端用户域（F-ACC-01 手机号验证码登录 / F-ACC-02 协议与肖像权授权）
-- =====================================================================

DROP TABLE IF EXISTS `app_user`;
CREATE TABLE `app_user` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone_hash`      CHAR(64)    NULL COMMENT 'HMAC-SHA256(手机号 + 服务端密钥)，唯一；不存明文；邮箱注册用户为 NULL',
  `phone_masked`    VARCHAR(20) NULL COMMENT '脱敏手机号 138****8888；邮箱注册用户为 NULL',
  `email_hash`      CHAR(64)    NULL COMMENT 'HMAC-SHA256(规范化邮箱 + 服务端密钥)，唯一；仅邮箱注册用户有值',
  `email_masked`    VARCHAR(100) NULL COMMENT '脱敏邮箱 3***@qq.com',
  `nickname`        VARCHAR(64) NOT NULL DEFAULT '' COMMENT '昵称（默认「影友 + 尾号」，不含任何生物特征）',
  `status`          TINYINT     NOT NULL DEFAULT 1 COMMENT '1正常 0封禁',
  `ban_reason`      VARCHAR(200) NULL,
  `banned_at`       DATETIME    NULL,
  `banned_by`       BIGINT UNSIGNED NULL COMMENT '操作管理员 id',
  `register_source` VARCHAR(32) NOT NULL DEFAULT 'MINIPROGRAM' COMMENT '注册来源：MINIPROGRAM / H5',
  `register_ip`     VARCHAR(64) NULL,
  `register_at`     DATETIME    NOT NULL COMMENT '注册时间（首次登录即注册）',
  `last_login_at`   DATETIME    NULL,
  `login_count`     INT         NOT NULL DEFAULT 0,
  `created_at`      DATETIME    NOT NULL,
  `updated_at`      DATETIME    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_phone_hash` (`phone_hash`),
  UNIQUE KEY `uk_user_email_hash` (`email_hash`),
  KEY `idx_user_status` (`status`),
  KEY `idx_user_register_at` (`register_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='C端用户（手机号仅做账号标识与额度归属，不与人脸特征关联）';

DROP TABLE IF EXISTS `app_sms_code`;
CREATE TABLE `app_sms_code` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone_hash` CHAR(64)   NOT NULL,
  `scene`      VARCHAR(32) NOT NULL DEFAULT 'LOGIN' COMMENT '场景：LOGIN / REBIND',
  `code_hash`  CHAR(64)   NOT NULL COMMENT 'SHA-256(场景 + 手机号 + 验证码)，不存明文',
  `expire_at`  DATETIME   NOT NULL COMMENT '有效期 5 分钟',
  `used`       TINYINT    NOT NULL DEFAULT 0,
  `used_at`    DATETIME   NULL,
  `send_ip`    VARCHAR(64) NULL,
  `created_at` DATETIME   NOT NULL COMMENT '下发时间（同一号码 60 秒内不重复下发）',
  PRIMARY KEY (`id`),
  KEY `idx_sms_phone_scene` (`phone_hash`, `scene`, `created_at`),
  KEY `idx_sms_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='短信验证码（哈希存储，5 分钟有效，60 秒频控）';

DROP TABLE IF EXISTS `app_email_code`;
CREATE TABLE `app_email_code` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email_hash` CHAR(64)   NOT NULL COMMENT 'HMAC-SHA256(规范化邮箱 + 服务端密钥)，不存明文',
  `scene`      VARCHAR(32) NOT NULL DEFAULT 'LOGIN' COMMENT '场景：LOGIN / REBIND',
  `code_hash`  CHAR(64)   NOT NULL COMMENT 'SHA-256(场景 + 规范化邮箱 + 验证码)，不存明文',
  `expire_at`  DATETIME   NOT NULL COMMENT '有效期 10 分钟（邮件比短信慢，留更多余量）',
  `used`       TINYINT    NOT NULL DEFAULT 0,
  `used_at`    DATETIME   NULL,
  `send_ip`    VARCHAR(64) NULL,
  `created_at` DATETIME   NOT NULL COMMENT '下发时间（同一邮箱 60 秒内不重复下发）',
  PRIMARY KEY (`id`),
  KEY `idx_email_code_target` (`email_hash`, `scene`, `created_at`),
  KEY `idx_email_code_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='邮箱验证码（哈希存储，10 分钟有效，60 秒频控）';


DROP TABLE IF EXISTS `app_user_consent`;
CREATE TABLE `app_user_consent` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           BIGINT UNSIGNED NOT NULL,
  `agreement_code`    VARCHAR(32)  NOT NULL COMMENT 'PORTRAIT 肖像权授权 / PRIVACY 隐私政策 / SERVICE 用户服务协议',
  `agreement_version` VARCHAR(16)  NOT NULL COMMENT '协议版本，如 V3.4',
  `status`            TINYINT      NOT NULL DEFAULT 1 COMMENT '1有效 0已撤回',
  `signed_at`         DATETIME     NOT NULL COMMENT '签署时间（服务端存证口径）',
  `device_id`         VARCHAR(64)  NULL COMMENT '设备标识，用于凭证核验',
  `sign_hash`         CHAR(64)     NOT NULL COMMENT '签署哈希 = SHA-256(用户+协议+版本+时间+设备)，本机留存同一份',
  `client_ip`         VARCHAR(64)  NULL,
  `revoked_at`        DATETIME     NULL,
  `revoke_reason`     VARCHAR(200) NULL,
  `created_at`        DATETIME     NOT NULL,
  `updated_at`        DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_consent_user_code_ver` (`user_id`, `agreement_code`, `agreement_version`),
  KEY `idx_consent_signed_at` (`signed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='协议与肖像权授权存证（不含任何人脸特征）';

DROP TABLE IF EXISTS `app_user_privacy`;
CREATE TABLE `app_user_privacy` (
  `user_id`             BIGINT UNSIGNED NOT NULL,
  `local_mode`          TINYINT NOT NULL DEFAULT 1 COMMENT 'F-ACC-03 本地隐私模式（默认开启）',
  `cloud_allowed`       TINYINT NOT NULL DEFAULT 0 COMMENT 'F-ACC-04 云端能力是否已授权（仍需逐次确认）',
  `face_feature_saved`  TINYINT NOT NULL DEFAULT 0 COMMENT '是否在本机保留人脸特征（默认关闭；服务端只记开关，不存特征）',
  `auto_clean_days`     INT     NOT NULL DEFAULT 7 COMMENT '沙盒临时文件自动清理天数',
  `up_count`            INT     NOT NULL DEFAULT 0 COMMENT '上行计数（由端侧统计上报，用于隐私看板核对）',
  `updated_at`          DATETIME NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='隐私设置（只存开关与计数，不存图片与人脸数据）';

-- =====================================================================
-- 三、云增强域（F-CLD-01 提交 / F-CLD-02 回传与即时删除；F-SRV-03 调度与删除审计）
-- =====================================================================

DROP TABLE IF EXISTS `app_cloud_task`;
CREATE TABLE `app_cloud_task` (
  `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_no`            VARCHAR(40)  NOT NULL COMMENT '业务号（对外，幂等）',
  `user_id`            BIGINT UNSIGNED NOT NULL,
  `capability`         VARCHAR(32)  NOT NULL COMMENT 'SUPER_RESOLUTION / MODEL_STYLE / GEN_BACKGROUND / PLANNER',
  `model_tier`         VARCHAR(32)  NOT NULL DEFAULT 'STANDARD' COMMENT '模型档位，取决于会员权益',
  `status`             TINYINT      NOT NULL DEFAULT 0 COMMENT '0排队 1处理中 2成功 3失败 4已取消',
  `auth_scope`         VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'F-CLD-01 逐次授权文案快照（本次将上行 1 张图片…）',
  `authorized_at`      DATETIME     NOT NULL COMMENT '逐次显式授权时间（未授权不得上行）',
  `input_fingerprint`  CHAR(64)     NULL COMMENT '上行文件指纹（哈希，非图片）',
  `input_object_key`   VARCHAR(200) NULL COMMENT '限时桶对象键；删除后置空',
  `input_uploaded_at`  DATETIME     NULL,
  `input_deleted`      TINYINT      NOT NULL DEFAULT 0 COMMENT '1=已物理删除',
  `input_deleted_at`   DATETIME     NULL,
  `result_returned_at` DATETIME     NULL,
  `result_ack_at`      DATETIME     NULL COMMENT '结果回传确认时间（触发即时删除）',
  `error_code`         VARCHAR(64)  NULL,
  `retry_count`        INT          NOT NULL DEFAULT 0,
  `cost_ms`            INT          NULL COMMENT '耗时',
  `quota_flow_no`      VARCHAR(40)  NULL COMMENT '额度扣减流水业务号（失败回滚同一业务号体系）',
  `created_at`         DATETIME     NOT NULL,
  `updated_at`         DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cloud_task_no` (`task_no`),
  KEY `idx_cloud_user_status` (`user_id`, `status`),
  KEY `idx_cloud_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='云增强任务（唯一图片上行通道，图片为限时数据）';

DROP TABLE IF EXISTS `app_deletion_audit`;
CREATE TABLE `app_deletion_audit` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_no`          VARCHAR(40)  NOT NULL,
  `object_kind`      VARCHAR(24)  NOT NULL COMMENT 'INPUT 上行原图 / MIDDLE 中间产物 / RESULT 结果文件',
  `object_key`       VARCHAR(200) NOT NULL,
  `file_fingerprint` CHAR(64)     NOT NULL COMMENT '文件指纹，删除留痕用',
  `deleted_at`       DATETIME     NOT NULL,
  `delete_mode`      VARCHAR(16)  NOT NULL DEFAULT 'AUTO' COMMENT 'AUTO 回传后自动删除 / MANUAL 人工处置',
  `operator`         VARCHAR(64)  NOT NULL DEFAULT 'system',
  `audit_hash`       CHAR(64)     NOT NULL COMMENT '本条审计的哈希，防篡改核对',
  `created_at`       DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_del_task_no` (`task_no`),
  KEY `idx_del_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='删除审计（独立保存，只插入不修改，供合规核查）';

-- =====================================================================
-- 四、额度与会员支付域（F-SRV-03 额度 / F-SRV-04 支付 / F-SRV-05 权益；F-PAY / F-ADM-05~07）
-- =====================================================================

DROP TABLE IF EXISTS `app_quota_account`;
CREATE TABLE `app_quota_account` (
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `balance`       INT NOT NULL DEFAULT 0 COMMENT '可用云增强次数',
  `total_granted` INT NOT NULL DEFAULT 0 COMMENT '累计发放',
  `total_used`    INT NOT NULL DEFAULT 0 COMMENT '累计消耗',
  `version`       INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
  `updated_at`    DATETIME NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='额度账户（服务端记账为唯一口径）';

DROP TABLE IF EXISTS `app_quota_flow`;
CREATE TABLE `app_quota_flow` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `biz_no`        VARCHAR(40) NOT NULL COMMENT '业务号（幂等键，重复提交只入账一次）',
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `change_type`   TINYINT NOT NULL COMMENT '1注册赠送 2云增强扣减 3失败回滚 4后台调整 5活动赠送 6退款回退 7会员发放',
  `delta`         INT NOT NULL COMMENT '正数增加，负数扣减',
  `balance_after` INT NOT NULL,
  `task_no`       VARCHAR(40) NULL,
  `order_no`      VARCHAR(40) NULL,
  `operator`      VARCHAR(64) NOT NULL DEFAULT 'system',
  `remark`        VARCHAR(200) NOT NULL DEFAULT '',
  `created_at`    DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quota_flow_biz` (`biz_no`),
  KEY `idx_quota_flow_user_time` (`user_id`, `created_at`),
  KEY `idx_quota_flow_task` (`task_no`),
  KEY `idx_quota_flow_order` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='额度流水（与后台额度调整共用同一口径）';

DROP TABLE IF EXISTS `app_member_plan`;
CREATE TABLE `app_member_plan` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_code`      VARCHAR(32) NOT NULL COMMENT '规格码：PL-M / PL-Q / PL-Y / PL-P10',
  `plan_name`      VARCHAR(64) NOT NULL,
  `plan_type`      TINYINT NOT NULL DEFAULT 1 COMMENT '1会员（按天） 2单次包（按次）',
  `price`          DECIMAL(10,2) NOT NULL COMMENT '现价（元）',
  `origin_price`   DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '划线价',
  `duration_days`  INT NOT NULL DEFAULT 0 COMMENT '会员有效期天数；单次包为 0',
  `quota_gain`     INT NOT NULL DEFAULT 0 COMMENT '赠送云增强次数',
  `model_tier`     VARCHAR(32) NOT NULL DEFAULT 'STANDARD' COMMENT '可用模型档位',
  `export_max_edge` INT NOT NULL DEFAULT 2400 COMMENT '导出分辨率上限（长边像素）',
  `benefits_json`  JSON NULL COMMENT '权益项（模板化复用）',
  `tag`            VARCHAR(16) NOT NULL DEFAULT '' COMMENT '标签：推荐 / 最划算 / 尝鲜',
  `recommend`      TINYINT NOT NULL DEFAULT 0,
  `status`         TINYINT NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `version`        INT NOT NULL DEFAULT 1 COMMENT '配置版本，客户端按下发版本缓存',
  `effective_at`   DATETIME NULL COMMENT '生效时间',
  `updated_by`     VARCHAR(64) NOT NULL DEFAULT 'system',
  `created_at`     DATETIME NOT NULL,
  `updated_at`     DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_code` (`plan_code`),
  KEY `idx_plan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会员与增值规格（价格与权益全部由后台配置下发，客户端不得内置）';

DROP TABLE IF EXISTS `app_user_member`;
CREATE TABLE `app_user_member` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `plan_code`      VARCHAR(32) NOT NULL,
  `plan_snapshot`  JSON NOT NULL COMMENT '下单时的规格快照，后续调价不影响历史订单',
  `status`         TINYINT NOT NULL DEFAULT 1 COMMENT '1生效 0已过期 2已回收（退款）',
  `effective_at`   DATETIME NOT NULL,
  `expire_at`      DATETIME NULL COMMENT '单次包为空',
  `order_no`       VARCHAR(40) NOT NULL COMMENT '会员状态变化可追溯到订单号',
  `created_at`     DATETIME NOT NULL,
  `updated_at`     DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_member_user_status` (`user_id`, `status`),
  KEY `idx_member_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户会员状态与到期';

DROP TABLE IF EXISTS `app_order`;
CREATE TABLE `app_order` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`         VARCHAR(40) NOT NULL COMMENT '订单号（对外业务号）',
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `plan_code`        VARCHAR(32) NOT NULL,
  `plan_snapshot`    JSON NOT NULL COMMENT '规格快照（名称/价格/权益/赠送额度）',
  `amount`           DECIMAL(10,2) NOT NULL COMMENT '应付金额',
  `discount_amount`  DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status`           TINYINT NOT NULL DEFAULT 0 COMMENT '0待支付 1支付中 2已支付 3已关闭 4退款中 5已退款',
  `channel`          VARCHAR(16) NOT NULL DEFAULT 'WECHAT' COMMENT '支付渠道',
  `channel_trade_no` VARCHAR(64) NULL COMMENT '渠道流水号',
  `prepay_id`        VARCHAR(64) NULL COMMENT '预支付参数',
  `idempotent_key`   VARCHAR(64) NULL COMMENT '下单幂等键（同一规格重复点击不产生重复订单）',
  `paid_at`          DATETIME NULL,
  `closed_at`        DATETIME NULL,
  `expire_at`        DATETIME NULL COMMENT '超时未支付自动关单时间',
  `refund_status`    TINYINT NOT NULL DEFAULT 0 COMMENT '0无退款 1申请中 2已退款 3已驳回',
  `quota_gain`       INT NOT NULL DEFAULT 0,
  `created_at`       DATETIME NOT NULL,
  `updated_at`       DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  UNIQUE KEY `uk_order_idem` (`idempotent_key`),
  KEY `idx_order_user_time` (`user_id`, `created_at`),
  KEY `idx_order_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='支付订单（状态机：待支付/支付中/已支付/已关闭/退款中/已退款）';

DROP TABLE IF EXISTS `app_refund`;
CREATE TABLE `app_refund` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `refund_no`        VARCHAR(40) NOT NULL,
  `order_no`         VARCHAR(40) NOT NULL,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `amount`           DECIMAL(10,2) NOT NULL,
  `reason_code`      VARCHAR(32) NOT NULL COMMENT '重复购买 / 误操作 / 功能不符 / 其他',
  `reason_text`      VARCHAR(300) NOT NULL DEFAULT '',
  `status`           TINYINT NOT NULL DEFAULT 1 COMMENT '1申请中 2已同意 3已驳回 4已到账',
  `reject_reason`    VARCHAR(300) NULL,
  `quota_recycled`   INT NOT NULL DEFAULT 0 COMMENT '回收的未消费权益次数',
  `channel_refund_no` VARCHAR(64) NULL,
  `audit_admin_id`   BIGINT UNSIGNED NULL,
  `audit_at`         DATETIME NULL,
  `created_at`       DATETIME NOT NULL,
  `updated_at`       DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  KEY `idx_refund_order` (`order_no`),
  KEY `idx_refund_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='退款与售后（审批人、时间、业务号全程留痕）';

-- =====================================================================
-- 五、资源下发域（F-SRV-02 模板素材与端侧模型包下发）
-- =====================================================================

DROP TABLE IF EXISTS `app_studio_template`;
CREATE TABLE `app_studio_template` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_code`  VARCHAR(32) NOT NULL,
  `template_name`  VARCHAR(64) NOT NULL,
  `category`       VARCHAR(32) NOT NULL COMMENT '纯色 / 渐变 / 实景影棚 / 自然窗光 / 节日主题',
  `scene_desc`     VARCHAR(120) NOT NULL DEFAULT '',
  `tags`           VARCHAR(120) NOT NULL DEFAULT '' COMMENT '逗号分隔标签，用于客户端筛选',
  `bundle_version` VARCHAR(16) NOT NULL DEFAULT 'V1' COMMENT '素材包版本（版本化下发 / 回滚）',
  `bundle_size_mb` DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '体积，供客户端做空间提示',
  `preview_key`    VARCHAR(200) NOT NULL DEFAULT '' COMMENT '预览图对象键（素材不含任何用户数据）',
  `sort_no`        INT NOT NULL DEFAULT 0,
  `status`         TINYINT NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `updated_by`     VARCHAR(64) NOT NULL DEFAULT 'system',
  `created_at`     DATETIME NOT NULL,
  `updated_at`     DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_studio_template_code` (`template_code`),
  KEY `idx_studio_status_sort` (`status`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='影棚背景模板（只作风格参考，不声明所需模型）';

DROP TABLE IF EXISTS `app_model_package`;
CREATE TABLE `app_model_package` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `package_code`   VARCHAR(48) NOT NULL COMMENT '包码：FACE_DETECT / HUMAN_SEG / MATTING_LITE / MATTING_PRO / DEPTH / FILTER_LUT',
  `package_name`   VARCHAR(64) NOT NULL,
  `capability`     VARCHAR(32) NOT NULL COMMENT '能力标识（与编排原语白名单对应）',
  `version`        VARCHAR(16) NOT NULL,
  `size_mb`        DECIMAL(8,2) NOT NULL DEFAULT 0,
  `download_url`   VARCHAR(300) NOT NULL DEFAULT '',
  `checksum`       CHAR(64) NOT NULL DEFAULT '' COMMENT '文件校验值',
  `bundle_in_app`  TINYINT NOT NULL DEFAULT 0 COMMENT '1=随包内置（小体积必备项）',
  `gray_percent`   INT NOT NULL DEFAULT 100 COMMENT '灰度百分比',
  `status`         TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用（能力置灰）',
  `created_at`     DATETIME NOT NULL,
  `updated_at`     DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_pkg_code_ver` (`package_code`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='端侧模型包（版本化下发，与图片上行计数分离）';

DROP TABLE IF EXISTS `app_id_spec`;
CREATE TABLE `app_id_spec` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `spec_code`   VARCHAR(24) NOT NULL COMMENT 'SP-1 / SP-2 …',
  `spec_name`   VARCHAR(32) NOT NULL,
  `size_mm`     VARCHAR(24) NOT NULL DEFAULT '',
  `size_px`     VARCHAR(24) NOT NULL DEFAULT '',
  `head_ratio`  DECIMAL(4,2) NOT NULL DEFAULT 0.60 COMMENT '头部占比，用于自动裁切与合规校验',
  `usage_tags`  VARCHAR(120) NOT NULL DEFAULT '' COMMENT '用途标签：简历/报名表/护照…（用于智能推荐）',
  `formal`      TINYINT NOT NULL DEFAULT 0 COMMENT '1=正式规格（锁定标准三色，禁止自定义取色）',
  `sort_no`     INT NOT NULL DEFAULT 0,
  `status`      TINYINT NOT NULL DEFAULT 1,
  `version`     INT NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL,
  `updated_at`  DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_id_spec_code` (`spec_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='证件照规格库（后台维护下发，仅占键值存储极小空间）';

-- =====================================================================
-- 六、统计域（F-ADM-04 运营看板）
--     只汇总计数与金额，不含任何图片、人脸或作品信息
-- =====================================================================

DROP TABLE IF EXISTS `app_daily_stat`;
CREATE TABLE `app_daily_stat` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stat_date`         DATE NOT NULL,
  `new_user_count`    INT NOT NULL DEFAULT 0 COMMENT '新增用户',
  `cloud_task_count`  INT NOT NULL DEFAULT 0 COMMENT '云增强任务数',
  `cloud_success_cnt` INT NOT NULL DEFAULT 0,
  `cloud_fail_cnt`    INT NOT NULL DEFAULT 0,
  `up_count`          INT NOT NULL DEFAULT 0 COMMENT '上行图片计数（与隐私看板同口径）',
  `deletion_count`    INT NOT NULL DEFAULT 0 COMMENT '删除审计条数',
  `order_amount`      DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '交易额',
  `refund_amount`     DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '退款额',
  `updated_at`        DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='每日汇总指标（看板口径，不含明细）';

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 附：与旧版（UniApp + 云端生成时代）schema 的差异说明
--   已删除：file_asset / artwork / ai_task / ai_task_attempt / edit_project /
--           edit_layer / export_record / moderation_record / stat_daily
--   删除原因：V3.4 明确「照片不出本机、不建长期作品库、服务端不存工程与成品」，
--           上述表会与红线冲突；端侧能力不再产生服务端任务。
--   新增：app_sms_code / app_user_consent / app_user_privacy / app_cloud_task /
--         app_deletion_audit / app_quota_account / app_quota_flow / app_member_plan /
--         app_user_member / app_order / app_refund / app_model_package / app_id_spec /
--         sys_admin_login_log / sys_config / app_daily_stat
-- =====================================================================
