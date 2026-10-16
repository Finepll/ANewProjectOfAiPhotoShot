import request from './request'

// 日志分级
const LogType = {
  INFO: 'info',
  ERROR: 'error'
}

// 演示 Demo 阶段后端未启动，先只打印到控制台；联调时改为 true 即可上报
const REMOTE_ENABLED = false

// 上报日志到后端接口
async function reportLog(type, msg, extra = {}) {
  if (!REMOTE_ENABLED) return
  try {
    await request({
      url: '/log/save',
      method: 'post',
      data: {
        type,
        message: msg,
        time: new Date().toLocaleString(),
        url: window.location.href,
        ...extra
      }
    })
  } catch (e) {
    console.error('日志上报失败', e)
  }
}

// 普通信息日志
export function logInfo(msg, extra) {
  console.log('[INFO]', msg)
  reportLog(LogType.INFO, msg, extra)
}

// 错误日志
export function logError(msg, extra) {
  console.error('[ERROR]', msg)
  reportLog(LogType.ERROR, msg, extra)
}
