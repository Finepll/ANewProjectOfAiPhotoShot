const baseUrl = "http://127.0.0.1:8081/api"
// 开发环境：小程序要在开发者工具勾选【不校验合法域名】
export function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + options.url,
      method: options.method || "GET",
      data: options.data || {},
      success: res => resolve(res.data),
      fail: err => reject(err)
    })
  })
}
