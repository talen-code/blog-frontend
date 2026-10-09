import request from './request'

/**
 * 数据统计接口
 * 对应后端：com.blog.controller.StatisticsController
 */

/**
 * 后台统计面板总览（管理员）
 * GET /api/admin/statistics/overview
 *
 * @returns 成功时 data 为 StatisticsVO：
 *   {
 *     userCount, articleCount, publishedCount, draftCount,
 *     categoryCount, tagCount, commentCount, totalViews, totalLikes,
 *     categoryStats: [{ name, value }],   // 各分类文章数，用于画占比条
 *     latestArticles: ArticleVO[]         // 最新文章，用于表格
 *   }
 */
export function getStatisticsOverview() {
  return request.get('/admin/statistics/overview')
}
