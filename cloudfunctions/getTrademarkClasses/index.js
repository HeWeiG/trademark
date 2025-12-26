// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 1. 获取所有分类数据
    const classesResult = await db.collection('trademark_classes')
      .orderBy('code', 'asc')
      .get()
    
    if (!classesResult.data || classesResult.data.length === 0) {
      return {
        code: 404,
        message: '未找到商标分类数据',
        data: []
      }
    }
    
    // 2. 并行查询每个分类的商标数量
    const promises = classesResult.data.map(async (classItem) => {
      // 查询该分类的商标数量
      // 假设商标数据存储在 trademarks 集合中，并且有 classCode 字段
      const countResult = await db.collection('trademarks')
        .where({
          classCode: classItem.code, // 商标的分类编码字段
          status: 'active' // 只统计活跃商标，根据实际情况调整
        })
        .count()
      
      return {
        ...classItem,
        count: countResult.total || 0,
        _id: undefined // 移除 _id，避免前端问题
      }
    })
    
    // 3. 等待所有查询完成
    const classesWithCount = await Promise.all(promises)
    
    return {
      code: 200,
      message: 'success',
      data: classesWithCount,
      total: classesWithCount.length
    }
    
  } catch (error) {
    console.error('云函数执行失败:', error)
    
    // 查询失败时返回基础数据（不包含商标数量）
    const classesResult = await db.collection('trademark_classes')
      .orderBy('code', 'asc')
      .field({
        code: true,
        name: true,
        desc: true
      })
      .get()
    
    const basicData = classesResult.data.map(item => ({
      ...item,
      count: 0, // 商标数量设为0
      _id: undefined
    }))
    
    return {
      code: 500,
      message: '获取商标数量失败，返回基础数据',
      data: basicData,
      total: basicData.length,
      error: error.message
    }
  }
}