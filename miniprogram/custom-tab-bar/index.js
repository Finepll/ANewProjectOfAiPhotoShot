Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '影棚', icon: 'studio', index: 0 },
      { pagePath: '/pages/templates/index', text: '模板', icon: 'tpl', index: 1 },
      { pagePath: '/pages/camera/index', text: '拍摄', icon: 'shoot', center: true, index: 2 },
      { pagePath: '/pages/works/index', text: '记录', icon: 'works', index: 3 },
      { pagePath: '/pages/profile/index', text: '我的', icon: 'me', index: 4 }
    ]
  },

  methods: {
    onTabTap(e) {
      const { path, index } = e.currentTarget.dataset
      this.setData({ selected: Number(index) })
      wx.switchTab({ url: path })
    },

    /** 页面 onShow 时同步选中态 */
    setSelected(index) {
      this.setData({ selected: Number(index) })
    }
  }
})
