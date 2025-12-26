// cloudfunctions/batch-category/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 批量查询分类（用于下拉选择器）
 */
exports.main = async (event, context) => {
  const { 
    ids = [],      // 根据ID数组查询
    codes = [],    // 根据编码数组查询
    keyword = '',  // 关键词过滤
    limit = 50     // 限制返回数量
  } = event
  
  try {
    let query = db.collection('trademark_classes')
    
    // 1. 根据ID数组查询
    if (ids && ids.length > 0) {
      query = query.where({
        _id: db.command.in(ids)
      })
    }
    // 2. 根据编码数组查询
    else if (codes && codes.length > 0) {
      query = query.where({
        code: db.command.in(codes)
      })
    }
    // 3. 关键词查询
    else if (keyword) {
      const _ = db.command
      query = query.where(
        _.or([
          { code: db.RegExp({ regexp: keyword, options: 'i' }) },
          { name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      )
    }
    
    // 限制数量并排序
    const result = await query
      .orderBy('order', 'asc')
      .orderBy('code', 'asc')
      .limit(Math.min(limit, 100))
      .get()
    
    // 格式化数据用于下拉选择
    const options = (result.data || []).map(item => ({
      label: `${item.code} ${item.name}`,
      value: item._id,
      code: item.code,
      name: item.name,
      desc: item.desc,
      iconClass: item.iconClass,
      order: item.order
    }))
    
    return {
      code: 200,
      message: '查询成功',
      data: options
    }
    
  } catch (error) {
    console.error('批量查询分类失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}