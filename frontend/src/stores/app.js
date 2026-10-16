import { defineStore } from 'pinia'

const COLLAPSE_KEY = 'ap_admin_sidebar_collapsed'
/** 窄屏阈值：与 AdminLayout 的响应式断点保持一致 */
const BREAKPOINT = 1180

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: localStorage.getItem(COLLAPSE_KEY) === '1',
    autoCollapsed: false,
    /** 上一次的窗口宽度，用来判断有没有「越过」1180 这个阈值 */
    lastWidth: 0
  }),
  actions: {
    setCollapsed(value) {
      this.sidebarCollapsed = !!value
      localStorage.setItem(COLLAPSE_KEY, this.sidebarCollapsed ? '1' : '0')
    },
    toggleSidebar() {
      this.setCollapsed(!this.sidebarCollapsed)
    },
    /** 窄屏抽屉用完收起。刻意不写 localStorage：
        点一次菜单就被记成「用户偏好收起侧边栏」，回到宽屏后侧边栏会莫名其妙一直窄着。
        记上 autoCollapsed 是为了让 handleViewport 在回到宽屏时把用户原来的选择还原回来。 */
    hideDrawer() {
      this.autoCollapsed = true
      this.sidebarCollapsed = true
    },
    /** 窗口变窄时自动收起，变宽后恢复用户的手动选择。
        只在「跨过阈值」那一次动作：原先每来一个宽度 < 1180 的 resize 事件都收起，
        于是窄屏下用户手动展开侧边栏，随便动一下窗口又被打回收起状态。 */
    handleViewport(width) {
      const wasNarrow = this.lastWidth > 0 && this.lastWidth < BREAKPOINT
      const isNarrow = width < BREAKPOINT
      this.lastWidth = width
      if (isNarrow && !wasNarrow) {
        if (!this.sidebarCollapsed) {
          this.autoCollapsed = true
          this.sidebarCollapsed = true
        }
      } else if (!isNarrow && wasNarrow && this.autoCollapsed) {
        this.autoCollapsed = false
        this.sidebarCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1'
      }
    }
  }
})
