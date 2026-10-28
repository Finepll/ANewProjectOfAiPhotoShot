-- =====================================================================
-- H2 初始化数据（登录注册链路所需最小集，H2 语法）
-- 管理员账号不在此处：由 AdminBootstrap 用 BCrypt 在启动时创建（可配置）
-- =====================================================================

MERGE INTO sys_config (config_key, config_value, value_type, remark, updated_by, updated_at) KEY(config_key) VALUES
  ('daily.id.photo.freq.limit', '5', 'INT', '证件照线每日频次上限', 'system', CURRENT_TIMESTAMP),
  ('sms.code.expire.seconds', '300', 'INT', '验证码有效期 5 分钟', 'system', CURRENT_TIMESTAMP),
  ('sms.code.resend.seconds', '60', 'INT', '同号码 60 秒内不重复下发', 'system', CURRENT_TIMESTAMP),
  ('admin.login.fail.limit', '5', 'INT', '连续登录失败上限', 'system', CURRENT_TIMESTAMP),
  ('admin.login.lock.minutes', '30', 'INT', '锁定时长（分钟）', 'system', CURRENT_TIMESTAMP);

MERGE INTO sys_role (role_code, role_name, description, status, created_at) KEY(role_code) VALUES
  ('SUPER_ADMIN', '超级管理员', '全部权限，含管理员分配与额度调整', 1, CURRENT_TIMESTAMP),
  ('OPS', '运营专员', '模板、用户查看与云任务处置', 1, CURRENT_TIMESTAMP),
  ('AUDITOR', '审计员', '只读审计与删除留痕', 1, CURRENT_TIMESTAMP);

MERGE INTO sys_permission (perm_code, perm_name, module, perm_type, created_at) KEY(perm_code) VALUES
  ('dashboard:view', '运营看板', 'DASHBOARD', 1, CURRENT_TIMESTAMP),
  ('user:view', '用户查看', 'USER', 1, CURRENT_TIMESTAMP),
  ('user:ban', '封禁/解封', 'USER', 2, CURRENT_TIMESTAMP),
  ('quota:adjust', '额度调整', 'QUOTA', 2, CURRENT_TIMESTAMP),
  ('cloud:view', '云任务查看', 'CLOUD', 1, CURRENT_TIMESTAMP),
  ('admin:manage', '管理员分配与停用', 'ADMIN', 2, CURRENT_TIMESTAMP),
  ('audit:view', '操作审计查看', 'AUDIT', 1, CURRENT_TIMESTAMP);

MERGE INTO sys_role_permission (role_id, permission_id, created_at) KEY(role_id, permission_id)
SELECT r.id, p.id, CURRENT_TIMESTAMP FROM sys_role r JOIN sys_permission p ON 1 = 1
WHERE r.role_code = 'SUPER_ADMIN';

MERGE INTO sys_role_permission (role_id, permission_id, created_at) KEY(role_id, permission_id)
SELECT r.id, p.id, CURRENT_TIMESTAMP FROM sys_role r JOIN sys_permission p
  ON p.perm_code IN ('dashboard:view', 'user:view', 'cloud:view')
WHERE r.role_code = 'OPS';

MERGE INTO sys_role_permission (role_id, permission_id, created_at) KEY(role_id, permission_id)
SELECT r.id, p.id, CURRENT_TIMESTAMP FROM sys_role r JOIN sys_permission p
  ON p.perm_code IN ('audit:view', 'cloud:view')
WHERE r.role_code = 'AUDITOR';
