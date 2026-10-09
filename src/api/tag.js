import request from './request'

/**
 * 标签相关接口
 * 对应后端：com.blog.controller.TagController
 */

/**
 * 查询全部标签（前台公开）
 * GET /api/tags
 * @returns 成功时 data 为 TagVO[]，含 color 与 articleCount
 */
export function getTagList() {
  return request.get('/tags')
}

/**
 * 新增标签（管理员）
 * POST /api/tags
 * @param {{name:string, color:string}} data
 */
export function createTag(data) {
  return request.post('/tags', data)
}

/**
 * 修改标签（管理员）
 * PUT /api/tags/{id}
 */
export function updateTag(id, data) {
  return request.put(`/tags/${id}`, data)
}

/**
 * 删除标签（管理员）
 * DELETE /api/tags/{id}
 */
export function deleteTag(id) {
  return request.delete(`/tags/${id}`)
}
