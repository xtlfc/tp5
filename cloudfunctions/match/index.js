// cloudfunctions/match/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { diceNumber, location } = event

  try {
    // 获取当前用户信息
    const currentUserRes = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (currentUserRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const currentUser = currentUserRes.data[0]
    const currentUserGender = currentUser.gender

    // 查找同时段摇出相同点数的异性用户
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000) // 5分钟内的记录

    // 查找匹配条件：
    // 1. 不是自己
    // 2. 性别不同（异性）
    // 3. 最近5分钟内摇骰子
    // 4. 摇出的点数相同
    // 5. 用户状态为活跃
    const matchRes = await db.collection('rollHistory').aggregate()
      .match({
        openid: db.command.neq(OPENID),
        diceNumber: diceNumber,
        createTime: db.command.gte(fiveMinutesAgo)
      })
      .lookup({
        from: 'users',
        localField: 'openid',
        foreignField: 'openid',
        as: 'userInfo'
      })
      .match({
        'userInfo.gender': currentUserGender === 1 ? 2 : 1, // 异性匹配
        'userInfo.isActive': true
      })
      .sort({
        createTime: -1
      })
      .limit(1)
      .end()

    if (matchRes.list.length === 0) {
      return {
        success: false,
        message: '暂时没有匹配到用户'
      }
    }

    const matchedRecord = matchRes.list[0]
    const matchedUser = matchedRecord.userInfo[0]

    // 计算距离（如果有位置信息）
    let distance = 0
    if (location && matchedUser.location) {
      distance = calculateDistance(
        location.latitude,
        location.longitude,
        matchedUser.location.latitude,
        matchedUser.location.longitude
      )
    }

    // 更新匹配记录
    await db.collection('rollHistory').doc(matchedRecord._id).update({
      data: { matched: true }
    })

    // 创建匹配记录
    await db.collection('matches').add({
      data: {
        user1Id: OPENID,
        user2Id: matchedUser.openid,
        diceNumber: diceNumber,
        matchTime: new Date(),
        distance: distance,
        isActive: true
      }
    })

    // 返回匹配用户信息
    return {
      success: true,
      matchedUser: {
        openid: matchedUser.openid,
        nickName: matchedUser.nickName,
        avatarUrl: matchedUser.avatarUrl,
        gender: matchedUser.gender,
        location: matchedUser.location,
        distance: distance.toFixed(1)
      },
      message: '匹配成功'
    }

  } catch (error) {
    console.error('匹配失败:', error)
    return {
      success: false,
      message: '匹配失败，请重试'
    }
  }
}

// 计算两点间距离（公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // 地球半径（公里）
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  return distance
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}