import request from './request'

/**
 * 分类相关接口
 * 对应后端：com.blog.controller.CategoryController
 */

/**
 * 查询全部分类（前台公开）
 * GET /api/categories
 * @returns 成功时 data 为 CategoryVO[]，含 articleCount
 */
export function getCategoryList() {
  return request.get('/categories')
}

/**
 * 新增分类（管理员）
 * POST /api/categories
 * @param {{name:string, description:string, sort:number}} data
 */
export function createCategory(data) {
  return request.post('/categories', data)
}

/**
 * 修改分类（管理员）
 * PUT /api/categories/{id}
 */
export function updateCategory(id, data) {
  return request.put(`/categories/${id}`, data)
}

/**
 * 删除分类（管理员）
 * DELETE /api/categories/{id}
 */
export function deleteCategory(id) {
  return request.delete(`/categories/${id}`)
}
