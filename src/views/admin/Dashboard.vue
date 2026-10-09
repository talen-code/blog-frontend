<script setup>
/**
 * 后台数据统计面板
 *
 * 数据来自 GET /api/admin/statistics/overview：
 * - 顶部数字卡片：用户数、文章数、评论数、总浏览量
 * - categoryStats：各分类文章数占比（用 el-progress 画横条）
 * - latestArticles：最新文章表格
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { getStatisticsOverview } from '@/api/statistics'
import { formatNumber, formatTime } from '@/utils/format'

const router = useRouter()

const loading = ref(false)

/** StatisticsVO 原始数据 */
const stats = ref({
  userCount: 0,
  articleCount: 0,
  publishedCount: 0,
  draftCount: 0,
  categoryCount: 0,
  tagCount: 0,
  commentCount: 0,
  totalViews: 0,
  totalLikes: 0,
  categoryStats: [],
  latestArticles: []
})

/** 顶部数字卡片配置（与 stats 字段一一对应） */
const cards = computed(() => [
  {
    key: 'userCount',
    label: '注册用户',
    value: stats.value.userCount,
    icon: 'UserFilled',
    color: '#409EFF',
    bg: 'rgba(64, 158, 255, 0.12)',
    suffix: '人'
  },
  {
    key: 'articleCount',
    label: '文章总数',
    value: stats.value.articleCount,
    icon: 'Document',
    color: '#67C23A',
    bg: 'rgba(103, 194, 58, 0.12)',
    suffix: `篇（已发布 ${stats.value.publishedCount} / 草稿 ${stats.value.draftCount}）`
  },
  {
    key: 'commentCount',
    label: '评论总数',
    value: stats.value.commentCount,
    icon: 'ChatDotRound',
    color: '#E6A23C',
    bg: 'rgba(230, 162, 60, 0.12)',
    suffix: '条'
  },
  {
    key: 'totalViews',
    label: '总浏览量',
    value: stats.value.totalViews,
    icon: 'View',
    color: '#F56C6C',
    bg: 'rgba(245, 108, 108, 0.12)',
    suffix: `次（点赞 ${stats.value.totalLikes}）`
  }
])

/** 分类占比数据：计算百分比，供 el-progress 使用 */
const categoryStats = computed(() => {
  const list = stats.value.categoryStats || []
  const total = list.reduce((sum, item) => sum + (item.value || 0), 0)
  return list.map((item) => ({
    name: item.name,
    value: item.value || 0,
    percent: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0
  }))
})

/** 加载统计数据 */
async function loadStats() {
  loading.value = true
  try {
    const { data } = await getStatisticsOverview()
    if (data) {
      stats.value = { ...stats.value, ...data }
    }
  } catch (e) {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

/** 跳转到文章编辑页 */
function goEdit(row) {
  router.push(`/admin/article/edit/${row.id}`)
}

onMounted(loadStats)
</script>

<template>
  <div v-loading="loading" class="dashboard">
    <!-- ==================== 数字卡片 ==================== -->
    <div class="stat-cards">
      <div
        v-for="card in cards"
        :key="card.key"
        class="stat-card"
      >
        <div class="stat-icon" :style="{ color: card.color, background: card.bg }">
          <el-icon :size="26">
            <component :is="card.icon" />
          </el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-value">{{ formatNumber(card.value) }}</span>
          <span class="stat-suffix">{{ card.suffix }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== 次级指标 ==================== -->
    <div class="sub-stats">
      <div class="sub-item">
        <span class="sub-label">已发布</span>
        <span class="sub-value">{{ stats.publishedCount }}</span>
      </div>
      <el-divider direction="vertical" />
      <div class="sub-item">
        <span class="sub-label">草稿</span>
        <span class="sub-value">{{ stats.draftCount }}</span>
      </div>
      <el-divider direction="vertical" />
      <div class="sub-item">
        <span class="sub-label">分类</span>
        <span class="sub-value">{{ stats.categoryCount }}</span>
      </div>
      <el-divider direction="vertical" />
      <div class="sub-item">
        <span class="sub-label">标签</span>
        <span class="sub-value">{{ stats.tagCount }}</span>
      </div>
      <el-divider direction="vertical" />
      <div class="sub-item">
        <span class="sub-label">总点赞</span>
        <span class="sub-value">{{ stats.totalLikes }}</span>
      </div>
      <div class="sub-refresh">
        <el-button @click="loadStats">
          <el-icon><Refresh /></el-icon> 刷新数据
        </el-button>
      </div>
    </div>

    <!-- ==================== 图表区 ==================== -->
    <div class="chart-row">
      <!-- 分类占比 -->
      <div class="panel">
        <h3 class="section-title">分类文章占比</h3>
        <div v-if="categoryStats.length" class="category-progress">
          <div v-for="item in categoryStats" :key="item.name" class="progress-item">
            <div class="progress-head">
              <span class="progress-name">{{ item.name }}</span>
              <span class="progress-value">{{ item.value }} 篇 / {{ item.percent }}%</span>
            </div>
            <el-progress
              :percentage="item.percent"
              :stroke-width="10"
              :show-text="false"
              :color="'#409EFF'"
            />
          </div>
        </div>
        <EmptyState v-else description="暂无分类数据" :image-size="80" />
      </div>

      <!-- 快捷入口 -->
      <div class="panel">
        <h3 class="section-title">快捷操作</h3>
        <div class="quick-actions">
          <el-button type="primary" @click="router.push('/admin/article/create')">
            <el-icon><EditPen /></el-icon> 写新文章
          </el-button>
          <el-button @click="router.push('/admin/categories')">
            <el-icon><Collection /></el-icon> 管理分类
          </el-button>
          <el-button @click="router.push('/admin/tags')">
            <el-icon><PriceTag /></el-icon> 管理标签
          </el-button>
          <el-button @click="router.push('/admin/comments')">
            <el-icon><ChatDotRound /></el-icon> 审核评论
          </el-button>
          <el-button @click="router.push('/admin/users')">
            <el-icon><UserFilled /></el-icon> 管理用户
          </el-button>
          <el-button @click="router.push('/')">
            <el-icon><HomeFilled /></el-icon> 查看前台
          </el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 最新文章 ==================== -->
    <div class="panel">
      <h3 class="section-title">最新文章</h3>
      <el-table :data="stats.latestArticles || []" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="views" label="浏览" width="80" />
        <el-table-column prop="likes" label="点赞" width="80" />
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无文章" :image-size="80" />
        </template>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 数字卡片 ---------- */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
  transition: all 0.25s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--blog-shadow-hover);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--blog-text);
}

.stat-suffix {
  font-size: 12px;
  color: var(--blog-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 次级指标 ---------- */
.sub-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.sub-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.sub-label {
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.sub-value {
  font-size: 17px;
  font-weight: 600;
  color: var(--blog-primary);
}

.sub-refresh {
  margin-left: auto;
}

/* ---------- 面板 ---------- */
.chart-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  padding: 20px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.category-progress {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
}

.progress-name {
  color: var(--blog-text);
  font-weight: 500;
}

.progress-value {
  color: var(--blog-text-secondary);
}

/* ---------- 快捷操作 ---------- */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-actions .el-button {
  margin-left: 0;
}

@media (max-width: 992px) {
  .chart-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
