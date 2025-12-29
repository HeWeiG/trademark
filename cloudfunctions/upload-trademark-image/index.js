const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  const { fileName, fileType, base64Data } = event
  
  try {
    // 验证参数
    if (!fileName || !fileType || !base64Data) {
      return {
        code: 400,
        message: '参数不完整，请提供fileName、fileType和base64Data'
      }
    }
    
    // 验证文件类型（只允许图片格式）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return {
        code: 400,
        message: '不支持的文件类型，只允许上传图片文件（JPEG、PNG、GIF、WebP）'
      }
    }
    
    // 验证文件大小（限制为5MB）
    const fileSize = Buffer.from(base64Data, 'base64').length
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (fileSize > maxSize) {
      return {
        code: 400,
        message: '文件大小超过限制，最大支持5MB'
      }
    }
    
    // 生成唯一的文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExtension = fileName.split('.').pop() || 'png'
    const cloudPath = `trademark-images/${timestamp}_${randomStr}.${fileExtension}`
    
    console.log('开始上传文件:', {
      fileName,
      fileType,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      cloudPath
    })
    
    // 上传文件到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(base64Data, 'base64')
    })
    
    console.log('文件上传成功:', {
      fileID: uploadResult.fileID,
      status: uploadResult.statusCode
    })
    
    // 获取文件的临时访问URL（有效期2小时）
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })
    
    if (tempUrlResult.fileList && tempUrlResult.fileList[0]) {
      const tempFileInfo = tempUrlResult.fileList[0]
      
      return {
        code: 200,
        message: '上传成功',
        data: {
          fileId: uploadResult.fileID,
          fileUrl: tempFileInfo.tempFileURL,
          fileName: fileName,
          fileSize: fileSize,
          uploadTime: new Date().toISOString(),
          cloudPath: cloudPath
        }
      }
    } else {
      return {
        code: 500,
        message: '获取临时访问URL失败'
      }
    }
    
  } catch (error) {
    console.error('上传商标图样失败:', error)
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = '上传失败'
    if (error.errCode === 'STORAGE_EXCEED_AUTHORITY') {
      errorMessage = '存储权限不足，请检查云开发存储配置'
    } else if (error.errCode === 'STORAGE_QUOTA_EXCEEDED') {
      errorMessage = '存储空间不足，请清理空间或扩容'
    } else if (error.errCode === 'STORAGE_FILE_NOT_EXIST') {
      errorMessage = '文件不存在'
    } else if (error.errCode === 'STORAGE_NETWORK_ERROR') {
      errorMessage = '网络错误，请检查网络连接'
    }
    
    return {
      code: 500,
      message: errorMessage,
      error: error.message
    }
  }
}