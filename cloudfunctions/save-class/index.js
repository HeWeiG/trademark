// cloudfunctions/update-trademark-class/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 修改商标分类信息云函数
 * 集合名：trademark_classes
 * 前端传参格式：{"_id":"xxx","code":"01","name":"化学原料",...}
 */
exports.main = async (event, context) => {
  const { 
    _id,      // 分类ID（必需）
    code,     // 分类编码
    name,     // 分类名称
    desc,     // 分类描述
    iconClass, // 图标类名
    order,    // 排序值
    count     // 数量（如果有）
  } = event
  
  try {
    console.log('开始修改分类，参数:', event)
    
    // 1. 必需参数验证
    if (!_id) {
      console.error('分类ID为空')
      return {
        code: 400,
        message: '分类ID不能为空'
      }
    }
    
    // 2. 检查是否有需要修改的字段
    const hasUpdateFields = code !== undefined || name !== undefined || 
                          desc !== undefined || iconClass !== undefined || 
                          order !== undefined || count !== undefined
    
    if (!hasUpdateFields) {
      console.log('没有需要修改的字段')
      return {
        code: 400,
        message: '没有需要修改的字段'
      }
    }
    
    // 3. 检查分类是否存在
    console.log('检查分类是否存在，ID:', _id)
    const category = await db.collection('trademark_classes')
      .doc(_id)
      .get()
    
    if (!category.data) {
      console.error('分类不存在，ID:', _id)
      return {
        code: 404,
        message: '分类不存在'
      }
    }
    
    const oldData = category.data
    console.log('原始分类数据:', oldData)
    
    // 4. 如果修改了编码，检查是否重复
    if (code !== undefined && code !== oldData.code) {
      console.log('检查编码重复，新编码:', code, '排除ID:', _id)
      const duplicateCheck = await checkDuplicateCode(code, _id)
      if (duplicateCheck.exists) {
        console.error('编码重复:', code)
        return {
          code: 409,
          message: `分类编码 "${code}" 已存在`
        }
      }
    }
    
    // 5. 准备更新数据
    const updateData = prepareUpdateData({
      code,
      name,
      desc,
      iconClass,
      order,
      count
    }, oldData)
    
    console.log('准备更新的数据:', updateData)
    
    // 6. 如果没有实际需要更新的字段，直接返回
    if (Object.keys(updateData).length === 0) {
      console.log('没有字段需要更新')
      return {
        code: 200,
        message: '没有字段需要更新',
        data: oldData
      }
    }
    
    // 7. 执行更新
    console.log('执行数据库更新')
    const updateResult = await db.collection('trademark_classes')
      .doc(_id)
      .update({
        data: updateData
      })
    
    console.log('更新结果:', updateResult)
    
    // 8. 获取更新后的数据
    const updatedCategory = await db.collection('trademark_classes')
      .doc(_id)
      .get()
    
    console.log('更新后的数据:', updatedCategory.data)
    
    // 9. 返回成功结果
    return {
      code: 200,
      message: '分类修改成功',
      data: updatedCategory.data
    }
    
  } catch (error) {
    console.error('修改分类失败:', error)
    
    // 处理常见错误
    if (error.errCode === 'DATABASE_PERMISSION_DENIED') {
      return {
        code: 403,
        message: '没有权限修改分类'
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
      message: '修改失败',
      error: error.message
    }
  }
}

/**
 * 准备更新数据
 */
function prepareUpdateData(newData, oldData) {
  const updateData = {}
  
  console.log('准备更新数据 - 新数据:', newData, '旧数据:', oldData)
  
  // 1. 处理编码
  if (newData.code !== undefined) {
    const trimmedCode = String(newData.code).trim()
    if (trimmedCode !== oldData.code && trimmedCode !== '') {
      updateData.code = trimmedCode
      console.log('需要更新编码:', trimmedCode)
    }
  }
  
  // 2. 处理名称
  if (newData.name !== undefined) {
    const trimmedName = String(newData.name).trim()
    if (trimmedName !== oldData.name && trimmedName !== '') {
      updateData.name = trimmedName
      console.log('需要更新名称:', trimmedName)
    }
  }
  
  // 3. 处理描述
  if (newData.desc !== undefined) {
    const trimmedDesc = String(newData.desc).trim()
    if (trimmedDesc !== oldData.desc) {
      updateData.desc = trimmedDesc
      console.log('需要更新描述')
    }
  }
  
  // 4. 处理图标类名
  if (newData.iconClass !== undefined) {
    const trimmedIconClass = String(newData.iconClass).trim()
    if (trimmedIconClass !== oldData.iconClass) {
      updateData.iconClass = trimmedIconClass
      console.log('需要更新图标类名:', trimmedIconClass)
    }
  }
  
  // 5. 处理排序值
  if (newData.order !== undefined) {
    const orderNum = Number(newData.order)
    if (!isNaN(orderNum) && orderNum >= 0 && orderNum <= 999999) {
      if (orderNum !== oldData.order) {
        updateData.order = orderNum
        console.log('需要更新排序值:', orderNum)
      }
    }
  }
  
  // 6. 处理数量（如果有这个字段）
  if (newData.count !== undefined) {
    const countNum = Number(newData.count)
    if (!isNaN(countNum) && countNum >= 0) {
      if (countNum !== oldData.count) {
        updateData.count = countNum
        console.log('需要更新数量:', countNum)
      }
    }
  }
  
  // 7. 添加更新时间
  if (Object.keys(updateData).length > 0) {
    updateData.updateTime = db.serverDate()
    console.log('添加更新时间')
  }
  
  console.log('最终更新数据:', updateData)
  return updateData
}

/**
 * 检查编码是否重复
 */
async function checkDuplicateCode(code, excludeId) {
  try {
    console.log(`检查编码重复: ${code}, 排除ID: ${excludeId}`)
    
    const result = await db.collection('trademark_classes')
      .where({
        code: code,
        _id: _.neq(excludeId)
      })
      .get()
    
    console.log('检查结果:', result.data)
    
    return {
      exists: result.data.length > 0,
      count: result.data.length,
      duplicates: result.data
    }
  } catch (error) {
    console.error('检查编码重复失败:', error)
    return {
      exists: false,
      count: 0,
      duplicates: []
    }
  }
}