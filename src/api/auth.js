import request from './request'

/**
 * 认证相关接口
 * 对应后端：com.blog.controller.AuthController
 */

/**
 * 注册
 * POST /api/auth/register
 * @param {{username:string, password:string, nickname:string, email:string}} data
 * @returns {Promise<{code:number,msg:string,data:{token:string,tokenType:string,expiresIn:number,user:Object}}>}
 */
export function register(data) {
  return request.post('/auth/register', data)
}

/**
 * 登录
 * POST /api/auth/login
 * @param {{username:string, password:string}} data
 * @returns 成功时 data 为 LoginVO，包含 token 与用户信息
 */
export function login(data) {
  return request.post('/auth/login', data)
}

/**
 * 退出登录（后端会把 token 从内存白名单移除，使其立即失效）
 * POST /api/auth/logout
 */
export function logout() {
  return request.post('/auth/logout')
}

/**
 * 获取当前登录用户信息
 * GET /api/auth/me
 * @returns 成功时 data 为 UserVO
 */
export function getCurrentUser() {
  return request.get('/auth/me')
}
