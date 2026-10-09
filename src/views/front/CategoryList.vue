<script setup>
/**
 * 文章分类列表页
 *
 * 展示全部分类及其文章数，点击某个分类跳转首页并带上 categoryId 筛选。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { getCategoryList } from '@/api/category'

const router = useRouter()

const loading = ref(false)
const categories = ref([])

/** 加载分类列表 */
async function loadCategories() {
  loading.value = true
  try {
    const { data } = await getCategoryList()
    categories.value = data || []
  } catch (e) {
    categories.value = []
  } finally {
    loading.value = false
  }
}

/** 点击分类 -> 首页筛选 */
function goCategory(category) {
  router.push({ path: '/', query: { categoryId: category.id } })
}

onMounted(loadCategories)
</script>

<template>
  <div class="category-page blog-container blog-main">
    <div class="page-header">
      <h1 class="page-title">文章分类</h1>
      <p class="page-desc">按主题浏览全部文章，共 {{ categories.length }} 个分类</p>
    </div>

    <div v-loading="loading" class="category-grid">
      <div
        v-for="item in categories"
        :key="item.id"
        class="category-card blog-card"
        @click="goCategory(item)"
      >
        <div class="category-icon">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="category-info">
          <h3 class="category-name">{{ item.name }}</h3>
          <p class="category-desc text-clamp-2">{{ item.description || '暂无描述' }}</p>
        </div>
        <div class="category-count">
          <span class="count-num">{{ item.articleCount || 0 }}</span>
          <span class="count-label">篇文章</span>
        </div>
      </div>
    </div>

    <EmptyState v-if="!loading && !categories.length" description="还没有任何分类" />
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--blog-text-secondary);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  cursor: pointer;
}

.category-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 24px;
  color: var(--blog-primary);
  background: rgba(64, 158, 255, 0.1);
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.category-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--blog-text-secondary);
}

.category-count {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.count-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--blog-primary);
}

.count-label {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
