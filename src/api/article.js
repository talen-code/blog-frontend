import request from './request'

/**
 * 文章相关接口
 * 对应后端：com.blog.controller.ArticleController
 */

/**
 * 前台文章分页列表（只返回已发布文章）
 * GET /api/articles?page=1&size=6&categoryId=&tagId=&keyword=
 *
 * @param {{page?:number,size?:number,categoryId?:number|string,tagId?:number|string,keyword?:string}} params
 * @returns 成功时 data 为 PageResult<ArticleVO>（列表里的 content 为 null）
 */
export function getArticlePage(params) {
  // 过滤掉空字符串 / undefined，避免后端把 "" 当成有效筛选条件
  return request.get('/articles', { params: cleanParams(params) })
}

/**
 * 热门文章 Top N（按浏览量倒序）
 * GET /api/articles/hot?limit=5
 */
export function getHotArticles(limit = 5) {
  return request.get('/articles/hot', { params: { limit } })
}

/**
 * 文章详情（含 Markdown 正文，后端会把浏览量 +1）
 * GET /api/articles/{id}
 */
export function getArticleDetail(id) {
  return request.get(`/articles/${id}`)
}

/**
 * 点赞 / 取消点赞（需登录，后端做切换）
 * POST /api/articles/{id}/like
 * @returns 成功时 data 为 ArticleVO，其中 liked 表示当前用户操作后是否已点赞
 */
export function toggleLike(id) {
  return request.post(`/articles/${id}/like`)
}

/* ------------------------- 以下为管理员接口 ------------------------- */

/**
 * 后台文章分页列表（包含草稿）
 * GET /api/admin/articles?page=1&size=10&keyword=&categoryId=&status=
 */
export function getAdminArticlePage(params) {
  return request.get('/admin/articles', { params: cleanParams(params) })
}

/**
 * 后台获取文章详情（含正文，且不会增加浏览量）
 * GET /api/admin/articles/{id}
 */
export function getAdminArticleDetail(id) {
  return request.get(`/admin/articles/${id}`)
}

/**
 * 新增文章（管理员）
 * POST /api/articles
 * @param {Object} data ArticleDTO { title, summary, cover, content, categoryId, tagIds, status, top }
 */
export function createArticle(data) {
  return request.post('/articles', data)
}

/**
 * 修改文章（管理员）
 * PUT /api/articles/{id}
 */
export function updateArticle(id, data) {
  return request.put(`/articles/${id}`, data)
}

/**
 * 删除文章（管理员）
 * DELETE /api/articles/{id}
 */
export function deleteArticle(id) {
  return request.delete(`/articles/${id}`)
}

/**
 * 清理查询参数：把 '' / null / undefined 去掉。
 *
 * 原因：筛选条件为空时如果传 categoryId=''，后端可能把它当作非法参数或
 * 当成一个真实的筛选值，导致查不到数据。
 */
function cleanParams(params = {}) {
  const result = {}
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value !== '' && value !== null && value !== undefined) {
      result[key] = value
    }
  })
  return result
}
