import { defineStore } from 'pinia'

const COLLAPSE_KEY = 'ap_admin_sidebar_collapsed'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: localStorage.getItem(COLLAPSE_KEY) === '1',
    autoCollapsed: false
  }),
  actions: {
    setCollapsed(value) {
      this.sidebarCollapsed = !!value
      localStorage.setItem(COLLAPSE_KEY, this.sidebarCollapsed ? '1' : '0')
    },
    toggleSidebar() {
      this.setCollapsed(!this.sidebarCollapsed)
    },
    /** 窗口变窄时自动收起，变宽后恢复用户的手动选择 */
    handleViewport(width) {
      if (width < 1180 && !this.sidebarCollapsed) {
        this.autoCollapsed = true
        this.sidebarCollapsed = true
      } else if (width >= 1180 && this.autoCollapsed) {
        this.autoCollapsed = false
        this.sidebarCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1'
      }
    }
  }
})
