<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { notifications, demoMeta } from '../mock'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

/** 菜单按功能报告 F-ADM / F-SRV 模块划分 */
const menus = [
  { type: 'item', title: '运营看板', path: '/dashboard', icon: 'Odometer', feature: 'F-ADM-04' },
  { type: 'item', title: '模板与素材', path: '/templates', icon: 'PictureRounded', feature: 'F-ADM-01' },
  { type: 'item', title: '用户与额度', path: '/users', icon: 'User', feature: 'F-ADM-02' },
  {
    type: 'group',
    title: '会员与支付',
    icon: 'Wallet',
    children: [
      { title: '会员规格', path: '/member/plans', icon: 'Present', feature: 'F-ADM-05' },
      { title: '订单与账单', path: '/member/orders', icon: 'Tickets', feature: 'F-ADM-06' },
      { title: '退款与售后', path: '/member/refunds', icon: 'RefreshLeft', feature: 'F-ADM-07' }
    ]
  },
  { type: 'item', title: '云增强任务', path: '/cloud-tasks', icon: 'Cloudy', feature: 'F-CLD' },
  { type: 'item', title: '支付权益流水', path: '/service/ledger', icon: 'Coin', feature: 'F-SRV' },
  {
    type: 'group',
    title: '系统管理',
    icon: 'Setting',
    children: [
      { title: '管理员与权限', path: '/system/admins', icon: 'Avatar', feature: 'F-ADM-03' },
      { title: '操作审计', path: '/system/audit', icon: 'Document', feature: 'F-ADM-03' }
    ]
  }
]

const activePath = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '运营看板')
const currentGroup = computed(() => route.meta?.group || '概览')
const currentFeature = computed(() => route.meta?.feature || '')
const collapsed = computed(() => app.sidebarCollapsed)

function onSelect(path) {
  if (path !== route.path) router.push(path)
}

function onResize() {
  app.handleViewport(window.innerWidth)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  onResize()
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

function goNotice(item) {
  router.push(item.path || '/dashboard')
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('退出后需要重新使用管理员账号登录，确认退出？', '退出登录', {
      confirmButtonText: '确认退出',
      cancelButtonText: '再想想',
      type: 'warning'
    })
    auth.logout()
    ElMessage.success('已安全退出')
    router.push('/login')
  } catch (e) {
    /* 用户取消 */
  }
}

function comingSoon(name) {
  ElMessage.info(`「${name}」在演示 Demo 中暂未开放`)
}
</script>

<template>
  <div class="layout" :class="{ 'layout--collapsed': collapsed }">
    <!-- ===== 侧边栏 ===== -->
    <aside class="sidebar">
      <div class="sidebar__logo" @click="router.push('/dashboard')">
        <div class="sidebar__mark">
          <el-icon :size="18"><Camera /></el-icon>
        </div>
        <transition name="fade-text">
          <div v-show="!collapsed" class="sidebar__brand">
            <div class="sidebar__brand-name">AI 照相馆</div>
            <div class="sidebar__brand-sub">运营管理后台</div>
          </div>
        </transition>
      </div>

      <el-scrollbar class="sidebar__scroll">
        <el-menu
          class="sidebar__menu"
          :default-active="activePath"
          :collapse="collapsed"
          :collapse-transition="false"
          background-color="transparent"
          text-color="rgba(255,255,255,.88)"
          active-text-color="#4E6B69"
          @select="onSelect"
        >
          <template v-for="menu in menus" :key="menu.title">
            <el-sub-menu v-if="menu.type === 'group'" :index="menu.title">
              <template #title>
                <el-icon><component :is="menu.icon" /></el-icon>
                <span>{{ menu.title }}</span>
              </template>
              <el-menu-item v-for="child in menu.children" :key="child.path" :index="child.path">
                <el-icon><component :is="child.icon" /></el-icon>
                <template #title>
                  <span class="menu-text">{{ child.title }}</span>
                  <span class="menu-feature mono">{{ child.feature }}</span>
                </template>
              </el-menu-item>
            </el-sub-menu>

            <el-menu-item v-else :index="menu.path">
              <el-icon><component :is="menu.icon" /></el-icon>
              <template #title>
                <span class="menu-text">{{ menu.title }}</span>
                <span class="menu-feature mono">{{ menu.feature }}</span>
              </template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar__footer">
        <template v-if="!collapsed">
          <div class="sidebar__footer-row">
            <span class="sidebar__dot"></span>
            <span>演示数据 · 未接后端</span>
          </div>
          <div class="sidebar__footer-sub">功能报告 {{ demoMeta.version }} · {{ demoMeta.featureCount }} 项功能</div>
        </template>
        <el-tooltip v-else content="演示数据 · 未接后端" placement="right">
          <span class="sidebar__dot"></span>
        </el-tooltip>
      </div>
    </aside>

    <!-- ===== 右侧主区 ===== -->
    <div class="layout__main">
      <header class="topbar">
        <el-tooltip :content="collapsed ? '展开侧边栏' : '收起侧边栏'" placement="bottom">
          <button class="topbar__icon-btn" @click="app.toggleSidebar()">
            <el-icon :size="18">
              <component :is="collapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </button>
        </el-tooltip>

        <el-breadcrumb class="topbar__crumb" separator="/">
          <el-breadcrumb-item>{{ currentGroup }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
        </el-breadcrumb>

        <span v-if="currentFeature" class="soft-tag soft-tag--primary mono topbar__feature">
          {{ currentFeature }}
        </span>

        <div class="topbar__spacer"></div>

        <span class="soft-tag soft-tag--mute topbar__env">
          <el-icon :size="12"><WarningFilled /></el-icon>
          演示数据
        </span>

        <el-popover placement="bottom-end" :width="300" trigger="click" popper-class="notice-popover">
          <template #reference>
            <button class="topbar__icon-btn">
              <el-badge :value="notifications.length" :offset="[-2, 2]">
                <el-icon :size="18"><Bell /></el-icon>
              </el-badge>
            </button>
          </template>
          <div class="notice">
            <div class="notice__head">待办提醒</div>
            <div
              v-for="item in notifications"
              :key="item.id"
              class="notice__item"
              @click="goNotice(item)"
            >
              <span class="notice__dot" :class="`notice__dot--${item.type}`"></span>
              <div class="notice__body">
                <div class="notice__title">{{ item.title }}</div>
                <div class="notice__desc">{{ item.desc }}</div>
              </div>
              <span class="notice__time">{{ item.time }}</span>
            </div>
          </div>
        </el-popover>

        <el-dropdown trigger="click" @command="(cmd) => cmd === 'logout' ? handleLogout() : comingSoon(cmd)">
          <div class="topbar__user">
            <div class="topbar__avatar">{{ auth.admin?.avatarText || 'A' }}</div>
            <div class="topbar__user-info">
              <div class="topbar__user-name">{{ auth.displayName }}</div>
              <div class="topbar__user-role">{{ auth.admin?.role || '管理员' }}</div>
            </div>
            <el-icon :size="12"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                {{ auth.admin?.dept || '运营中心' }} · {{ auth.admin?.account || 'admin' }}
              </el-dropdown-item>
              <el-dropdown-item command="个人资料">个人资料</el-dropdown-item>
              <el-dropdown-item command="修改密码">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <el-scrollbar class="layout__scroll">
        <main class="layout__content">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
          <footer class="layout__footer">
            AI 照相馆 · 管理后台 Demo ｜ 数据为演示 Mock，接口对接 SpringBoot 后替换数据源
          </footer>
        </main>
      </el-scrollbar>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--c-bg);
}

/* ---------------- 侧边栏 ---------------- */
.sidebar {
  flex: none;
  width: 224px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #99b6b4 0%, #a7c2c0 45%, #bacfce 100%);
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 10;
}

.layout--collapsed .sidebar {
  width: 68px;
}

.sidebar::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 180px;
  background: radial-gradient(circle at 20% 100%, rgba(255, 255, 255, 0.35), transparent 62%);
  pointer-events: none;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
  cursor: pointer;
  user-select: none;
}

.sidebar__mark {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #d48982, #dfb199);
  box-shadow: 0 8px 16px -8px rgba(47, 62, 61, 0.6);
  transition: transform 0.3s ease;
}

.sidebar__logo:hover .sidebar__mark {
  transform: rotate(-8deg) scale(1.05);
}

.sidebar__brand {
  overflow: hidden;
  white-space: nowrap;
}

.sidebar__brand-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.4px;
}

.sidebar__brand-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
}

.sidebar__scroll {
  flex: 1;
  min-height: 0;
}

.sidebar__footer {
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.86);
}

.sidebar__footer-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar__footer-sub {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.sidebar__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dfb199;
  box-shadow: 0 0 0 3px rgba(223, 177, 153, 0.35);
}

.menu-text {
  flex: 1;
}

.menu-feature {
  opacity: 0.72;
  font-size: 10px;
}

/* 菜单项：hover / active 效果 */
.sidebar__menu {
  border-right: none;
  padding: 4px 0 12px;
}

.sidebar__menu :deep(.el-menu-item),
.sidebar__menu :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  margin: 4px 10px;
  border-radius: 11px;
  position: relative;
  transition: background-color 0.22s ease, color 0.22s ease, transform 0.22s ease;
}

.sidebar__menu :deep(.el-menu-item:hover),
.sidebar__menu :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.22) !important;
  color: #fff !important;
  transform: translateX(2px);
}

.sidebar__menu :deep(.el-menu-item.is-active) {
  background: #ffffff !important;
  color: #4e6b69 !important;
  font-weight: 600;
  box-shadow: 0 10px 20px -12px rgba(47, 62, 61, 0.75);
}

.sidebar__menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
  background: linear-gradient(180deg, #d48982, #dfb199);
}

.sidebar__menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #fff !important;
  font-weight: 600;
}

.sidebar__menu :deep(.el-menu--inline) {
  background: transparent;
}

.sidebar__menu :deep(.el-menu--inline .el-menu-item) {
  min-width: auto;
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  height: 40px;
  line-height: 40px;
}

.sidebar__menu :deep(.el-menu--inline .el-menu-item.is-active) {
  background: #ffffff !important;
  color: #4e6b69 !important;
}

/* ---------------- 顶栏 ---------------- */
.layout__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  flex: none;
  height: 62px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--c-border);
  position: relative;
  z-index: 9;
}

.topbar__icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: #fff;
  color: var(--c-text-sub);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.22s ease;
}

.topbar__icon-btn:hover {
  color: var(--c-primary-deep);
  border-color: var(--c-primary-light);
  background: var(--c-primary-soft);
  transform: translateY(-1px);
}

.topbar__crumb :deep(.el-breadcrumb__inner) {
  color: var(--c-text-sub);
  font-weight: 400;
}

.topbar__crumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--c-text);
  font-weight: 600;
}

.topbar__feature {
  display: none;
}

@media (min-width: 900px) {
  .topbar__feature {
    display: inline-flex;
  }
}

.topbar__spacer {
  flex: 1;
}

.topbar__env {
  display: none;
}

@media (min-width: 760px) {
  .topbar__env {
    display: inline-flex;
  }
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.22s ease;
  outline: none;
}

.topbar__user:hover {
  background: var(--c-primary-soft);
}

.topbar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 13px;
  background: linear-gradient(135deg, #99b6b4, #d48982);
}

.topbar__user-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.topbar__user-role {
  font-size: 11px;
  color: var(--c-text-mute);
  line-height: 1.3;
}

.topbar__user-info {
  display: none;
}

@media (min-width: 780px) {
  .topbar__user-info {
    display: block;
  }
}

/* ---------------- 内容区 ---------------- */
.layout__scroll {
  flex: 1;
  min-height: 0;
  background: radial-gradient(circle at 100% 0%, #eef6f5 0%, var(--c-bg) 45%);
}

.layout__content {
  padding: 20px 22px 0;
  min-height: calc(100vh - 62px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout__footer {
  margin-top: auto;
  padding: 18px 0 20px;
  text-align: center;
  font-size: 12px;
  color: var(--c-text-mute);
}

.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.2s ease;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>

<style>
.notice-popover {
  padding: 8px !important;
  border-radius: 14px !important;
}

.notice__head {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
  padding: 4px 6px 8px;
  border-bottom: 1px solid var(--c-border);
}

.notice__item {
  display: flex;
  gap: 10px;
  padding: 10px 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notice__item:hover {
  background: var(--c-primary-soft);
}

.notice__dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--c-primary);
}

.notice__dot--accent {
  background: var(--c-accent);
}
.notice__dot--warm {
  background: var(--c-warm);
}
.notice__dot--primary {
  background: var(--c-primary);
}

.notice__body {
  flex: 1;
  min-width: 0;
}

.notice__title {
  font-size: 13px;
  color: var(--c-text);
  line-height: 1.4;
}

.notice__desc {
  font-size: 12px;
  color: var(--c-text-mute);
  margin-top: 2px;
}

.notice__time {
  font-size: 11px;
  color: var(--c-text-mute);
  white-space: nowrap;
}
</style>
