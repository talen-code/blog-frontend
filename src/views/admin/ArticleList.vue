<script setup>
/**
 * 后台文章管理
 *
 * 功能：
 * - 关键词搜索 + 状态筛选（全部/已发布/草稿）+ 分类筛选
 * - 表格展示（含草稿），支持发布状态开关、编辑、删除
 * - 分页
 *
 * 重要实现细节（发布状态开关）：
 * 列表接口返回的 ArticleVO 里 content 为 null，
 * 而 PUT /api/articles/{id} 接收的是完整 ArticleDTO（含 content）。
 * 如果直接拿列表行数据去 PUT，会把正文覆盖成空！
 * 所以这里先 GET /api/admin/articles/{id} 拿到完整正文，再 PUT 提交。
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import {
  getAdminArticlePage,
  getAdminArticleDetail,
  updateArticle,
  deleteArticle
} from '@/api/article'
import { getCategoryList } from '@/api/category'
import { formatTime, compactNumber, letterCover } from '@/utils/format'

const router = useRouter()

/* ==================== 查询条件 ==================== */
const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
  categoryId: '',
  status: ''
})

/* ==================== 列表数据 ==================== */
const loading = ref(false)
const list = ref([])
const total = ref(0)
const categories = ref([])
/** 单个文章正在切换状态（用于按钮 loading） */
const switchingId = ref(null)

/** 加载列表 */
async function loadList() {
  loading.value = true
  try {
    const { data } = await getAdminArticlePage({ ...query })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 加载分类下拉数据 */
async function loadCategories() {
  try {
    const { data } = await getCategoryList()
    categories.value = data || []
  } catch (e) {
    categories.value = []
  }
}

/** 搜索：关键词变化时重置到第一页 */
function handleSearch() {
  query.page = 1
  loadList()
}

/** 筛选条件变化（状态下拉、分类下拉） */
function handleFilterChange() {
  query.page = 1
  loadList()
}

/** 重置筛选 */
function resetFilter() {
  query.keyword = ''
  query.categoryId = ''
  query.status = ''
  query.page = 1
  loadList()
}

/** 分页切换 */
function handlePageChange(page) {
  query.page = page
  loadList()
}

/**
 * 切换发布状态。
 * 用「先查详情再提交」的两步法，避免正文被 null 覆盖。
 *
 * @param {Object} row 表格行（ArticleVO）
 */
async function handleStatusChange(row) {
  const nextStatus = row.status === 1 ? 0 : 1
  switchingId.value = row.id
  try {
    // 第一步：拿完整的文章详情（含 content）
    const detailRes = await getAdminArticleDetail(row.id)
    const detail = detailRes.data || {}

    // 第二步：用完整数据提交状态变更
    await updateArticle(row.id, {
      title: detail.title,
      summary: detail.summary,
      cover: detail.cover,
      content: detail.content,
      categoryId: detail.categoryId,
      tagIds: detail.tagIds || [],
      status: nextStatus,
      top: detail.top ?? 0
    })

    // 本地同步，避免整表刷新（体验更顺滑）
    row.status = nextStatus
    ElMessage.success(nextStatus === 1 ? '已发布' : '已转为草稿')
  } catch (e) {
    // 失败时不做任何本地修改，开关会自动回到原状态（v-model 未被改动）
    console.warn('[ArticleList] 切换状态失败', e)
  } finally {
    switchingId.value = null
  }
}

/** 删除文章 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文章《${row.title}》吗？删除后不可恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }

  try {
    await deleteArticle(row.id)
    ElMessage.success('删除成功')
    // 如果当前页删空了，自动回退一页
    if (list.value.length === 1 && query.page > 1) {
      query.page -= 1
    }
    loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

/** 跳转编辑页 */
function goEdit(row) {
  router.push(`/admin/article/edit/${row.id}`)
}

/** 跳转新增页 */
function goCreate() {
  router.push('/admin/article/create')
}

/** 封面加载失败兜底 */
function onCoverError(event, row) {
  event.target.src = letterCover(row.title || 'B')
}

/** 前台预览 */
function goPreview(row) {
  const url = router.resolve(`/article/${row.id}`).href
  window.open(url, '_blank')
}

onMounted(() => {
  loadCategories()
  loadList()
})
</script>

<template>
  <div class="article-manage">
    <!-- ==================== 工具栏 ==================== -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="query.keyword"
          placeholder="搜索文章标题"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="query.status"
          placeholder="全部状态"
          clearable
          style="width: 130px"
          @change="handleFilterChange"
        >
          <el-option label="已发布" :value="1" />
          <el-option label="草稿" :value="0" />
        </el-select>

        <el-select
          v-model="query.categoryId"
          placeholder="全部分类"
          clearable
          style="width: 150px"
          @change="handleFilterChange"
        >
          <el-option
            v-for="item in categories"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
        <el-button @click="resetFilter">
          <el-icon><RefreshLeft /></el-icon> 重置
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 写文章
        </el-button>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <div class="table-wrap">
      <el-table v-loading="loading" :data="list" stripe style="width: 100%">
        <el-table-column label="封面" width="110">
          <template #default="{ row }">
            <img
              class="table-cover"
              :src="row.cover || letterCover(row.title)"
              :alt="row.title"
              @error="onCoverError($event, row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="标题" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <el-tag v-if="row.top === 1" type="danger" size="small" effect="plain">置顶</el-tag>
              <span class="title-text">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="categoryName" label="分类" width="120">
          <template #default="{ row }">
            <span>{{ row.categoryName || '未分类' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="标签" width="180">
          <template #default="{ row }">
            <div class="tag-cell">
              <el-tag
                v-for="tag in (row.tags || []).slice(0, 2)"
                :key="tag.id"
                size="small"
                effect="plain"
                :style="{ color: tag.color, borderColor: tag.color }"
              >
                {{ tag.name }}
              </el-tag>
              <span v-if="(row.tags || []).length > 2" class="tag-more">
                +{{ row.tags.length - 2 }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="switchingId === row.id"
              inline-prompt
              active-text="发布"
              inactive-text="草稿"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="数据" width="150">
          <template #default="{ row }">
            <span class="data-cell">
              <el-icon><View /></el-icon>{{ compactNumber(row.views) }}
              <el-icon><Star /></el-icon>{{ compactNumber(row.likes) }}
              <el-icon><ChatDotRound /></el-icon>{{ compactNumber(row.commentCount) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updateTime || row.createTime) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="goPreview(row)">预览</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <EmptyState description="暂无文章，点击右上角「写文章」开始创作" :image-size="90" />
        </template>
      </el-table>
    </div>

    <!-- ==================== 分页 ==================== -->
    <div v-if="total > query.size" class="pagination-wrap">
      <el-pagination
        background
        layout="prev, pager, next, jumper, total"
        :total="total"
        :page-size="query.size"
        :current-page="query.page"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.article-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- 工具栏 ---------- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left .el-button,
.toolbar-right .el-button {
  margin-left: 0;
}

/* ---------- 表格 ---------- */
.table-wrap {
  padding: 8px 16px 16px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.table-cover {
  width: 84px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: var(--blog-bg);
  display: block;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title-text {
  font-weight: 500;
}

.tag-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.tag-more {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.data-cell {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.data-cell .el-icon {
  margin-left: 6px;
}

.data-cell .el-icon:first-child {
  margin-left: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .toolbar-left {
    width: 100%;
  }

  .toolbar-left :deep(.el-input),
  .toolbar-left :deep(.el-select) {
    width: 100% !important;
  }
}
</style>
