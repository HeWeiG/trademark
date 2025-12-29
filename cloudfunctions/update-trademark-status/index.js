const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 更新商标状态云函数
 * 集合名：trademarks
 * 前端传参格式：{"trademarkId":"xxx","field":"isDiscount","value":true}
 */
exports.main = async (event, context) => {
  const {
    trademarkId,  // 商标ID（必需）
    field,        // 字段名（必需）
    value         // 字段值（必需）
  } = event
  
  try {
    console.log('开始更新商标状态，参数:', event)
    
    // 1. 必需参数验证
    if (!trademarkId) {
      console.error('商标ID为空')
      return {
        code: 400,
        message: '商标ID不能为空'
      }
    }
    
    if (!field) {
      console.error('字段名为空')
      return {
        code: 400,
        message: '字段名不能为空'
      }
    }
    
    if (value === undefined) {
      console.error('字段值为空')
      return {
        code: 400,
        message: '字段值不能为空'
      }
    }
    
    // 2. 验证字段名是否合法
    const allowedFields = ['isDiscount', 'isFeatured', 'isSold']
    if (!allowedFields.includes(field)) {
      console.error('字段名不合法:', field)
      return {
        code: 400,
        message: '字段名不合法，只允许：isDiscount, isFeatured, isSold'
      }
    }
    
    // 3. 检查商标是否存在
    console.log('检查商标是否存在，ID:', trademarkId)
    const trademark = await db.collection('trademarks')
      .doc(trademarkId)
      .get()
    
    if (!trademark.data) {
      console.error('商标不存在，ID:', trademarkId)
      return {
        code: 404,
        message: '商标不存在'
      }
    }
    
    const oldData = trademark.data
    console.log('原始商标数据:', oldData)
    
    // 4. 准备更新数据
    const updateData = prepareUpdateData(field, value, oldData)
    
    console.log('准备更新的数据:', updateData)
    
    // 5. 如果没有实际需要更新的字段，直接返回
    if (Object.keys(updateData).length === 0) {
      console.log('没有字段需要更新')
      return {
        code: 200,
        message: '没有字段需要更新',
        data: oldData
      }
    }
    
    // 6. 执行更新
    console.log('执行数据库更新')
    const updateResult = await db.collection('trademarks')
      .doc(trademarkId)
      .update({
        data: updateData
      })
    
    console.log('更新结果:', updateResult)
    
    // 7. 获取更新后的数据
    const updatedTrademark = await db.collection('trademarks')
      .doc(trademarkId)
      .get()
    
    console.log('更新后的数据:', updatedTrademark.data)
    
    // 8. 返回成功结果
    return {
      code: 200,
      message: '商标状态更新成功',
      data: updatedTrademark.data
    }
    
  } catch (error) {
    console.error('更新商标状态失败:', error)
    
    // 处理常见错误
    if (error.errCode === 'DATABASE_PERMISSION_DENIED') {
      return {
        code: 403,
        message: '没有权限更新商标状态'
      }
    }
    
    if (error.errCode === 'DATABASE_REQUEST_FAILED') {
      return {
        code: 500,
        message: '数据库请求失败'
      }
    }
    
    if (error.errCode === 87014) {
      return {
        code: 400,
        message: '内容含有违法违规内容'
      }
    }
    
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 准备更新数据
 */
function prepareUpdateData(field, value, oldData) {
  const updateData = {}
  
  console.log('准备更新数据 - 字段:', field, '值:', value, '旧数据:', oldData)
  
  // 处理布尔值字段
  if (field === 'isDiscount' || field === 'isFeatured' || field === 'isSold') {
    const boolValue = Boolean(value)
    if (boolValue !== oldData[field]) {
      updateData[field] = boolValue
      console.log('需要更新字段:', field, '新值:', boolValue)
    }
  }
  
  // 添加更新时间
  if (Object.keys(updateData).length > 0) {
    updateData.updateTime = db.serverDate()
    console.log('添加更新时间')
  }
  
  console.log('最终更新数据:', updateData)
  return updateData
}