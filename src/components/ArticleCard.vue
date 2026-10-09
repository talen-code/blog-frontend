<script setup>
/**
 * 文章卡片组件
 *
 * 用于首页网格、分类页、标签页的文章列表展示。
 * 展示内容：封面(16:9)、分类、标题、简介、标签、作者头像+昵称、发布时间、浏览量、点赞数、评论数。
 *
 * 注意：列表接口返回的 ArticleVO 里 content 为 null，卡片不需要正文。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import TagChip from './TagChip.vue'
import { fromNow, compactNumber, letterCover, letterAvatar } from '@/utils/format'

const props = defineProps({
  /** ArticleVO */
  article: { type: Object, required: true }
})

const router = useRouter()

/** 封面加载失败时置为 true，改用首字母色块兜底，避免破图（组件内部状态，无需父组件传参） */
const coverBroken = ref(false)

/** 最终展示的封面地址 */
const coverSrc = computed(() => {
  const cover = props.article?.cover
  if (!cover || coverBroken.value) {
    return letterCover(props.article?.title || 'B')
  }
  return cover
})

/** 作者头像（空则用首字母色块） */
const avatarSrc = computed(() => {
  const avatar = props.article?.authorAvatar
  return avatar || letterAvatar(props.article?.authorName || 'U')
})

/** 标签列表，兼容后端可能只返回 tagIds 的情况 */
const tags = computed(() => props.article?.tags || [])

/** 相对时间，如「3 天前」 */
const publishTime = computed(() => fromNow(props.article?.createTime))

/** 跳转到文章详情 */
function goDetail() {
  router.push(`/article/${props.article.id}`)
}

/** 点击分类：跳首页并带上 categoryId 筛选条件 */
function goCategory(event) {
  event.stopPropagation()
  if (props.article?.categoryId) {
    router.push({ path: '/', query: { categoryId: props.article.categoryId } })
  }
}

/** 点击标签：跳首页并带上 tagId 筛选条件 */
function goTag(tag, event) {
  event.stopPropagation()
  if (tag?.id) {
    router.push({ path: '/', query: { tagId: tag.id } })
  }
}

/** 封面加载失败 -> 换成占位图 */
function onCoverError() {
  coverBroken.value = true
}
</script>

<template>
  <article class="article-card blog-card" @click="goDetail">
    <!-- 封面：固定 16:9，object-fit: cover 保证不变形 -->
    <div class="card-cover">
      <img :src="coverSrc" :alt="article.title" loading="lazy" @error="onCoverError" />
      <!-- 置顶标记 -->
      <span v-if="article.top === 1" class="top-flag">置顶</span>
      <!-- 草稿标记（后台预览时可能用到） -->
      <span v-if="article.status === 0" class="draft-flag">草稿</span>
    </div>

    <div class="card-body">
      <!-- 分类 -->
      <div class="card-meta-top">
        <span v-if="article.categoryName" class="category-link" @click="goCategory">
          <el-icon><Collection /></el-icon>
          {{ article.categoryName }}
        </span>
      </div>

      <!-- 标题 -->
      <h3 class="card-title text-clamp-2" :title="article.title">{{ article.title }}</h3>

      <!-- 简介 -->
      <p class="card-summary text-clamp-2">{{ article.summary || '暂无简介' }}</p>

      <!-- 标签 -->
      <div v-if="tags.length" class="card-tags">
        <TagChip
          v-for="tag in tags.slice(0, 3)"
          :key="tag.id"
          :tag="tag"
          clickable
          @click="goTag(tag, $event)"
        />
      </div>

      <!-- 底部信息栏：作者 / 时间 / 数据 -->
      <div class="card-footer">
        <div class="author">
          <img class="avatar" :src="avatarSrc" :alt="article.authorName" />
          <span class="author-name">{{ article.authorName || '匿名' }}</span>
        </div>

        <div class="stats">
          <span class="stat-item" :title="`发布时间：${article.createTime || ''}`">
            <el-icon><Clock /></el-icon>
            {{ publishTime }}
          </span>
          <span class="stat-item" :title="`浏览量 ${article.views || 0}`">
            <el-icon><View /></el-icon>
            {{ compactNumber(article.views) }}
          </span>
          <span class="stat-item" :title="`点赞 ${article.likes || 0}`">
            <el-icon><Star /></el-icon>
            {{ compactNumber(article.likes) }}
          </span>
          <span class="stat-item" :title="`评论 ${article.commentCount || 0}`">
            <el-icon><ChatDotRound /></el-icon>
            {{ compactNumber(article.commentCount) }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.article-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  height: 100%;
}

/* ---------- 封面 ---------- */
.card-cover {
  position: relative;
  width: 100%;
  /* 固定 16:9 比例，避免不同尺寸封面撑出参差不齐的高度 */
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f0f2f5;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.article-card:hover .card-cover img {
  transform: scale(1.06);
}

.top-flag,
.draft-flag {
  position: absolute;
  top: 10px;
  padding: 2px 8px;
  font-size: 12px;
  color: #fff;
  border-radius: 4px;
}

.top-flag {
  left: 10px;
  background: #f56c6c;
}

.draft-flag {
  right: 10px;
  background: #e6a23c;
}

/* ---------- 正文 ---------- */
.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 14px 16px 16px;
}

.card-meta-top {
  min-height: 20px;
  margin-bottom: 6px;
}

.category-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--blog-primary);
}

.category-link:hover {
  text-decoration: underline;
}

.card-title {
  margin: 0 0 8px;
  font-size: 17px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--blog-text);
  min-height: 49px; /* 两行标题高度，保证卡片对齐 */
}

.article-card:hover .card-title {
  color: var(--blog-primary);
}

.card-summary {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--blog-text-secondary);
  min-height: 42px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

/* ---------- 底部信息 ---------- */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--blog-border);
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--blog-bg);
  flex-shrink: 0;
}

.author-name {
  font-size: 13px;
  color: var(--blog-text-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 90px;
}

.stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
</style>
