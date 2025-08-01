// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()
  const { userInfo } = event

  try {
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (userRes.data.length > 0) {
      // 用户已存在，更新信息
      const user = userRes.data[0]
      await db.collection('users').doc(user._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender,
          country: userInfo.country,
          province: userInfo.province,
          city: userInfo.city,
          lastLoginTime: new Date(),
          updateTime: new Date()
        }
      })

      return {
        success: true,
        openid: OPENID,
        token: OPENID, // 简单使用openid作为token
        message: '登录成功'
      }
    } else {
      // 新用户，创建记录
      const userData = {
        openid: OPENID,
        unionid: UNIONID,
        appid: APPID,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
        matchCount: 0,
        todayRolls: 0,
        totalRolls: 0,
        createTime: new Date(),
        lastLoginTime: new Date(),
        updateTime: new Date(),
        isActive: true
      }

      await db.collection('users').add({
        data: userData
      })

      return {
        success: true,
        openid: OPENID,
        token: OPENID,
        message: '注册成功'
      }
    }

  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败，请重试'
    }
  }
}