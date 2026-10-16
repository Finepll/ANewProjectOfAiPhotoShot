import { defineStore } from 'pinia'

const TOKEN_KEY = 'ap_admin_token'
const INFO_KEY = 'ap_admin_info'

/**
 * 演示用账号：管理人员由开发人员分配，系统不提供自助注册。
 * 真实环境应替换为 POST /api/admin/login（JWT）。
 */
const MOCK_ACCOUNTS = [
  {
    account: 'admin',
    password: 'admin123',
    info: {
      account: 'admin',
      name: '林小满',
      role: '超级管理员',
      roleKey: 'super',
      dept: '运营中心',
      avatarText: '林'
    }
  },
  {
    account: 'ops',
    password: 'ops123',
    info: {
      account: 'ops',
      name: '陈屿',
      role: '运营专员',
      roleKey: 'ops',
      dept: '内容运营组',
      avatarText: '陈'
    }
  }
]

function readInfo() {
  try {
    return JSON.parse(localStorage.getItem(INFO_KEY) || 'null')
  } catch (e) {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    admin: readInfo(),
    accounts: MOCK_ACCOUNTS
  }),
  getters: {
    /* 会话完整才算已登录。token 和 admin 信息是 localStorage 里两个独立的 key，
       可能只剩一个（清缓存、手工删掉、写入被截断）。
       原先只看 token：admin 为 null → roleKey 取不到 → 超管被当成「无角色」，
       系统管理整组菜单消失，手输地址也被弹回看板并提示「当前角色（未知）无权访问」，
       而且没有自愈路径，只能手动退出重登。 */
    isLogin: (state) => !!state.token && !!state.admin,
    isSuper: (state) => state.admin?.roleKey === 'super',
    displayName: (state) => state.admin?.name || '未登录'
  },
  actions: {
    async login(payload) {
      // 模拟网络往返，接后端时改成 request({ url:'/admin/login', method:'post', data: payload })
      await new Promise((resolve) => setTimeout(resolve, 620))
      const hit = MOCK_ACCOUNTS.find(
        (item) => item.account === String(payload.account || '').trim() && item.password === payload.password
      )
      if (!hit) {
        throw new Error('账号或密码不正确，请联系开发人员核对管理员账号')
      }
      this.token = `demo-token-${Date.now()}`
      this.admin = { ...hit.info, loginAt: new Date().toLocaleString('zh-CN') }
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(INFO_KEY, JSON.stringify(this.admin))
      return this.admin
    },
    logout() {
      this.token = ''
      this.admin = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(INFO_KEY)
    }
  }
})
