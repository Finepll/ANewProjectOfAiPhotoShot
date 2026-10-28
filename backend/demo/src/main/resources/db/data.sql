-- =====================================================================
-- AI 照相馆 · 初始化数据（V3.4）
-- 说明：
--   1. 后台管理员账号不存在于本脚本：出于安全，BCrypt 哈希由后端启动引导
--      （AdminBootstrap）按配置创建，默认账号见 application.yml 的 app.admin.bootstrap。
--      账号由超管分配，系统不提供自助注册接口。
--   2. 本脚本可重复执行：全部使用 INSERT ... ON DUPLICATE KEY UPDATE。
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. 运行配置（F-SRV-03 / F-ID 频次口径 / F-SRV-02 包体约束）
-- ---------------------------------------------------------------------
INSERT INTO `sys_config` (`config_key`, `config_value`, `value_type`, `remark`, `updated_by`, `updated_at`) VALUES
  ('daily.id.photo.freq.limit',   '5',     'INT',    '证件照线每日频次上限（含多份交付生成的证件照）', 'system', NOW()),
  ('daily.id.photo.freq.version', '1',     'INT',    '频次口径版本号，客户端按下发版本缓存',           'system', NOW()),
  ('export.max.edge.px',          '4096',  'INT',    '导出分辨率上限（长边像素），不予许无限高清',     'system', NOW()),
  ('cloud.task.concurrency',      '1',     'INT',    '同一账号同时允许的云增强任务数（禁止批量上行）', 'system', NOW()),
  ('cloud.quota.cost.per.task',   '1',     'INT',    '每次云增强消耗额度次数',                         'system', NOW()),
  ('model.cache.limit.mb',        '120',   'INT',    '端侧模型与素材沙盒缓存上限（超限按需重建）',     'system', NOW()),
  ('miniprogram.package.limit.mb','20',    'INT',    '微信小程序整包上限（主包 2MB）',                 'system', NOW()),
  ('privacy.up.count.visible',    '1',     'BOOL',   '隐私看板是否展示上行计数（本机统计为准）',       'system', NOW()),
  ('sms.code.expire.seconds',     '300',   'INT',    '短信验证码有效期（5 分钟）',                     'system', NOW()),
  ('sms.code.resend.seconds',     '60',    'INT',    '同号码重复下发间隔（60 秒）',                    'system', NOW()),
  ('admin.login.fail.limit',      '5',     'INT',    '管理员连续登录失败上限',                         'system', NOW()),
  ('admin.login.lock.minutes',    '30',    'INT',    '管理员锁定时长（分钟）',                         'system', NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `remark` = VALUES(`remark`), `updated_at` = NOW();

-- ---------------------------------------------------------------------
-- 2. 角色与权限点（F-ADM-03 RBAC：菜单级 + 按钮级）
-- ---------------------------------------------------------------------
INSERT INTO `sys_role` (`role_code`, `role_name`, `description`, `status`, `created_at`) VALUES
  ('SUPER_ADMIN', '超级管理员', '全部权限，含管理员账号分配、额度调整与对账导出', 1, NOW()),
  ('OPS',         '运营专员',   '模板、用户查看与云任务处置，不含管理员管理与对账导出', 1, NOW()),
  ('AUDITOR',     '审计员',     '只读：操作审计、删除审计、生效中的订单查看', 1, NOW())
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`), `description` = VALUES(`description`);

INSERT INTO `sys_permission` (`perm_code`, `perm_name`, `module`, `perm_type`, `created_at`) VALUES
  ('dashboard:view',      '运营看板',      'DASHBOARD', 1, NOW()),
  ('template:view',       '模板查看',      'TEMPLATE',  1, NOW()),
  ('template:edit',       '模板编辑上下架','TEMPLATE',  2, NOW()),
  ('user:view',           '用户查看',      'USER',      1, NOW()),
  ('user:ban',            '封禁/解封',     'USER',      2, NOW()),
  ('quota:adjust',        '额度调整',      'QUOTA',     2, NOW()),
  ('member:plan:view',    '会员规格查看',  'MEMBER',    1, NOW()),
  ('member:plan:edit',    '会员规格配置',  'MEMBER',    2, NOW()),
  ('member:order:view',   '订单账单查看',  'ORDER',     1, NOW()),
  ('member:order:export', '订单对账导出',  'ORDER',     2, NOW()),
  ('member:refund:view',  '退款单查看',    'REFUND',    1, NOW()),
  ('member:refund:audit', '退款审批',      'REFUND',    2, NOW()),
  ('cloud:view',          '云任务查看',    'CLOUD',     1, NOW()),
  ('cloud:retry',         '云任务重试',    'CLOUD',     2, NOW()),
  ('cloud:delete',        '云任务删除',    'CLOUD',     2, NOW()),
  ('ledger:view',         '权益流水查看',  'LEDGER',    1, NOW()),
  ('admin:view',          '管理员查看',    'ADMIN',     1, NOW()),
  ('admin:manage',        '管理员分配与停用', 'ADMIN',  2, NOW()),
  ('audit:view',          '操作审计查看',  'AUDIT',     1, NOW())
ON DUPLICATE KEY UPDATE `perm_name` = VALUES(`perm_name`), `module` = VALUES(`module`), `perm_type` = VALUES(`perm_type`);

-- 超级管理员：全部权限
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW() FROM `sys_role` r CROSS JOIN `sys_permission` p
WHERE r.`role_code` = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`);

-- 运营专员：内容 / 用户查看 / 云任务 / 会员与订单查看
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW() FROM `sys_role` r JOIN `sys_permission` p
  ON p.`perm_code` IN ('dashboard:view','template:view','template:edit','user:view','member:plan:view',
                       'member:order:view','member:refund:view','cloud:view','cloud:retry','ledger:view','admin:view')
WHERE r.`role_code` = 'OPS'
ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`);

-- 审计员：只读审计与删除留痕
INSERT INTO `sys_role_permission` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW() FROM `sys_role` r JOIN `sys_permission` p
  ON p.`perm_code` IN ('dashboard:view','audit:view','cloud:view','member:order:view','member:refund:view','ledger:view')
WHERE r.`role_code` = 'AUDITOR'
ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`);

-- ---------------------------------------------------------------------
-- 3. 会员与增值规格（F-PAY-01 / F-ADM-05：价格与权益由后台配置下发）
-- ---------------------------------------------------------------------
INSERT INTO `app_member_plan`
  (`plan_code`,`plan_name`,`plan_type`,`price`,`origin_price`,`duration_days`,`quota_gain`,`model_tier`,
   `export_max_edge`,`benefits_json`,`tag`,`recommend`,`status`,`version`,`effective_at`,`updated_by`,`created_at`,`updated_at`)
VALUES
  ('PL-M','月卡',1,19.00,29.00,30,20,'STANDARD',2400,
   JSON_ARRAY('每日 5 张免费额度','高清无水印导出','端侧模型包全量下发'),'尝鲜',0,1,1,NOW(),'system',NOW(),NOW()),
  ('PL-Q','季卡',1,49.00,87.00,90,60,'STANDARD',3200,
   JSON_ARRAY('每日 5 张免费额度','高清无水印导出','影棚模板全解锁','云增强 20 次/月'),'推荐',1,1,1,NOW(),'system',NOW(),NOW()),
  ('PL-Y','年卡',1,149.00,348.00,365,240,'HIGH',4096,
   JSON_ARRAY('每日 5 张免费额度','高清无水印导出','影棚模板全解锁','云增强 20 次/月','新主题包优先体验'),'最划算',0,1,1,NOW(),'system',NOW(),NOW()),
  ('PL-P10','单次包 · 10 张',2,9.90,19.90,0,10,'STANDARD',2400,
   JSON_ARRAY('10 张云增强额度','高清无水印导出'),'按次',0,1,1,NOW(),'system',NOW(),NOW())
ON DUPLICATE KEY UPDATE `plan_name` = VALUES(`plan_name`), `price` = VALUES(`price`),
  `origin_price` = VALUES(`origin_price`), `quota_gain` = VALUES(`quota_gain`),
  `benefits_json` = VALUES(`benefits_json`), `updated_at` = NOW();

-- ---------------------------------------------------------------------
-- 4. 证件照规格库（F-ID-01，formal=1 的正式规格锁定标准三色）
-- ---------------------------------------------------------------------
INSERT INTO `app_id_spec`
  (`spec_code`,`spec_name`,`size_mm`,`size_px`,`head_ratio`,`usage_tags`,`formal`,`sort_no`,`status`,`version`,`created_at`,`updated_at`)
VALUES
  ('SP-1','一寸','25 × 35 mm','295 × 413',0.63,'简历,报名表',0,1,1,1,NOW(),NOW()),
  ('SP-2','二寸','35 × 49 mm','413 × 579',0.60,'资格证,档案',0,2,1,1,NOW(),NOW()),
  ('SP-3','小一寸','22 × 32 mm','260 × 378',0.65,'驾驶证',0,3,1,1,NOW(),NOW()),
  ('SP-4','大一寸','33 × 48 mm','390 × 567',0.60,'护照,签证',1,4,1,1,NOW(),NOW()),
  ('SP-5','小二寸','35 × 45 mm','413 × 531',0.61,'社保,医保',0,5,1,1,NOW(),NOW()),
  ('SP-6','简历照（横版）','自定义','600 × 600',0.55,'社交头像,简历头像',0,6,1,1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `spec_name` = VALUES(`spec_name`), `size_px` = VALUES(`size_px`),
  `head_ratio` = VALUES(`head_ratio`), `usage_tags` = VALUES(`usage_tags`), `formal` = VALUES(`formal`),
  `updated_at` = NOW();

-- ---------------------------------------------------------------------
-- 5. 影棚背景模板（F-STU-01：只作风格参考，不声明所需模型）
-- ---------------------------------------------------------------------
INSERT INTO `app_studio_template`
  (`template_code`,`template_name`,`category`,`scene_desc`,`tags`,`bundle_version`,`bundle_size_mb`,
   `preview_key`,`sort_no`,`status`,`updated_by`,`created_at`,`updated_at`)
VALUES
  ('ST-01','暖光影棚','渐变','米色幕布 · 柔光','人像,通用','V1',12.40,'studio/st-01.png',1,1,'system',NOW(),NOW()),
  ('ST-02','雾蓝影棚','渐变','灰蓝幕布 · 冷调','证件,商务','V1',11.90,'studio/st-02.png',2,1,'system',NOW(),NOW()),
  ('ST-03','落地窗自然光','自然窗光','侧逆光 · 通透','写真,氛围','V1',14.20,'studio/st-03.png',3,1,'system',NOW(),NOW()),
  ('ST-04','米白无影墙','纯色','纯色背景 · 干净','简历,通用','V1',8.60,'studio/st-04.png',4,1,'system',NOW(),NOW()),
  ('ST-05','墨色影棚','实景影棚','深褐幕布 · 高对比','质感,高级','V1',13.10,'studio/st-05.png',5,1,'system',NOW(),NOW()),
  ('ST-06','驼色影棚','渐变','暖驼幕布 · 复古','复古,写真','V1',12.00,'studio/st-06.png',6,1,'system',NOW(),NOW()),
  ('ST-07','校园草坪','实景影棚','毕业季 · 室外感','毕业,青春','V1',15.40,'studio/st-07.png',7,1,'system',NOW(),NOW()),
  ('ST-08','花房写真','节日主题','清新 · 浅色花影','写真,清新','V1',16.20,'studio/st-08.png',8,1,'system',NOW(),NOW())
ON DUPLICATE KEY UPDATE `template_name` = VALUES(`template_name`), `category` = VALUES(`category`),
  `scene_desc` = VALUES(`scene_desc`), `tags` = VALUES(`tags`), `bundle_size_mb` = VALUES(`bundle_size_mb`),
  `updated_at` = NOW();

-- ---------------------------------------------------------------------
-- 6. 端侧模型包（F-SRV-02：包内只留小体积必备项，其余按需下载）
-- ---------------------------------------------------------------------
INSERT INTO `app_model_package`
  (`package_code`,`package_name`,`capability`,`version`,`size_mb`,`download_url`,`checksum`,`bundle_in_app`,`gray_percent`,`status`,`created_at`,`updated_at`)
VALUES
  ('FACE_DETECT','人脸检测','FACE_DETECT','1.2.0',1.80,'https://cdn.example.com/models/face-detect-1.2.0.bin','',1,100,1,NOW(),NOW()),
  ('FILTER_LUT','滤镜 LUT 包','FILTER','1.0.3',0.60,'https://cdn.example.com/models/filter-lut-1.0.3.bin','',1,100,1,NOW(),NOW()),
  ('HUMAN_SEG','人像分割','MATTING','2.1.0',6.40,'https://cdn.example.com/models/human-seg-2.1.0.bin','',0,100,1,NOW(),NOW()),
  ('MATTING_LITE','轻量抠图','MATTING','1.4.2',4.20,'https://cdn.example.com/models/matting-lite-1.4.2.bin','',0,100,1,NOW(),NOW()),
  ('MATTING_PRO','高质量抠图','MATTING','3.0.1',18.60,'https://cdn.example.com/models/matting-pro-3.0.1.bin','',0,50,1,NOW(),NOW()),
  ('DEPTH','深度估计','DEPTH','1.1.0',9.30,'https://cdn.example.com/models/depth-1.1.0.bin','',0,100,1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `package_name` = VALUES(`package_name`), `size_mb` = VALUES(`size_mb`),
  `gray_percent` = VALUES(`gray_percent`), `status` = VALUES(`status`), `updated_at` = NOW();
