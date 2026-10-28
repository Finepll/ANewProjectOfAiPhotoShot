-- =====================================================================
-- 本地免装 MySQL 的 H2 建表脚本（仅登录注册相关子集，H2 语法）
-- 用途：profile=h2 时启动即建表，用于跑通「验证码 → 登录/自动注册 → 协议存证 → JWT」
-- 与 MySQL 版 db/schema.sql 的表结构保持一致（类型差异：无 UNSIGNED、JSON→CLOB）
-- =====================================================================

DROP TABLE IF EXISTS sys_admin;
CREATE TABLE sys_admin (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  username             VARCHAR(64)  NOT NULL,
  password_hash        VARCHAR(100) NOT NULL,
  real_name            VARCHAR(64)  NOT NULL DEFAULT '',
  phone_masked         VARCHAR(20)  NOT NULL DEFAULT '',
  email_masked         VARCHAR(96)  NOT NULL DEFAULT '',
  status               TINYINT      NOT NULL DEFAULT 1,
  must_change_password TINYINT      NOT NULL DEFAULT 1,
  fail_count           INT          NOT NULL DEFAULT 0,
  locked_until         DATETIME     NULL,
  last_login_at        DATETIME     NULL,
  last_login_ip        VARCHAR(64)  NULL,
  created_by           BIGINT       NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL,
  updated_at           DATETIME     NOT NULL,
  CONSTRAINT uk_admin_username UNIQUE (username)
);

DROP TABLE IF EXISTS sys_role;
CREATE TABLE sys_role (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_code   VARCHAR(32) NOT NULL,
  role_name   VARCHAR(64) NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  status      TINYINT NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL,
  CONSTRAINT uk_role_code UNIQUE (role_code)
);

DROP TABLE IF EXISTS sys_permission;
CREATE TABLE sys_permission (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  perm_code  VARCHAR(64) NOT NULL,
  perm_name  VARCHAR(64) NOT NULL,
  module     VARCHAR(32) NOT NULL,
  perm_type  TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  CONSTRAINT uk_perm_code UNIQUE (perm_code)
);

DROP TABLE IF EXISTS sys_admin_role;
CREATE TABLE sys_admin_role (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id   BIGINT NOT NULL,
  role_id    BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT uk_admin_role UNIQUE (admin_id, role_id)
);

DROP TABLE IF EXISTS sys_role_permission;
CREATE TABLE sys_role_permission (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at    DATETIME NOT NULL,
  CONSTRAINT uk_role_perm UNIQUE (role_id, permission_id)
);

DROP TABLE IF EXISTS sys_admin_login_log;
CREATE TABLE sys_admin_login_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id    BIGINT NOT NULL DEFAULT 0,
  username    VARCHAR(64) NOT NULL,
  result      TINYINT NOT NULL,
  fail_reason VARCHAR(200) NOT NULL DEFAULT '',
  client_ip   VARCHAR(64) NULL,
  user_agent  VARCHAR(300) NULL,
  created_at  DATETIME NOT NULL
);

DROP TABLE IF EXISTS sys_operation_log;
CREATE TABLE sys_operation_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id    BIGINT NOT NULL,
  username    VARCHAR(64) NOT NULL,
  module      VARCHAR(32) NOT NULL,
  action      VARCHAR(64) NOT NULL,
  biz_no      VARCHAR(64) NULL,
  before_json CLOB NULL,
  after_json  CLOB NULL,
  client_ip   VARCHAR(64) NULL,
  created_at  DATETIME NOT NULL
);

DROP TABLE IF EXISTS sys_config;
CREATE TABLE sys_config (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_key   VARCHAR(64) NOT NULL,
  config_value VARCHAR(300) NOT NULL,
  value_type   VARCHAR(16) NOT NULL DEFAULT 'STRING',
  remark       VARCHAR(200) NOT NULL DEFAULT '',
  updated_by   VARCHAR(64) NOT NULL DEFAULT 'system',
  updated_at   DATETIME NOT NULL,
  CONSTRAINT uk_config_key UNIQUE (config_key)
);

DROP TABLE IF EXISTS app_user;
CREATE TABLE app_user (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone_hash      CHAR(64)    NULL,
  phone_masked    VARCHAR(20) NULL,
  email_hash      CHAR(64)    NULL,
  email_masked    VARCHAR(100) NULL,
  nickname        VARCHAR(64) NOT NULL DEFAULT '',
  status          TINYINT     NOT NULL DEFAULT 1,
  ban_reason      VARCHAR(200) NULL,
  banned_at       DATETIME    NULL,
  banned_by       BIGINT      NULL,
  register_source VARCHAR(32) NOT NULL DEFAULT 'MINIPROGRAM',
  register_ip     VARCHAR(64) NULL,
  register_at     DATETIME    NOT NULL,
  last_login_at   DATETIME    NULL,
  login_count     INT         NOT NULL DEFAULT 0,
  created_at      DATETIME    NOT NULL,
  updated_at      DATETIME    NOT NULL,
  CONSTRAINT uk_user_phone_hash UNIQUE (phone_hash),
  CONSTRAINT uk_user_email_hash UNIQUE (email_hash)
);

DROP TABLE IF EXISTS app_sms_code;
CREATE TABLE app_sms_code (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone_hash CHAR(64)   NOT NULL,
  scene      VARCHAR(32) NOT NULL DEFAULT 'LOGIN',
  code_hash  CHAR(64)   NOT NULL,
  expire_at  DATETIME   NOT NULL,
  used       TINYINT    NOT NULL DEFAULT 0,
  used_at    DATETIME   NULL,
  send_ip    VARCHAR(64) NULL,
  created_at DATETIME   NOT NULL
);

DROP TABLE IF EXISTS app_email_code;
CREATE TABLE app_email_code (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  email_hash CHAR(64)   NOT NULL,
  scene      VARCHAR(32) NOT NULL DEFAULT 'LOGIN',
  code_hash  CHAR(64)   NOT NULL,
  expire_at  DATETIME   NOT NULL,
  used       TINYINT    NOT NULL DEFAULT 0,
  used_at    DATETIME   NULL,
  send_ip    VARCHAR(64) NULL,
  created_at DATETIME   NOT NULL
);

DROP TABLE IF EXISTS app_user_consent;
CREATE TABLE app_user_consent (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT NOT NULL,
  agreement_code    VARCHAR(32)  NOT NULL,
  agreement_version VARCHAR(16)  NOT NULL,
  status            TINYINT      NOT NULL DEFAULT 1,
  signed_at         DATETIME     NOT NULL,
  device_id         VARCHAR(64)  NULL,
  sign_hash         CHAR(64)     NOT NULL,
  client_ip         VARCHAR(64)  NULL,
  revoked_at        DATETIME     NULL,
  revoke_reason     VARCHAR(200) NULL,
  created_at        DATETIME     NOT NULL,
  updated_at        DATETIME     NOT NULL,
  CONSTRAINT uk_consent_user_code_ver UNIQUE (user_id, agreement_code, agreement_version)
);

DROP TABLE IF EXISTS app_user_privacy;
CREATE TABLE app_user_privacy (
  user_id            BIGINT PRIMARY KEY,
  local_mode         TINYINT  NOT NULL DEFAULT 1,
  cloud_allowed      TINYINT  NOT NULL DEFAULT 0,
  face_feature_saved TINYINT  NOT NULL DEFAULT 0,
  auto_clean_days    INT      NOT NULL DEFAULT 7,
  up_count           INT      NOT NULL DEFAULT 0,
  updated_at         DATETIME NOT NULL
);

DROP TABLE IF EXISTS app_quota_account;
CREATE TABLE app_quota_account (
  user_id       BIGINT PRIMARY KEY,
  balance       INT NOT NULL DEFAULT 0,
  total_granted INT NOT NULL DEFAULT 0,
  total_used    INT NOT NULL DEFAULT 0,
  version       INT NOT NULL DEFAULT 0,
  updated_at    DATETIME NOT NULL
);

DROP TABLE IF EXISTS app_quota_flow;
CREATE TABLE app_quota_flow (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  biz_no        VARCHAR(40) NOT NULL,
  user_id       BIGINT NOT NULL,
  change_type   TINYINT NOT NULL,
  delta         INT NOT NULL,
  balance_after INT NOT NULL,
  task_no       VARCHAR(40) NULL,
  order_no      VARCHAR(40) NULL,
  operator      VARCHAR(64) NOT NULL DEFAULT 'system',
  remark        VARCHAR(200) NOT NULL DEFAULT '',
  created_at    DATETIME NOT NULL,
  CONSTRAINT uk_quota_flow_biz UNIQUE (biz_no)
);

DROP TABLE IF EXISTS app_daily_stat;
CREATE TABLE app_daily_stat (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  stat_date         DATE NOT NULL,
  new_user_count    INT NOT NULL DEFAULT 0,
  cloud_task_count  INT NOT NULL DEFAULT 0,
  cloud_success_cnt INT NOT NULL DEFAULT 0,
  cloud_fail_cnt    INT NOT NULL DEFAULT 0,
  up_count          INT NOT NULL DEFAULT 0,
  deletion_count    INT NOT NULL DEFAULT 0,
  order_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  refund_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at        DATETIME NOT NULL,
  CONSTRAINT uk_stat_date UNIQUE (stat_date)
);
