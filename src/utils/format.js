/**
 * 通用工具函数：时间格式化、数字格式化、防抖节流、占位图
 */

/**
 * 把后端返回的时间字符串安全地转成 Date 对象。
 *
 * 为什么不能直接 new Date(str)？
 * 后端返回的是 'yyyy-MM-dd HH:mm:ss'，这种「空格分隔」的格式在 Safari / 部分 iOS 上
 * 会解析成 Invalid Date。把它换成 ISO 风格的 'T' 分隔就没有兼容性问题了。
 *
 * @param {string|number|Date} value 时间字符串 / 时间戳 / Date
 * @returns {Date|null} 解析失败返回 null
 */
export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)

  const str = String(value).trim()
  // 'yyyy-MM-dd HH:mm:ss' -> 'yyyy-MM-ddTHH:mm:ss'
  const normalized = str.includes('T') ? str : str.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 数字补零：9 -> '09' */
function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * 按模板格式化时间。
 *
 * @param {string|Date} value 后端时间字符串
 * @param {string} pattern 模板，支持 yyyy MM dd HH mm ss
 * @returns {string} 解析失败时原样返回，保证页面不会出现 Invalid Date
 */
export function formatTime(value, pattern = 'yyyy-MM-dd HH:mm:ss') {
  const date = toDate(value)
  if (!date) return value ? String(value) : ''
  return pattern
    .replace('yyyy', date.getFullYear())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('dd', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

/**
 * 只保留到「天」，列表页展示更清爽。
 */
export function formatDate(value) {
  return formatTime(value, 'yyyy-MM-dd')
}

/**
 * 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 2 天前 / 超过 30 天显示具体日期。
 */
export function fromNow(value) {
  const date = toDate(value)
  if (!date) return value ? String(value) : ''

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < 0) return formatTime(value, 'yyyy-MM-dd HH:mm')
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatTime(value, 'yyyy-MM-dd')
}

/**
 * 千分位：1234567 -> '1,234,567'
 */
export function formatNumber(value) {
  const num = Number(value || 0)
  return num.toLocaleString('en-US')
}

/**
 * 紧凑数字：1200 -> '1.2k'，25600 -> '2.6w'
 * 用于卡片上的浏览量、点赞数，避免数字太长撑破布局。
 */
export function compactNumber(value) {
  const num = Number(value || 0)
  if (num < 1000) return String(num)
  if (num < 10000) return `${(num / 1000).toFixed(1).replace('.0', '')}k`
  return `${(num / 10000).toFixed(1).replace('.0', '')}w`
}

/**
 * 防抖：高频触发时只在停止触发 delay 毫秒后执行一次。
 * 用于搜索框输入联想，避免每敲一个字符就请求一次接口。
 *
 * @param {Function} fn 目标函数
 * @param {number} delay 延迟毫秒数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function debounced(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流：每 delay 毫秒最多执行一次。
 */
export function throttle(fn, delay = 300) {
  let last = 0
  return function throttled(...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

/**
 * 生成「首字母色块」占位图（内联 SVG data URI）。
 *
 * 用途：
 * 1. 图片加载失败时的兜底，避免出现破图；
 * 2. 后端没给封面时的默认封面。
 *
 * 用 data URI 而不是外链占位图服务，是为了离线环境下也能正常显示。
 *
 * @param {string} text 取首字符展示
 * @param {string} color 主色
 */
export function letterCover(text = 'B', color = '#409EFF') {
  const ch = String(text || 'B').trim().charAt(0).toUpperCase() || 'B'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#a0cfff"/>
</linearGradient></defs>
<rect width="800" height="450" fill="url(#g)"/>
<text x="400" y="272" font-size="170" font-family="-apple-system,Helvetica,Arial,sans-serif"
 fill="#ffffff" fill-opacity="0.9" text-anchor="middle">${ch}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * 头像兜底：昵称首字色块（圆形）。
 */
export function letterAvatar(text = 'U', color = '#409EFF') {
  const ch = String(text || 'U').trim().charAt(0).toUpperCase() || 'U'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<rect width="120" height="120" rx="60" fill="${color}"/>
<text x="60" y="79" font-size="56" font-family="-apple-system,Helvetica,Arial,sans-serif"
 fill="#ffffff" text-anchor="middle">${ch}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
