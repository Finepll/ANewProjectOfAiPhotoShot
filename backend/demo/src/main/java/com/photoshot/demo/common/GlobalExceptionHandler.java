package com.photoshot.demo.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：业务异常按错误码返回，参数校验异常返回首条提示，其余兜底为系统异常。
 * 【合规】日志只记录错误原因，不打印手机号、验证码、密码与任何图片相关内容。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public ApiResult<Void> handleBiz(BizException e) {
        return ApiResult.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ApiResult<Void> handleValidation(Exception e) {
        FieldError fieldError = null;
        if (e instanceof MethodArgumentNotValidException ex) {
            fieldError = ex.getBindingResult().getFieldError();
        } else if (e instanceof BindException ex) {
            fieldError = ex.getBindingResult().getFieldError();
        }
        String message = fieldError == null ? "请求参数不合法" : fieldError.getDefaultMessage();
        return ApiResult.fail(ErrorCodes.PARAM_INVALID, message);
    }

    @ExceptionHandler(Exception.class)
    public ApiResult<Void> handleOther(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);
        return ApiResult.fail(ErrorCodes.INTERNAL_ERROR, "系统繁忙，请稍后重试");
    }
}
