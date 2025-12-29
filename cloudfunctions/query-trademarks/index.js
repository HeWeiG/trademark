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
    keyword = '',    // 搜索关键词（名称\备注\注册号）
    classCode = '',       // 精确查询编码
    consultantContact = '',       // 咨询联系人
    minPrice,        // 最低价格
    maxPrice,        // 最高价格
    isDiscount,      // 是否精品商标
    isFeatured,      // 是否特价商标
    isSold,          // 是否已售出
    orderField = 'order', // 排序字段，默认按order排序
    orderType = 'asc'     // 排序方式：asc=升序，desc=降序
  } = event
  
  try {
    // 构建查询条件
    const whereCondition = {}
    
    // 1. 精确查询编码
    if (classCode) {
      whereCondition.classCode = classCode
    }
    if(consultantContact){
      whereCondition.consultantContact = consultantContact
    }
    
     // 2. 价格区间查询
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCondition = {}
      
      // 最低价格条件
      if (minPrice !== undefined) {
        priceCondition.price = _.gte(parseFloat(minPrice))
      }
      
      // 最高价格条件
      if (maxPrice !== undefined) {
        if (priceCondition.price) {
          // 如果已经有最低价格条件，使用 and 操作符
          priceCondition.price = _.and([
            priceCondition.price,
            _.lte(parseFloat(maxPrice))
          ])
        } else {
          priceCondition.price = _.lte(parseFloat(maxPrice))
        }
      }
      
      // 合并价格条件到主查询条件
      Object.assign(whereCondition, priceCondition)
    }
    
    // 3. 状态条件查询（是否精品、是否特价、是否已售）
    if (isDiscount !== undefined) {
      whereCondition.isDiscount = isDiscount === true || isDiscount === 'true'
    }
    
    if (isFeatured !== undefined) {
      whereCondition.isFeatured = isFeatured === true || isFeatured === 'true'
    }
    
    if (isSold !== undefined) {
      whereCondition.isSold = isSold === true || isSold === 'true'
    }
    
    // 4. 模糊查询（名称、注册号、描述等）
    if (keyword) {
      whereCondition._complex = _.or([
        {
          registrationNo: db.RegExp({
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
        },
        {
          partnerName: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          partnerContact: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          partnerPhone: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          partnerEmail: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          validGroups: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          approvedGoodsServices: db.RegExp({
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
    const countResult = await db.collection('trademarks')
      .where(whereCondition)
      .count()
    
    const total = countResult.total
    
    // 查询数据
    const result = await db.collection('trademarks')
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