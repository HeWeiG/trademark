const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  const { fileId } = event
  
  try {
    if (!fileId) {
      return {
        code: 400,
        message: 'fileId参数不能为空'
      }
    }
    
    console.log('开始删除文件:', fileId)
    
    // 删除文件
    const deleteResult = await cloud.deleteFile({
      fileList: [fileId]
    })
    
    console.log('删除文件结果:', deleteResult)
    
    if (deleteResult.fileList && deleteResult.fileList[0]) {
      const fileInfo = deleteResult.fileList[0]
      
      // 微信云开发删除文件成功时，errMsg为'ok'
      if (fileInfo.errMsg === 'ok') {
        return {
          code: 200,
          message: '删除成功',
          data: {
            deleted: true,
            fileId: fileId
          }
        }
      } else {
        // 删除失败，返回具体错误信息
        return {
          code: 500,
          message: `删除失败: ${fileInfo.errMsg || '未知错误'}`,
          data: {
            deleted: false,
            error: fileInfo.errMsg
          }
        }
      }
    } else {
      return {
        code: 500,
        message: '删除失败，服务器返回格式异常',
        data: {
          deleted: false
        }
      }
    }
    
  } catch (error) {
    console.error('删除商标图样失败:', error)
    return {
      code: 500,
      message: '删除失败: ' + error.message,
      data: {
        deleted: false,
        error: error.message
      }
    }
  }
}