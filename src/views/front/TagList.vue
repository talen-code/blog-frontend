<script setup>
/**
 * 标签云页面
 *
 * 标签字号根据文章数量动态变化，形成「云」的视觉效果。
 * 点击标签跳转首页并带上 tagId 筛选。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { getTagList } from '@/api/tag'

const router = useRouter()

const loading = ref(false)
const tags = ref([])

/** 标签中的最大文章数，用于计算字号比例 */
const maxCount = computed(() => {
  const counts = tags.value.map((t) => t.articleCount || 0)
  return counts.length ? Math.max(...counts, 1) : 1
})

/**
 * 根据文章数计算标签字号：14px ~ 26px。
 * 使用对数缩放，避免个别超大标签把其他标签压得过小。
 */
function tagFontSize(tag) {
  const count = tag.articleCount || 0
  const ratio = Math.log(count + 1) / Math.log(maxCount.value + 1)
  return `${14 + ratio * 12}px`
}

/** 加载标签 */
async function loadTags() {
  loading.value = true
  try {
    const { data } = await getTagList()
    tags.value = data || []
  } catch (e) {
    tags.value = []
  } finally {
    loading.value = false
  }
}

/** 点击标签 -> 首页筛选 */
function goTag(tag) {
  router.push({ path: '/', query: { tagId: tag.id } })
}

onMounted(loadTags)
</script>

<template>
  <div class="tag-page blog-container blog-main">
    <div class="page-header">
      <h1 class="page-title">文章标签</h1>
      <p class="page-desc">共 {{ tags.length }} 个标签，字号越大表示文章越多</p>
    </div>

    <div v-loading="loading" class="tag-cloud blog-card">
      <span
        v-for="tag in tags"
        :key="tag.id"
        class="cloud-tag"
        :style="{
          color: tag.color || '#409EFF',
          fontSize: tagFontSize(tag),
          backgroundColor: `${tag.color || '#409EFF'}14`
        }"
        @click="goTag(tag)"
      >
        {{ tag.name }}
        <sub class="cloud-count">{{ tag.articleCount || 0 }}</sub>
      </span>
    </div>

    <EmptyState v-if="!loading && !tags.length" description="还没有任何标签" />
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

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 28px 24px;
  min-height: 160px;
}

.tag-cloud:hover {
  transform: none;
  box-shadow: var(--blog-shadow);
}

.cloud-tag {
  display: inline-flex;
  align-items: flex-start;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
  font-weight: 500;
}

.cloud-tag:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cloud-count {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
