import request from './request'

/**
 * 用户相关接口
 * 对应后端：com.blog.controller.UserController
 */

/**
 * 修改个人资料（需登录）
 * PUT /api/users/profile
 *
 * @param {{nickname?:string, avatar?:string, email?:string, signature?:string, password?:string}} data
 *        password 不传或传空字符串表示不修改密码
 * @returns 成功时 data 为最新的 UserVO
 */
export function updateProfile(data) {
  return request.put('/users/profile', data)
}

/* ------------------------- 以下为管理员接口 ------------------------- */

/**
 * 用户分页列表（管理员）
 * GET /api/admin/users?page=1&size=10&keyword=
 */
export function getAdminUserPage(params) {
  const query = {}
  Object.keys(params || {}).forEach((key) => {
    const value = params[key]
    if (value !== '' && value !== null && value !== undefined) {
      query[key] = value
    }
  })
  return request.get('/admin/users', { params: query })
}

/**
 * 启用 / 禁用用户（管理员）
 * PUT /api/admin/users/{id}/status
 *
 * @param {number} id 用户 ID
 * @param {number} status 1 启用，0 禁用
 */
export function updateUserStatus(id, status) {
  return request.put(`/admin/users/${id}/status`, { status })
}

/**
 * 删除用户（管理员）
 * DELETE /api/admin/users/{id}
 */
export function deleteUser(id) {
  return request.delete(`/admin/users/${id}`)
}
