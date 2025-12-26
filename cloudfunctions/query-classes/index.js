// cloudfunctions/query-category/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 分类表分页查询云函数（简化版）
 * 针对扁平分类结构，支持编码和名称模糊查询
 */
exports.main = async (event, context) => {
  const { 
    page = 1,        // 页码，默认第1页
    pageSize = 20,   // 每页数量，默认20条
    keyword = '',    // 搜索关键词（编码或名称）
    code = '',       // 精确查询编码
    orderField = 'order', // 排序字段，默认按order排序
    orderType = 'asc'     // 排序方式：asc=升序，desc=降序
  } = event
  
  try {
    // 构建查询条件
    const whereCondition = {}
    
    // 1. 精确查询编码
    if (code) {
      whereCondition.code = code
    }
    
    // 2. 模糊查询（编码或名称）
    if (keyword && !code) {
      whereCondition._complex = _.or([
        {
          code: db.RegExp({
            regexp: keyword,
            options: 'i' // 忽略大小写
          })
        },
        {
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          desc: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ])
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize
    const limit = parseInt(pageSize)
    
    // 执行查询：先获取总数
    const countResult = await db.collection('trademark_classes')
      .where(whereCondition)
      .count()
    
    const total = countResult.total
    
    // 查询数据
    const result = await db.collection('trademark_classes')
      .where(whereCondition)
      .orderBy(orderField, orderType === 'desc' ? 'desc' : 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 返回结果
    return {
      code: 200,
      message: '查询成功',
      data: {
        list: result.data || [],
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
    
  } catch (error) {
    console.error('查询分类失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}