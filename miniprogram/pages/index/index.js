Page({
  data: {
    classes: [],
    loading: false,
    loadError: false,
    total: 0
  },

  onLoad(options) {
    this.loadClassesData();
  },

  // 方法一：推荐 - 使用 async/await 语法
  async loadClassesData() {
    // 显示加载状态
    this.setData({ loading: true, loadError: false });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getTrademarkClasses' // 只需要云函数名
      });
      
      const res = result.result;
      if (res && res.code === 200) {
        this.setData({
          classes: res.data || [],
          total: res.total || (res.data ? res.data.length : 0),
          loading: false
        });
      } else {
        throw new Error(res.message || '数据格式错误');
      }
      
    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({
        loading: false,
        loadError: true
      });
      
      // 显示错误提示（可选）
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  

  // 点击列表项查看详情
  onItemTap(e) {
    const code = e.currentTarget.dataset.code;
    const item = this.data.classes.find(cls => cls.code === code);
    
    if (item) {
      wx.showModal({
        title: `第${item.code}类 - ${item.name}`,
        content: item.desc || '暂无详细描述',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadClassesData();
    wx.stopPullDownRefresh();
  }
});