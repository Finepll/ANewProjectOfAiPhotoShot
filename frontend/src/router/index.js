import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import AdminLayout from '../layouts/AdminLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '管理员登录', public: true }
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '运营看板', group: '概览', feature: 'F-ADM-04', icon: 'Odometer' }
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('../views/Templates.vue'),
        meta: { title: '模板与素材', group: '内容', feature: 'F-ADM-01', icon: 'PictureRounded' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户与额度', group: '用户运营', feature: 'F-ADM-02', icon: 'User' }
      },
      {
        path: 'member/plans',
        name: 'MemberPlans',
        component: () => import('../views/MemberPlans.vue'),
        meta: { title: '会员规格', group: '会员与支付', feature: 'F-ADM-05', icon: 'Present' }
      },
      {
        path: 'member/orders',
        name: 'MemberOrders',
        component: () => import('../views/MemberOrders.vue'),
        meta: { title: '订单与账单', group: '会员与支付', feature: 'F-ADM-06', icon: 'Tickets' }
      },
      {
        path: 'member/refunds',
        name: 'MemberRefunds',
        component: () => import('../views/MemberRefunds.vue'),
        meta: { title: '退款与售后', group: '会员与支付', feature: 'F-ADM-07', icon: 'RefreshLeft' }
      },
      {
        path: 'cloud-tasks',
        name: 'CloudTasks',
        component: () => import('../views/CloudTasks.vue'),
        meta: { title: '云增强任务', group: '云增强', feature: 'F-CLD-01/02', icon: 'Cloudy' }
      },
      {
        path: 'service/ledger',
        name: 'ServiceLedger',
        component: () => import('../views/ServiceLedger.vue'),
        meta: { title: '支付权益流水', group: '服务端只读', feature: 'F-SRV-04/05', icon: 'Coin' }
      },
      {
        path: 'system/admins',
        name: 'Admins',
        component: () => import('../views/Admins.vue'),
        meta: { title: '管理员与权限', group: '系统管理', feature: 'F-ADM-03', icon: 'Avatar', roles: ['super'] }
      },
      {
        path: 'system/audit',
        name: 'AuditLog',
        component: () => import('../views/AuditLog.vue'),
        meta: { title: '操作审计', group: '系统管理', feature: 'F-ADM-03', icon: 'Document', roles: ['super'] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  /* 只有 token、没有管理员信息时按未登录处理，并顺手把这个孤立 token 清掉：
     留着它会让 isLogin 之外的判断（比如各处读 auth.token）以为会话还在，
     而 roleKey 实际取不到，带 meta.roles 的页面会以「未知角色」拒绝访问。 */
  if (auth.token && !auth.admin) auth.logout()
  if (to.meta.public) {
    if (auth.isLogin && to.path === '/login') return { path: '/dashboard' }
    return true
  }
  if (!auth.isLogin) {
    return { path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  /* 角色约束和侧边栏菜单用的是同一份 meta.roles：
     只在菜单里藏起来是不够的，直接改地址栏照样能进。 */
  if (to.meta.roles && !to.meta.roles.includes(auth.admin?.roleKey)) {
    ElMessage.warning(`当前角色（${auth.admin?.role || '未知'}）无权访问「${to.meta.title}」`)
    return { path: '/dashboard' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · AI 照相馆管理后台` : 'AI 照相馆管理后台'
})

export default router
