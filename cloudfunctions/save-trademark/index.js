// cloudfunctions/save-trademark/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 保存商标云函数（新增/编辑）
 */
exports.main = async (event, context) => {
  const { 
    _id,                    // 商标ID（编辑时传入）
    trademarkImage,        // 图片上传地址
    name,                   // 商标名称
    registrationNo,         // 注册号
    classCode,              // 商标类别
    price,                  // 价格
    originalPrice,          // 原价
    applicationsCount,      // 申请量
    partnerName,            // 合作方名称
    partnerContact,         // 合作方联系人
    partnerPhone,           // 合作方电话
    partnerEmail,           // 合作方邮箱
    consultantContact,      // 咨询联系人
    exclusiveRightStart,    // 专用权开始
    exclusiveRightEnd,      // 专用权截止
    validGroups,            // 有效群组
    approvedGoodsServices,  // 核准商品服务
    desc,                   // 备注
    isDiscount = false,     // 是否精品
    isFeatured = false,     // 是否特价
    isSold = false          // 是否已售
  } = event
  
  try {
    // 1. 参数验证
    if (!name) {
      return {
        code: 400,
        message: '商标名称不能为空'
      }
    }
    
    if (!registrationNo) {
      return {
        code: 400,
        message: '注册号不能为空'
      }
    }
    
    if (!classCode) {
      return {
        code: 400,
        message: '商标类别不能为空'
      }
    }
    
    if (!price || price <= 0) {
      return {
        code: 400,
        message: '价格必须大于0'
      }
    }
    
    // 2. 构建商标数据
    const trademarkData = {
      name,
      trademarkImage,
      registrationNo,
      classCode,
      price: Number(price),
      originalPrice: Number(originalPrice) || Number(price),
      applicationsCount: Number(applicationsCount) || 0,
      partnerName,
      partnerContact,
      partnerPhone,
      partnerEmail,
      consultantContact,
      exclusiveRightStart,
      exclusiveRightEnd,
      validGroups,
      approvedGoodsServices,
      desc,
      isDiscount: Boolean(isDiscount),
      isFeatured: Boolean(isFeatured),
      isSold: Boolean(isSold),
      updateTime: new Date()
    }
    
    // 3. 检查注册号是否重复（新增时）
    if (!_id) {
      const existingTrademark = await db.collection('trademarks')
        .where({
          registrationNo: registrationNo
        })
        .get()
      
      if (existingTrademark.data.length > 0) {
        return {
          code: 400,
          message: '该注册号已存在，请使用其他注册号'
        }
      }
      
      trademarkData.createTime = new Date()
      trademarkData.order = Date.now() // 用于排序
    }
    
    let result
    if (_id) {
      // 编辑模式：更新数据
      result = await db.collection('trademarks')
        .doc(_id)
        .update({
          data: trademarkData
        })
    } else {
      // 新增模式：添加数据
      result = await db.collection('trademarks')
        .add({
          data: trademarkData
        })
    }
    
    // 4. 返回成功结果
    return {
      code: 200,
      message: _id ? '商标更新成功' : '商标新增成功',
      data: {
        id: _id || result._id,
        ...trademarkData
      }
    }
    
  } catch (error) {
    console.error('保存商标失败:', error)
    
    // 错误处理
    if (error.errCode === 'DATABASE_PERMISSION_DENIED') {
      return {
        code: 403,
        message: '数据库权限不足，请检查集合权限设置'
      }
    }
    
    return {
      code: 500,
      message: _id ? '更新失败' : '新增失败',
      error: error.message
    }
  }
}