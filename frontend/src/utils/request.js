import axios from 'axios'

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // vite代理 —— vite.config.js
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(config => {
  return config
})

// 响应拦截器
service.interceptors.response.use(res => {
  return res.data
}, err => {
  console.error("请求失败", err)
  return Promise.reject(err)
})

export default service
