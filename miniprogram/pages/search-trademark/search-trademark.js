Page({
  data: {
    searchKeyword: '',
    history: []
  },
  
  onLoad() {
    // 加载搜索历史
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({ history })
  },
  
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },
  
  onSearch() {
    this.performSearch(this.data.searchKeyword)
  },
  
  onSearchConfirm(e) {
    this.performSearch(e.detail.value)
  },
  
  performSearch(keyword) {
    if (!keyword.trim()) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }
    
    // 保存到历史记录
    const history = [...this.data.history]
    if (!history.includes(keyword)) {
      history.unshift(keyword)
      if (history.length > 10) history.pop()
      this.setData({ history })
      wx.setStorageSync('searchHistory', history)
    }
    
    wx.showLoading({ title: '搜索中...' })
    
    // 模拟搜索
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '搜索功能',
        content: `搜索关键词: ${keyword}\n\n搜索功能正在开发中，敬请期待`,
        showCancel: false
      })
    }, 800)
  },
  
  onTipTap(e) {
    const type = e.currentTarget.dataset.type
    const keywords = {
      'hot': '热门商标',
      '35': '第35类 广告销售',
      '25': '第25类 服装鞋帽', 
      '09': '第09类 科学仪器'
    }
    this.setData({ searchKeyword: keywords[type] })
    this.performSearch(keywords[type])
  },
  
  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ searchKeyword: keyword })
    this.performSearch(keyword)
  },
  
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: [] })
          wx.removeStorageSync('searchHistory')
        }
      }
    })
  }
})