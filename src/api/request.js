import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { userStore, clearLogin } from '@/store/user'

/**
 * axios 实例与全局拦截器封装
 *
 * 后端约定（务必对齐）：
 * - 所有接口以 /api 开头；HTTP 状态码永远返回 200；
 * - 响应体统一为 { code, msg, data, timestamp }，**code === 200 才是成功**；
 * - 认证头：Authorization: Bearer <token>。
 */

/** 基础路径：开发环境为 /api，由 Vite proxy 转发到 http://localhost:8080 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

/** 超时时间：默认 15 秒 */
const timeout = Number(import.meta.env.VITE_API_TIMEOUT || 15000)

const service = axios.create({
  baseURL,
  timeout,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' }
})

/* ------------------------------------------------------------------
 * 请求拦截器
 * 作用：每次请求前自动把 token 塞进 Authorization 请求头，
 *       业务代码里就不需要每个接口都手写一遍 token 了。
 * ------------------------------------------------------------------ */
service.interceptors.request.use(
  (config) => {
    const token = userStore.token
    if (token) {
      // 后端约定的格式是 "Bearer " + token（注意 Bearer 后面有一个空格）
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    // 请求还没发出去就出错（极少见），直接抛出
    console.error('[request] 请求配置异常:', error)
    return Promise.reject(error)
  }
)

/**
 * 是否已经在跳转登录页的过程中。
 * 场景：详情页同时发了 3 个请求且都返回 401，
 * 没有这个开关就会连续弹 3 次「登录已过期」并跳 3 次路由。
 */
let redirecting = false

/**
 * 统一处理登录失效：清登录态 -> 提示 -> 跳登录页并带上回跳地址。
 */
function handleUnauthorized() {
  clearLogin()
  if (redirecting) return
  redirecting = true

  ElMessage.error('登录已过期，请重新登录')

  const current = router.currentRoute.value
  const redirect = current.fullPath && !current.fullPath.startsWith('/login')
    ? current.fullPath
    : undefined

  router
    .replace({ path: '/login', query: redirect ? { redirect } : {} })
    .catch(() => {})
    .finally(() => {
      // 留一点时间窗，避免同一批并发 401 重复跳转
      setTimeout(() => {
        redirecting = false
      }, 800)
    })
}

/* ------------------------------------------------------------------
 * 响应拦截器
 * 作用：把 HTTP 层面的响应「翻译」成业务层面的结果。
 *   - code === 200：直接把 Result 对象返回，
 *     所以业务代码里写 `const { data } = await getArticlePage()` 拿到的就是 data。
 *   - code === 401：登录失效处理。
 *   - 其他 code：弹出后端给的 msg 并 reject，业务代码不用再关心错误提示。
 * ------------------------------------------------------------------ */
service.interceptors.response.use(
  (response) => {
    const result = response.data

    // 后端没有按约定返回 JSON（例如走了 Nginx 默认页），做个兜底
    if (!result || typeof result.code === 'undefined') {
      ElMessage.error('服务端返回格式异常')
      return Promise.reject(new Error('服务端返回格式异常'))
    }

    // ---------- 成功 ----------
    if (result.code === 200) {
      return result
    }

    // ---------- 登录失效（未登录 / token 过期 / 用户被禁用） ----------
    if (result.code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error(result.msg || '未登录或登录已过期'))
    }

    // ---------- 权限不足 ----------
    if (result.code === 403) {
      ElMessage.error(result.msg || '权限不足，无法访问')
      return Promise.reject(new Error(result.msg || '权限不足'))
    }

    // ---------- 其他业务错误 ----------
    ElMessage.error(result.msg || '操作失败')
    return Promise.reject(new Error(result.msg || '操作失败'))
  },
  (error) => {
    // ---------- 网络层错误（后端没启动、断网、超时、5xx 等） ----------
    let message = '网络异常，请稍后重试'

    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      message = '请求超时，请检查网络或稍后重试'
    } else if (error.response) {
      const status = error.response.status
      if (status === 404) {
        message = '接口不存在（404），请确认后端服务是否已启动'
      } else if (status === 500) {
        message = '服务器内部错误（500）'
      } else if (status >= 400) {
        message = `请求失败（${status}）`
      }
    } else if (error.message && error.message.includes('Network Error')) {
      message = '无法连接后端服务，请确认 http://localhost:8080 已启动'
    }

    // 静默模式：个别请求（如详情页可选数据）可以传 silent: true 不弹提示
    if (!error.config?.silent) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default service
