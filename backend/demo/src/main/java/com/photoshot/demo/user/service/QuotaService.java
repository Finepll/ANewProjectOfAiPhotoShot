package com.photoshot.demo.user.service;

import com.photoshot.demo.user.dao.QuotaDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 额度服务（F-SRV-03 / F-SRV-05）。
 * 口径：以业务号（biz_no）为幂等键；任何增减都写流水，后台调整与云增强扣减/回滚共用同一套。
 */
@Service
@RequiredArgsConstructor
public class QuotaService {

    /** 变动类型，与 app_quota_flow.change_type 一致 */
    public static final int TYPE_REGISTER_GIFT = 1;
    public static final int TYPE_CLOUD_DEDUCT = 2;
    public static final int TYPE_CLOUD_ROLLBACK = 3;
    public static final int TYPE_ADMIN_ADJUST = 4;
    public static final int TYPE_ACTIVITY_GIFT = 5;
    public static final int TYPE_REFUND_BACK = 6;
    public static final int TYPE_MEMBER_GRANT = 7;

    private final QuotaDao quotaDao;

    public int balanceOf(long userId) {
        QuotaDao.Account account = quotaDao.findAccount(userId);
        return account == null ? 0 : account.balance();
    }

    public List<QuotaDao.Flow> recentFlows(long userId, int limit) {
        return quotaDao.listFlows(userId, limit);
    }

    /**
     * 额度变动（幂等）：同一业务号重复调用只入账一次。
     *
     * @param delta               正数增加，负数扣减
     * @param changeType          变动类型
     * @param bizNo               业务号（唯一，幂等键）
     * @param insufficientMessage 余额不足时的提示文案
     */
    @Transactional
    public int change(long userId, int delta, int changeType, String bizNo, String taskNo, String orderNo,
                      String operator, String remark, String insufficientMessage) {
        if (bizNo == null || bizNo.isBlank()) {
            throw new IllegalArgumentException("bizNo 不能为空（额度变动必须可对账）");
        }
        if (quotaDao.flowExists(bizNo)) {
            QuotaDao.Account current = quotaDao.findAccount(userId);
            return current == null ? 0 : current.balance();
        }
        LocalDateTime now = LocalDateTime.now();
        QuotaDao.Account account = quotaDao.lockAccount(userId);
        if (account == null) {
            quotaDao.insertAccount(userId, now);
            account = quotaDao.lockAccount(userId);
        }
        int balance = account.balance() + delta;
        if (balance < 0) {
            throw com.photoshot.demo.common.BizException.of(com.photoshot.demo.common.ErrorCodes.QUOTA_NOT_ENOUGH,
                    insufficientMessage == null ? "可用额度不足" : insufficientMessage);
        }
        int granted = account.totalGranted() + Math.max(0, delta);
        int used = account.totalUsed() + Math.max(0, -delta);
        quotaDao.updateAccount(userId, balance, granted, used, account.version() + 1, now);
        quotaDao.insertFlow(bizNo, userId, changeType, delta, balance, taskNo, orderNo,
                operator == null ? "system" : operator, remark == null ? "" : remark, now);
        return balance;
    }

    /** 首次登录自动注册赠送（同一用户只会成功一次：bizNo 幂等） */
    @Transactional
    public void grantRegisterGift(long userId, int quota, int changeType, String bizNo, String remark) {
        if (quota <= 0) {
            return;
        }
        change(userId, quota, changeType, bizNo, null, null, "system", remark, null);
    }
}
