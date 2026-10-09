<script setup>
/**
 * 前台首页
 *
 * 功能：
 * - 文章卡片网格（响应式 1~2 列，配合右侧栏）
 * - 分类筛选（el-radio-group 按钮组）
 * - 标签筛选（彩色标签，可点选/取消）
 * - 关键词搜索
 * - el-pagination 分页
 * - 右侧热门文章 Top5
 *
 * 状态设计（重点）：
 * 以「地址栏 query」为唯一数据源，而不是本地维护一份筛选状态。
 * 好处：
 * 1. 刷新页面、复制链接分享后筛选条件不丢失；
 * 2. 从分类页/标签页跳过来时（/?categoryId=3）首页能自动识别；
 * 3. 只需维护一条数据流：改筛选 -> push 路由 -> watch 到变化 -> 请求接口。
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticleCard from '@/components/ArticleCard.vue'
import TagChip from '@/components/TagChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getArticlePage, getHotArticles } from '@/api/article'
import { getCategoryList } from '@/api/category'
import { getTagList } from '@/api/tag'
import { compactNumber, fromNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/* ==================== 列表状态 ==================== */

/** 文章列表加载中 */
const loading = ref(false)
/** 当前页文章 */
const list = ref([])
/** 总条数 */
const total = ref(0)
/** 每页条数（需求要求首页展示 6 条） */
const pageSize = ref(6)

/* ==================== 筛选条件（与地址栏同步） ==================== */

const query = reactive({
  page: 1,
  categoryId: '',
  tagId: '',
  keyword: ''
})

/* ==================== 侧边数据 ==================== */

const categories = ref([])
const tags = ref([])
const hotList = ref([])

/** 当前选中分类名，用于标题展示 */
const currentCategoryName = computed(() => {
  const hit = categories.value.find((c) => String(c.id) === String(query.categoryId))
  return hit ? hit.name : ''
})

/** 当前选中标签对象 */
const currentTag = computed(() =>
  tags.value.find((t) => String(t.id) === String(query.tagId))
)

/** 是否存在任意筛选条件（用于展示「清空筛选」按钮） */
const hasFilter = computed(
  () => !!(query.categoryId || query.tagId || query.keyword)
)

/**
 * 把地址栏 query 同步到本地 query 对象。
 * 注意 page 要做数字转换，并兜底为 1。
 */
function applyRouteQuery() {
  query.page = Number(route.query.page) > 0 ? Number(route.query.page) : 1
  query.categoryId = route.query.categoryId || ''
  query.tagId = route.query.tagId || ''
  query.keyword = route.query.keyword || ''
}

/**
 * 修改筛选条件并写回地址栏。
 * 关键点：任何筛选条件变化都要把 page 重置为 1，
 * 否则可能出现「总页数只有 2 页，但当前停在第 5 页」导致空白列表。
 *
 * @param {Object} patch 需要变更的字段
 */
function updateQuery(patch) {
  const next = {
    page: 1,
    categoryId: query.categoryId,
    tagId: query.tagId,
    keyword: query.keyword,
    ...patch
  }

  const q = {}
  // 只把「有意义」的参数写进地址栏，保证 URL 干净
  if (next.page && Number(next.page) > 1) q.page = String(next.page)
  if (next.categoryId) q.categoryId = String(next.categoryId)
  if (next.tagId) q.tagId = String(next.tagId)
  if (next.keyword) q.keyword = String(next.keyword)

  router.push({ path: '/', query: q })
}

/**
 * 监听地址栏变化 -> 重新拉取列表。
 * 用 fullPath 作为监听源：任何 query 变化都会得到一个全新字符串，触发最可靠。
 */
watch(
  () => route.fullPath,
  () => {
    applyRouteQuery()
    loadList()
  },
  { immediate: true }
)

/** 加载文章分页数据 */
async function loadList() {
  loading.value = true
  try {
    const { data } = await getArticlePage({
      page: query.page,
      size: pageSize.value,
      categoryId: query.categoryId,
      tagId: query.tagId,
      keyword: query.keyword
    })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    // 错误提示已由 axios 响应拦截器统一处理，这里只需要保证列表不残留旧数据
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 加载分类、标签、热门文章（只在首次进入时请求一次） */
async function loadSideData() {
  try {
    const [categoryRes, tagRes, hotRes] = await Promise.all([
      getCategoryList(),
      getTagList(),
      getHotArticles(5)
    ])
    categories.value = categoryRes.data || []
    tags.value = tagRes.data || []
    hotList.value = hotRes.data || []
  } catch (e) {
    console.warn('[Home] 侧边数据加载失败', e)
  }
}

/** 分页切换 */
function handlePageChange(page) {
  updateQuery({ page })
  // 翻页后回到顶部，避免用户以为没反应
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 点击标签：再次点击同一个标签表示取消筛选 */
function handleTagClick(tag) {
  const next = String(query.tagId) === String(tag.id) ? '' : String(tag.id)
  updateQuery({ tagId: next })
}

/** 清空所有筛选条件 */
function clearFilter() {
  router.push({ path: '/' })
}

onMounted(loadSideData)
</script>

<template>
  <div class="home blog-container blog-main">
    <!-- ==================== 筛选区 ==================== -->
    <section class="filter-card blog-card">
      <!-- 分类筛选 -->
      <div class="filter-row">
        <span class="filter-label">分类：</span>
        <el-radio-group
          :model-value="query.categoryId"
          size="default"
          @update:model-value="(val) => updateQuery({ categoryId: val })"
        >
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button v-for="item in categories" :key="item.id" :value="String(item.id)">
            {{ item.name }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 标签筛选 -->
      <div v-if="tags.length" class="filter-row">
        <span class="filter-label">标签：</span>
        <div class="tag-list">
          <TagChip
            v-for="tag in tags"
            :key="tag.id"
            :tag="tag"
            :size="'default'"
            clickable
            :class="{ 'is-active': String(query.tagId) === String(tag.id) }"
            @click="handleTagClick(tag)"
          />
        </div>
      </div>

      <!-- 当前筛选状态提示 -->
      <div v-if="hasFilter" class="filter-row filter-active">
        <el-icon><Filter /></el-icon>
        <span>
          当前筛选：
          <b v-if="query.keyword">关键词「{{ query.keyword }}」</b>
          <b v-if="currentCategoryName">分类「{{ currentCategoryName }}」</b>
          <b v-if="currentTag">标签「{{ currentTag.name }}」</b>
        </span>
        <el-button type="primary" link @click="clearFilter">清空筛选</el-button>
      </div>
    </section>

    <!-- ==================== 主体：文章列表 + 侧边栏 ==================== -->
    <div class="home-body">
      <!-- 左侧文章列表 -->
      <div class="home-list">
        <div class="list-header">
          <h2 class="section-title">
            {{ currentCategoryName || (currentTag ? `# ${currentTag.name}` : '最新文章') }}
          </h2>
          <span class="list-count">共 {{ total }} 篇</span>
        </div>

        <!-- 加载骨架屏 -->
        <div v-if="loading" class="grid">
          <div v-for="n in 4" :key="n" class="blog-card skeleton-card">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="image" style="width: 100%; height: 180px" />
                <div style="padding: 14px">
                  <el-skeleton-item variant="h3" style="width: 70%" />
                  <el-skeleton-item variant="text" style="margin-top: 10px" />
                  <el-skeleton-item variant="text" style="width: 50%; margin-top: 6px" />
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>

        <!-- 文章网格 -->
        <div v-else-if="list.length" class="grid">
          <ArticleCard v-for="item in list" :key="item.id" :article="item" />
        </div>

        <!-- 空状态 -->
        <EmptyState v-else description="没有找到符合条件的文章">
          <el-button v-if="hasFilter" type="primary" @click="clearFilter">
            清空筛选条件
          </el-button>
        </EmptyState>

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pagination-wrap">
          <el-pagination
            background
            layout="prev, pager, next, jumper, total"
            :total="total"
            :page-size="pageSize"
            :current-page="query.page"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 右侧侧边栏 -->
      <aside class="home-aside">
        <!-- 热门文章 -->
        <div class="aside-card blog-card">
          <h3 class="section-title">热门文章</h3>
          <ul v-if="hotList.length" class="hot-list">
            <li
              v-for="(item, index) in hotList"
              :key="item.id"
              class="hot-item"
              @click="router.push(`/article/${item.id}`)"
            >
              <span class="hot-index" :class="{ 'is-top': index < 3 }">{{ index + 1 }}</span>
              <div class="hot-content">
                <p class="hot-title text-clamp-2">{{ item.title }}</p>
                <span class="hot-meta">
                  <el-icon><View /></el-icon>
                  {{ compactNumber(item.views) }}
                  <span class="dot">·</span>
                  {{ fromNow(item.createTime) }}
                </span>
              </div>
            </li>
          </ul>
          <EmptyState v-else description="暂无热门文章" :image-size="70" />
        </div>

        <!-- 分类速览 -->
        <div class="aside-card blog-card">
          <h3 class="section-title">文章分类</h3>
          <ul class="category-list">
            <li
              v-for="item in categories"
              :key="item.id"
              class="category-item"
              :class="{ 'is-active': String(query.categoryId) === String(item.id) }"
              @click="updateQuery({ categoryId: String(item.id) })"
            >
              <span class="category-name">
                <el-icon><Folder /></el-icon>
                {{ item.name }}
              </span>
              <span class="category-count">{{ item.articleCount || 0 }}</span>
            </li>
          </ul>
          <EmptyState v-if="!categories.length" description="暂无分类" :image-size="70" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ---------- 筛选卡片 ---------- */
.filter-card {
  padding: 16px 20px;
  margin-bottom: 20px;
}

.filter-card:hover {
  /* 筛选区不需要悬停上浮效果 */
  transform: none;
  box-shadow: var(--blog-shadow);
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
}

.filter-row + .filter-row {
  border-top: 1px dashed var(--blog-border);
}

.filter-label {
  flex-shrink: 0;
  padding-top: 6px;
  font-size: 14px;
  color: var(--blog-text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;
}

.tag-list :deep(.is-active) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.35);
}

.filter-active {
  align-items: center;
  font-size: 13px;
  color: var(--blog-text-regular);
}

.filter-active b {
  color: var(--blog-primary);
  font-weight: 600;
}

/* ---------- 主体布局 ---------- */
.home-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}

.home-list {
  min-width: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-header .section-title {
  margin-bottom: 0;
}

.list-count {
  font-size: 13px;
  color: var(--blog-text-secondary);
}

/* 文章网格：宽屏 2 列，窄屏 1 列 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.skeleton-card {
  overflow: hidden;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

/* ---------- 侧边栏 ---------- */
.home-aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.aside-card {
  padding: 16px;
}

.aside-card:hover {
  transform: none;
  box-shadow: var(--blog-shadow);
}

/* 热门文章 */
.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hot-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--blog-border);
  cursor: pointer;
}

.hot-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.hot-item:hover .hot-title {
  color: var(--blog-primary);
}

.hot-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
  background: #c0c4cc;
}

.hot-index.is-top {
  background: #f56c6c;
}

.hot-content {
  min-width: 0;
  flex: 1;
}

.hot-title {
  margin: 0 0 4px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--blog-text);
}

.hot-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.dot {
  margin: 0 2px;
}

/* 分类速览 */
.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--blog-text-regular);
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover,
.category-item.is-active {
  background: rgba(64, 158, 255, 0.1);
  color: var(--blog-primary);
}

.category-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.category-count {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

/* ---------- 响应式 ---------- */
@media (max-width: 992px) {
  .home-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-aside {
    order: 2;
  }
}

@media (max-width: 768px) {
  .filter-card {
    padding: 12px;
  }

  .filter-label {
    padding-top: 0;
  }

  .filter-row {
    flex-direction: column;
    gap: 6px;
  }

  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
