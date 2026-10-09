import request from './request'

/**
 * 评论相关接口
 * 对应后端：com.blog.controller.CommentController
 */

/**
 * 查询某篇文章的评论（两级树结构，顶级评论的 children 里是回复）
 * GET /api/comments?articleId=1
 *
 * @param {number|string} articleId 文章 ID
 * @returns 成功时 data 为 CommentVO[]（是树，不是分页）
 */
export function getCommentList(articleId) {
  return request.get('/comments', { params: { articleId } })
}

/**
 * 发表评论 / 回复评论（需登录）
 * POST /api/comments
 *
 * @param {{articleId:number, content:string, parentId?:number|null}} data
 *        parentId 为 null 表示顶级评论，否则表示回复某条评论
 */
export function createComment(data) {
  return request.post('/comments', data)
}

/**
 * 删除评论（本人或管理员）
 * DELETE /api/comments/{id}
 */
export function deleteComment(id) {
  return request.delete(`/comments/${id}`)
}

/**
 * 后台评论分页管理（管理员）
 * GET /api/admin/comments?page=1&size=10&keyword=
 */
export function getAdminCommentPage(params) {
  const query = {}
  Object.keys(params || {}).forEach((key) => {
    const value = params[key]
    if (value !== '' && value !== null && value !== undefined) {
      query[key] = value
    }
  })
  return request.get('/admin/comments', { params: query })
}
