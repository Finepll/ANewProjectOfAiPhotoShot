<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { buildNotifications, demoMeta } from '../mock'

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
    /* 与 router 的 meta.roles 对齐：运营专员看不到管理员配置与审计 */
    roles: ['super'],
    children: [
      { title: '管理员与权限', path: '/system/admins', icon: 'Avatar', feature: 'F-ADM-03' },
      { title: '操作审计', path: '/system/audit', icon: 'Document', feature: 'F-ADM-03' }
    ]
  }
]

/* 只渲染当前角色有权访问的菜单。
   原先两个演示账号（超级管理员 / 运营专员）看到的菜单完全一样，
   auth 里的 isSuper 没有任何地方用到，等于角色只是个标签。 */
const visibleMenus = computed(() => {
  const roleKey = auth.admin?.roleKey
  return menus.filter((menu) => !menu.roles || menu.roles.includes(roleKey))
})

/* 通知条数由退款 / 云任务 / 模板的真实数据算出，不在文案里写死 */
const notifications = computed(() => buildNotifications())

/* 角标只该显示「真的要处理几件事」。buildNotifications 无论有没有待办都返回
   固定几条（没有时给一条「已清空」的灰条目），直接数数组长度会永远停在 3。 */
const noticePending = computed(() => notifications.value.reduce((sum, item) => sum + (item.count || 0), 0))

const menuRef = ref(null)
const mainScrollRef = ref(null)
const noticeVisible = ref(false)

const activePath = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '运营看板')
const currentGroup = computed(() => route.meta?.group || '概览')
const currentFeature = computed(() => route.meta?.feature || '')
const collapsed = computed(() => app.sidebarCollapsed)

/* 窄屏下侧边栏不再占布局宽度，改成浮在内容上的抽屉（见样式里的同名断点）。
   抽屉只有「藏起来」和「完整展开」两种形态，没有 68px 图标栏——
   所以 el-menu 的 collapse 要在窄屏强制关掉，否则 224px 的抽屉里会塞一列图标。

   用 matchMedia 而不是自己监听 resize：媒体查询的判定由浏览器做，
   和 CSS 里那条 @media 永远同源，不会出现「CSS 认为窄、JS 认为宽」的错位。 */
const NARROW = '(max-width: 767px)'
const isNarrow = ref(false)
const railCollapsed = computed(() => collapsed.value && !isNarrow.value)

/* 切页要回到顶部。window 在这里不滚动——滚动发生在常驻的 el-scrollbar 里，
   router 的 scrollBehavior 管不到它，所以长表格滚到底再点别的页会停在原处。 */
watch(activePath, () => mainScrollRef.value?.setScrollTop(0))

/* 从通知跳进「分组内的子路由」时，ElMenu 只会更新高亮，不会展开父分组
   （它只在菜单项注册时算一次展开态），于是激活块藏在收起的分组里；
   而直接刷新同一个地址分组却是展开的——同一地址两种表现。
   这里在路径变化后手动把目标分组展开。 */
watch(activePath, (path) => {
  if (railCollapsed.value) return
  const group = visibleMenus.value.find((menu) => menu.type === 'group' && menu.children?.some((child) => child.path === path))
  if (group) menuRef.value?.open(group.title)
})

function onSelect(path) {
  if (path !== route.path) router.push(path)
  /* 抽屉模式下点完菜单要自己收起来：它是浮层，不收就会一直盖着新页面。
     用 hideDrawer 而不是 setCollapsed——后者会把这个临时动作写进 localStorage。 */
  if (isNarrow.value) app.hideDrawer()
}

function onResize() {
  app.handleViewport(window.innerWidth)
}

const narrowQuery = window.matchMedia(NARROW)
/* 这里只同步 isNarrow。「收起 / 恢复」由 app.handleViewport 负责：
   它用 autoCollapsed 区分「窄屏自动收的」和「用户自己收的」，回宽屏时只还原前者。
   在这里再补一次恢复逻辑会把这个区分弄丢——用户手动收起过的人会被强行展开。 */
function onNarrowChange(e) {
  isNarrow.value = e.matches
}

onMounted(() => {
  isNarrow.value = narrowQuery.matches
  narrowQuery.addEventListener('change', onNarrowChange)
  window.addEventListener('resize', onResize)
  onResize()
})
onBeforeUnmount(() => {
  narrowQuery.removeEventListener('change', onNarrowChange)
  window.removeEventListener('resize', onResize)
})

function goNotice(item) {
  /* 触发方式是 click，Element Plus 只在「点弹层外面」时才关它，
     于是跳转后 300px 的弹层还浮在新页面上。跳转时自己关掉。 */
  noticeVisible.value = false
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
          <div v-show="!railCollapsed" class="sidebar__brand">
            <div class="sidebar__brand-name">AI 照相馆</div>
            <div class="sidebar__brand-sub">运营管理后台</div>
          </div>
        </transition>
      </div>

      <el-scrollbar class="sidebar__scroll">
        <el-menu
          ref="menuRef"
          class="sidebar__menu"
          popper-class="sidebar-popup"
          :default-active="activePath"
          :collapse="railCollapsed"
          :collapse-transition="false"
          background-color="transparent"
          text-color="rgba(255,255,255,.88)"
          active-text-color="#4E6B69"
          @select="onSelect"
        >
          <template v-for="menu in visibleMenus" :key="menu.title">
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
        <template v-if="!railCollapsed">
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

    <!-- 抽屉打开时点空白处收起。宽屏不渲染：那时侧边栏是常驻栏，没有「点外面」这回事 -->
    <div v-if="isNarrow && !collapsed" class="layout__backdrop" @click="app.hideDrawer()"></div>

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

        <el-popover v-model:visible="noticeVisible" placement="bottom-end" :width="300" trigger="click" popper-class="notice-popover">
          <template #reference>
            <button class="topbar__icon-btn">
              <el-badge :value="noticePending" :hidden="noticePending === 0" :offset="[-2, 2]">
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

      <el-scrollbar ref="mainScrollRef" class="layout__scroll">
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

/* 收起态（68px 图标栏）四处修正，都是只在 768~1179px 这一段才显形的：

   1. Element Plus 收起后菜单宽度取它自己的 --el-menu-collapse-width，默认 64px，
      而栏宽是 68px。菜单比栏窄 4px，菜单项就整体偏左——实测左边距 10px、
      右边距 14px，白块看着没居中（展开态是 10/10 对称的）。
      把菜单宽度对齐栏宽，菜单项从 44px 变成 48px，左右正好各 10px。 */
.sidebar__menu.el-menu--collapse {
  width: 68px;
}

/* 2. 收起态不画那条红棕色指示条。白块只有 48px 宽，3px 的红条压在它左边缘上，
      放大看像白块被划开一道；而白块本身已经是足够强的「当前项」指示了。
      展开态保留——那里菜单项有 204px 宽，红条是有效的标记，也不占视觉重心。 */
.sidebar__menu.el-menu--collapse :deep(.el-menu-item.is-active)::before {
  display: none;
}

/* 3. 内边距要跟着菜单宽度一起改。EP 的收起态是按「菜单宽 64 = 图标 24 + padding 20×2」
      让图标居中的，上面把菜单宽度改成 68 之后这个等式就断了，图标稳定右偏 8px。

      要改的是里层那个 tooltip 容器，不是 <li> 本身：EP 给菜单项的
      .el-menu-tooltip__trigger 设了 position:absolute + inset:0，它的包含块是
      <li> 的 padding box（不含 padding），所以 <li> 上的 padding 对它一点作用都没有，
      图标位置只由它自己的 padding 决定。实测菜单项中心 34、图标中心 42。
      48px 的块里放 24px 图标，左右各留 12px 才正中。 */
.sidebar__menu.el-menu--collapse :deep(.el-menu-tooltip__trigger) {
  padding: 0 12px;
}

/* 4. 上面那条管不到分组项——两类项的承载盒不是同一个元素。
      普通项的图标装在 .el-menu-tooltip__trigger 里（absolute + inset:0），分组项没有这层，
      直接承载图标的就是 .el-sub-menu__title 自己，EP 的折叠内边距正落在它身上。
      实测同一栏里：普通项标题盒 10..58、图标 22..46、中心 34（在栏中线上），
      分组项标题盒也是 10..58、padding 20px、图标 30..54、中心 42——右偏 8px。
      一个栏里两种偏移，第 4、7 项看着就是歪的。这里用和普通项同一个算式：
      48px 盒 + 24px 图标 → 左右各留 12px。 */
.sidebar__menu.el-menu--collapse :deep(.el-sub-menu__title) {
  padding: 0 12px;
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

/* ---------------- 窄屏：侧边栏从「推挤」改成「覆盖」 ----------------
   宽屏下 .sidebar 是 .layout 的 flex 子项（flex: none），靠挤占宽度来占位，这没问题。
   但窄屏一旦展开，224px 会直接吃掉正文：实测 390px 视口下正文只剩 122px，
   面包屑被压成竖排、StatCard 的数字从中间截断（1,286 显示成「1,28」）。

   解法是让它退出文档流：position: fixed + translateX(-100%) 藏到屏幕外，
   展开时滑进来，正文始终独占全宽。这样 390px 下正文可用宽度从 278px 涨到 362px——
   因为那 68px 的图标栏也让出来了（手机上有汉堡按钮，不需要常驻图标栏）。 */
@media (max-width: 767px) {
  /* 抽屉恒为完整宽度：68px 的半截图标栏在浮层形态下没有意义。
     基线那条 `.layout--collapsed .sidebar{width:68px}` 特异性是 0,2,0，
     所以这里把 `.layout` 也带上凑到同级、靠位置靠后取胜——不必动用 !important
     （本文件里现有的 !important 都是为了压 Element Plus 自带的样式，性质不同）。 */
  .layout .sidebar,
  .layout--collapsed .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 224px;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .layout:not(.layout--collapsed) .sidebar {
    transform: translateX(0);
    box-shadow: 0 0 40px -8px rgba(47, 62, 61, 0.45);
  }

  .layout__backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(47, 62, 61, 0.34);
    backdrop-filter: blur(1.5px);
  }

  /* 22px 的边距在 390px 上占掉 11%，收到 14px */
  .layout__content {
    padding: 14px 14px 0;
  }

  .topbar {
    padding: 0 12px;
    gap: 8px;
  }

  /* 面包屑的「分组 / 页面」两段在窄屏会换行成两行，且分组名此刻信息量最低
     （菜单已经说明了分组），只留当前页名并禁止换行 */
  .topbar__crumb :deep(.el-breadcrumb__item:first-child) {
    display: none;
  }

  .topbar__crumb {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>

<style>
/* 收起态悬浮展开的子菜单浮层（popper-class="sidebar-popup"）。

   它由 EP 的 tooltip 渲染、被 teleport 到 body，所以上面那个 scoped 块够不到它——
   连 :deep() 也不行（:deep 编译成「有 data-v 的祖先 + 选择器」，而浮层的祖先链在 body 上）。
   这就是 .notice-popover 也写在这个非 scoped 块里的原因。

   不写这段会怎样：浮层外壳是 EP 浅色主题的白底（.el-popper.is-light），
   而文字颜色来自侧边栏的 text-color="rgba(255,255,255,.88)"——
   EP 把 background-color / text-color 这两个 prop 以内联 CSS 变量的形式写在浮层的 <ul> 上
   （实测 <ul style="--el-menu-text-color: rgba(255,255,255,.88); --el-menu-bg-color: transparent">），
   内联变量压过继承，于是浮层飘在页面白卡上就成了白底白字：打开时看着是个空盒子。
   偏偏内联变量只能用 !important 盖，所以下面几条都带 !important。

   配色跟着这个应用自己的浮层规范走（见下面的 .notice-popover）：白面板 + --c-text 深字 +
   --c-primary-soft 悬停。试过让它延续栏的绿色，量出来是 1.8:1（和栏里「白字压在浅绿上」
   同一个对比度）——那是栏的设计，不适合一块飘在白卡片上的浮层。 */
.sidebar-popup.el-popper {
  border-radius: 12px !important;
  padding: 6px !important;
}

.sidebar-popup .el-menu--popup {
  --el-menu-bg-color: transparent !important;
  --el-menu-text-color: var(--c-text) !important;
  --el-menu-hover-bg-color: var(--c-primary-soft) !important;
  --el-menu-hover-text-color: var(--c-text) !important;
  --el-menu-active-color: var(--c-text) !important;
  padding: 0 !important;
}

/* 展开态里子项是 40px 高、小圆角、两侧留白，浮层这里对齐同一套尺寸 */
.sidebar-popup .el-menu-item {
  height: 40px;
  line-height: 40px;
  margin: 2px 0;
  padding: 0 12px !important;
  border-radius: 10px;
  background: transparent !important;
  color: var(--c-text) !important;
}

.sidebar-popup .el-menu-item:hover {
  background: var(--c-primary-soft) !important;
}

.sidebar-popup .el-menu-item.is-active {
  background: var(--c-primary-soft) !important;
  font-weight: 600;
}

/* 栏里标题与功能编号是靠上面那条 .menu-text{flex:1} 撑开的：flex 容器把编号推到最右。
   而 tooltip 与子菜单浮层都 teleport 到 body，scoped 样式到不了，flex:1 在此不生效，
   两个 span 就零间距贴成「用户与额度F-ADM-02」（收起态实测间距 0.0px）。
   这里补一段显式间隔，栏外这两处浮层通用。 */
.sidebar-popup .menu-text {
  margin-right: 6px;
}

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
/* 「已清空 / 无需处理」这类说明性条目用的灰点，原先没有对应规则，
   点会退回 .notice__dot 的底色，看上去和真待办一样醒目 */
.notice__dot--mute {
  background: var(--c-text-mute);
  opacity: 0.5;
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
