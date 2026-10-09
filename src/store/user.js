import { reactive, computed } from 'vue'

/**
 * 登录态管理（不使用 Pinia，用 reactive + localStorage 手写）
 *
 * 设计要点：
 * 1. 单一数据源：整个应用只有这一个 reactive 对象保存 token 与用户信息。
 * 2. 持久化：token 与 userInfo 同步写入 localStorage，刷新页面不丢登录态。
 * 3. 无副作用依赖：本模块【不导入任何 api 模块】。
 *    因为 api/request.js 需要导入本模块（读 token、401 时清登录态），
 *    如果本模块反过来导入 api，就会形成 request -> router -> store -> api -> request 的循环依赖。
 *    所以「调接口」这件事交给页面组件去做，本模块只负责状态读写。
 */

/** localStorage 中保存 token 的 key（与后端/需求约定一致） */
const TOKEN_KEY = 'blog_token'

/** localStorage 中保存用户信息的 key */
const USER_KEY = 'blog_user'

/**
 * 从 localStorage 安全地读取用户信息。
 * localStorage 里的内容可能是被手动改坏的字符串，所以必须 try/catch。
 */
function readUserInfo() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn('[userStore] 本地用户信息解析失败，已忽略', e)
    return null
  }
}

/**
 * 全局登录态（响应式）。
 * 任何组件里 `import { userStore } from '@/store/user'` 后直接读属性，
 * 属性变化会自动触发模板更新。
 */
export const userStore = reactive({
  /** JWT 令牌，空字符串表示未登录 */
  token: localStorage.getItem(TOKEN_KEY) || '',
  /** 当前用户信息（UserVO），null 表示未登录 */
  userInfo: readUserInfo()
})

/** 是否已登录（计算属性，模块级 computed 是允许的） */
export const isLogin = computed(() => !!userStore.token)

/** 是否为管理员 */
export const isAdmin = computed(() => userStore.userInfo?.role === 'ADMIN')

/** 当前用户昵称，未登录时给一个占位 */
export const displayName = computed(
  () => userStore.userInfo?.nickname || userStore.userInfo?.username || '未登录'
)

/**
 * 登录/注册成功后写入登录态。
 *
 * @param {Object} loginVO 后端返回的 LoginVO：{ token, tokenType, expiresIn, user }
 */
export function setLogin(loginVO) {
  if (!loginVO) return
  userStore.token = loginVO.token || ''
  userStore.userInfo = loginVO.user || null

  localStorage.setItem(TOKEN_KEY, userStore.token)
  if (userStore.userInfo) {
    localStorage.setItem(USER_KEY, JSON.stringify(userStore.userInfo))
  }
}

/**
 * 只更新用户信息（例如修改个人资料后）。
 *
 * @param {Object} userVO 最新的 UserVO
 */
export function setUserInfo(userVO) {
  if (!userVO) return
  userStore.userInfo = userVO
  localStorage.setItem(USER_KEY, JSON.stringify(userVO))
}

/**
 * 清空登录态（退出登录 / token 失效 / 被禁用时调用）。
 * 注意：只清本地，不调后端接口。
 */
export function clearLogin() {
  userStore.token = ''
  userStore.userInfo = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** 获取当前 token（给 axios 请求拦截器使用） */
export function getToken() {
  return userStore.token
}
