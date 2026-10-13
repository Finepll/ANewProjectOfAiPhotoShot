import { request } from "./request"

// 上报日志到后端
async function reportLog(type, msg, extra = {}) {
  try {
    await request({
      url: "/log/save",
      method: "POST",
      data: {
        type,
        message: msg,
        time: new Date().toLocaleString(),
        platform: "miniProgram", // 标记来源：小程序，区分web前端
        ...extra
      }
    })
  } catch (e) {
    console.error("小程序日志上报失败", e)
  }
}

// 普通信息日志
export function logInfo(msg, extra) {
  console.log("[MINI-INFO]", msg)
  reportLog("info", msg, extra)
}
// 错误日志
export function logError(msg, extra) {
  console.error("[MINI-ERROR]", msg)
  reportLog("error", msg, extra)
}
