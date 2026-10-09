<script setup>
/**
 * 文章详情页
 *
 * 功能：
 * - MdPreview 渲染 Markdown 正文（自带 markdown-it 与代码高亮）
 * - 展示标题/作者/时间/浏览量/点赞数/分类/标签
 * - 点赞（需登录，后端做点赞/取消切换）
 * - 评论区：两级结构（顶级评论 + 回复），支持发表、回复、删除
 * - 返回顶部
 *
 * 状态流转说明：
 * route.params.id 变化 -> watch 触发 -> 拉取详情 + 拉取评论
 * 点赞成功 -> 用后端返回的最新 ArticleVO 覆盖本地数据（保证 likes/liked 与服务端一致）
 * 评论提交成功 -> 重新拉取评论树 + 本地把文章的评论数 +1
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TagChip from '@/components/TagChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getArticleDetail, toggleLike } from '@/api/article'
import { getCommentList, createComment, deleteComment } from '@/api/comment'
import { isLogin, isAdmin, userStore } from '@/store/user'
import { formatTime, fromNow, compactNumber, letterAvatar } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/* ==================== 文章状态 ==================== */
const loading = ref(true)
const article = ref(null)
const likeLoading = ref(false)

/* ==================== 评论状态 ==================== */
const commentLoading = ref(false)
const comments = ref([])
/** 评论总数（含回复） */
const commentTotal = computed(() => {
  let count = 0
  comments.value.forEach((item) => {
    count += 1 + (item.children?.length || 0)
  })
  return count
})

/** 正在回复的目标评论：null 表示发表顶级评论 */
const replyTarget = ref(null)
/** 评论输入内容 */
const commentContent = ref('')
/** 提交中，防止重复提交 */
const submitting = ref(false)
/** 评论输入框的 DOM 引用，用于点击「回复」后自动聚焦 */
const commentInputRef = ref(null)

/** 作者头像兜底 */
const authorAvatar = computed(
  () => article.value?.authorAvatar || letterAvatar(article.value?.authorName || 'U')
)

/** 文章标签 */
const articleTags = computed(() => article.value?.tags || [])

/**
 * 把后端返回的评论数据统一成「树」结构。
 *
 * 后端约定直接返回两级树（顶级评论的 children 里是回复）。
 * 但为了容错（万一后端返回的是扁平列表），这里做一次判断：
 * 如果所有元素都没有 children 字段，就按 parentId 自己组装成两级树。
 */
function normalizeComments(list) {
  if (!Array.isArray(list)) return []
  const hasChildren = list.some((item) => Array.isArray(item.children))
  if (hasChildren) {
    return list.map((item) => ({ ...item, children: item.children || [] }))
  }

  const roots = []
  const childrenMap = new Map()
  list.forEach((item) => {
    if (item.parentId) {
      if (!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, [])
      childrenMap.get(item.parentId).push(item)
    } else {
      roots.push({ ...item, children: [] })
    }
  })
  roots.forEach((root) => {
    root.children = childrenMap.get(root.id) || []
  })
  return roots
}

/** 加载文章详情 */
async function loadArticle(id) {
  loading.value = true
  try {
    const { data } = await getArticleDetail(id)
    article.value = data
  } catch (e) {
    article.value = null
  } finally {
    loading.value = false
  }
}

/** 加载评论列表 */
async function loadComments(id) {
  commentLoading.value = true
  try {
    const { data } = await getCommentList(id)
    comments.value = normalizeComments(data)
  } catch (e) {
    comments.value = []
  } finally {
    commentLoading.value = false
  }
}

/** 页面初始化 / 路由参数变化时重新加载 */
watch(
  () => route.params.id,
  (id) => {
    if (!id) return
    replyTarget.value = null
    commentContent.value = ''
    loadArticle(id)
    loadComments(id)
  },
  { immediate: true }
)

/**
 * 点赞 / 取消点赞。
 * 未登录时按需求提示「请先登录」并跳转登录页（带 redirect 回跳）。
 */
async function handleLike() {
  if (!isLogin.value) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  if (likeLoading.value) return
  likeLoading.value = true
  try {
    const { data } = await toggleLike(article.value.id)
    // 用后端返回的最新数据覆盖，保证 likes 与 liked 一定与服务端一致
    if (data) {
      article.value = { ...article.value, ...data, content: article.value.content }
      ElMessage.success(data.liked ? '点赞成功' : '已取消点赞')
    }
  } catch (e) {
    // 错误提示由拦截器统一处理
  } finally {
    likeLoading.value = false
  }
}

/** 点击「回复」：记录目标评论，聚焦输入框 */
async function handleReply(comment) {
  if (!isLogin.value) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  replyTarget.value = comment
  await nextTick()
  // el-input 的 textarea 内部元素
  const textarea = commentInputRef.value?.$el?.querySelector('textarea')
  if (textarea) textarea.focus()
}

/** 取消回复 */
function cancelReply() {
  replyTarget.value = null
}

/** 提交评论 / 回复 */
async function submitComment() {
  const content = (commentContent.value || '').trim()
  if (!content) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  if (content.length > 500) {
    ElMessage.warning('评论内容不能超过 500 字')
    return
  }

  submitting.value = true
  try {
    await createComment({
      articleId: Number(route.params.id),
      content,
      parentId: replyTarget.value ? replyTarget.value.id : null
    })

    ElMessage.success(replyTarget.value ? '回复成功' : '评论成功')
    commentContent.value = ''
    replyTarget.value = null

    // 局部刷新：重新拉评论树 + 文章评论数 +1
    await loadComments(route.params.id)
    if (article.value) {
      article.value.commentCount = (article.value.commentCount || 0) + 1
    }
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

/** 删除评论：本人或管理员可删 */
async function handleDeleteComment(comment) {
  const canDelete =
    isAdmin.value || String(userStore.userInfo?.id) === String(comment.userId)
  if (!canDelete) {
    ElMessage.warning('只能删除自己的评论')
    return
  }

  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }

  try {
    await deleteComment(comment.id)
    ElMessage.success('删除成功')
    await loadComments(route.params.id)
    if (article.value) {
      article.value.commentCount = Math.max(0, (article.value.commentCount || 1) - 1)
    }
  } catch (e) {
    // 拦截器已提示
  }
}

/** 判断某条评论是否可删除（用于控制按钮显示） */
function canDelete(comment) {
  return isAdmin.value || String(userStore.userInfo?.id) === String(comment.userId)
}

/** 评论者头像兜底 */
function commentAvatar(comment) {
  return comment.avatar || letterAvatar(comment.nickname || 'U')
}

/** 图片加载失败兜底 */
function onImgError(event, name) {
  event.target.src = letterAvatar(name || 'U')
}

/** 返回列表 */
function goBack() {
  router.back()
}
</script>

<template>
  <div class="detail-page blog-container blog-main">
    <!-- ==================== 加载中 ==================== -->
    <div v-if="loading" class="blog-card detail-loading">
      <el-skeleton :rows="10" animated />
    </div>

    <!-- ==================== 文章不存在 ==================== -->
    <EmptyState v-else-if="!article" description="文章不存在或已被删除">
      <el-button type="primary" @click="router.push('/')">返回首页</el-button>
    </EmptyState>

    <!-- ==================== 正文 ==================== -->
    <template v-else>
      <article class="blog-card detail-card">
        <!-- 头部信息 -->
        <header class="detail-header">
          <h1 class="detail-title">{{ article.title }}</h1>

          <div class="detail-meta">
            <div class="meta-left">
              <img
                class="author-avatar"
                :src="authorAvatar"
                :alt="article.authorName"
                @error="onImgError($event, article.authorName)"
              />
              <div class="author-info">
                <span class="author-name">{{ article.authorName || '匿名' }}</span>
                <span class="publish-time" :title="article.createTime">
                  {{ formatTime(article.createTime, 'yyyy-MM-dd HH:mm') }} 发布
                </span>
              </div>
            </div>

            <div class="meta-right">
              <span class="meta-item" :title="`浏览量 ${article.views || 0}`">
                <el-icon><View /></el-icon>
                {{ compactNumber(article.views) }} 阅读
              </span>
              <span class="meta-item">
                <el-icon><ChatDotRound /></el-icon>
                {{ article.commentCount || 0 }} 评论
              </span>
              <span class="meta-item">
                <el-icon><Star /></el-icon>
                {{ article.likes || 0 }} 点赞
              </span>
            </div>
          </div>

          <!-- 分类与标签 -->
          <div class="detail-tags">
            <span
              v-if="article.categoryName"
              class="category-badge"
              @click="router.push({ path: '/', query: { categoryId: article.categoryId } })"
            >
              <el-icon><Collection /></el-icon>
              {{ article.categoryName }}
            </span>
            <TagChip
              v-for="tag in articleTags"
              :key="tag.id"
              :tag="tag"
              size="default"
              clickable
              @click="router.push({ path: '/', query: { tagId: tag.id } })"
            />
          </div>
        </header>

        <!-- Markdown 正文 -->
        <div class="detail-content">
          <!--
            MdPreview 必须显式指定 preview-theme（该 prop 没有默认值）
            这里使用内置的默认主题 default
          -->
          <MdPreview
            :model-value="article.content || '> 本文暂无正文内容'"
            preview-theme="default"
            :editor-id="`article-preview-${article.id}`"
          />
        </div>

        <!-- 底部操作区 -->
        <footer class="detail-footer">
          <el-button
            class="like-btn"
            :type="article.liked ? 'danger' : 'default'"
            round
            size="large"
            :loading="likeLoading"
            @click="handleLike"
          >
            <el-icon><Star /></el-icon>
            <span>{{ article.liked ? '已点赞' : '点赞' }} {{ article.likes || 0 }}</span>
          </el-button>

          <el-button round size="large" @click="goBack">
            <el-icon><Back /></el-icon>
            <span>返回</span>
          </el-button>
        </footer>
      </article>

      <!-- ==================== 评论区 ==================== -->
      <section class="blog-card comment-card">
        <h2 class="section-title">评论区（{{ commentTotal }}）</h2>

        <!-- 发表评论 -->
        <div class="comment-form">
          <!-- 回复提示条 -->
          <div v-if="replyTarget" class="reply-tip">
            <span>
              回复
              <b>@{{ replyTarget.nickname }}</b>
              ：{{ replyTarget.content?.slice(0, 30) }}{{ replyTarget.content?.length > 30 ? '...' : '' }}
            </span>
            <el-button link type="primary" @click="cancelReply">取消回复</el-button>
          </div>

          <el-input
            ref="commentInputRef"
            v-model="commentContent"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            :placeholder="
              isLogin
                ? replyTarget
                  ? `回复 @${replyTarget.nickname}`
                  : '说点什么吧，友善的评论是交流的起点～'
                : '登录后即可发表评论'
            "
            :disabled="!isLogin"
          />

          <div class="form-actions">
            <template v-if="isLogin">
              <el-button type="primary" :loading="submitting" @click="submitComment">
                {{ replyTarget ? '发表回复' : '发表评论' }}
              </el-button>
            </template>
            <template v-else>
              <el-button
                type="primary"
                @click="router.push({ path: '/login', query: { redirect: route.fullPath } })"
              >
                登录后评论
              </el-button>
            </template>
          </div>
        </div>

        <!-- 评论列表 -->
        <div v-loading="commentLoading" class="comment-list">
          <template v-if="comments.length">
            <div v-for="item in comments" :key="item.id" class="comment-item">
              <!-- 顶级评论 -->
              <div class="comment-main">
                <img
                  class="comment-avatar"
                  :src="commentAvatar(item)"
                  :alt="item.nickname"
                  @error="onImgError($event, item.nickname)"
                />
                <div class="comment-body">
                  <div class="comment-head">
                    <span class="comment-name">{{ item.nickname }}</span>
                    <span class="comment-time" :title="item.createTime">
                      {{ fromNow(item.createTime) }}
                    </span>
                  </div>
                  <p class="comment-text">{{ item.content }}</p>
                  <div class="comment-actions">
                    <el-button link type="primary" @click="handleReply(item)">回复</el-button>
                    <el-button
                      v-if="canDelete(item)"
                      link
                      type="danger"
                      @click="handleDeleteComment(item)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- 子评论（回复） -->
              <div v-if="item.children?.length" class="comment-children">
                <div v-for="child in item.children" :key="child.id" class="comment-main">
                  <img
                    class="comment-avatar"
                    :src="commentAvatar(child)"
                    :alt="child.nickname"
                    @error="onImgError($event, child.nickname)"
                  />
                  <div class="comment-body">
                    <div class="comment-head">
                      <span class="comment-name">{{ child.nickname }}</span>
                      <span v-if="child.replyToNickname" class="reply-to">
                        回复 @{{ child.replyToNickname }}
                      </span>
                      <span class="comment-time" :title="child.createTime">
                        {{ fromNow(child.createTime) }}
                      </span>
                    </div>
                    <p class="comment-text">{{ child.content }}</p>
                    <div class="comment-actions">
                      <el-button link type="primary" @click="handleReply(child)">回复</el-button>
                      <el-button
                        v-if="canDelete(child)"
                        link
                        type="danger"
                        @click="handleDeleteComment(child)"
                      >
                        删除
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <EmptyState v-else-if="!commentLoading" description="还没有评论，来抢沙发吧～" />
        </div>
      </section>
    </template>

    <!-- 返回顶部 -->
    <el-back-to-top :right="32" :bottom="80" />
  </div>
</template>

<style scoped>
.detail-loading {
  padding: 24px;
}

/* ---------- 文章卡片 ---------- */
.detail-card {
  padding: 28px 32px;
  margin-bottom: 20px;
}

.detail-card:hover {
  transform: none;
}

.detail-title {
  margin: 0 0 18px;
  font-size: 28px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--blog-text);
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--blog-border);
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--blog-bg);
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--blog-text);
}

.publish-time {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #fff;
  background: var(--blog-primary);
  cursor: pointer;
}

.category-badge:hover {
  opacity: 0.9;
}

/* ---------- Markdown 正文 ---------- */
.detail-content {
  padding: 20px 0 8px;
  /* 正文可读性：限制行宽 */
  word-break: break-word;
}

.detail-content :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.detail-content :deep(.md-editor-preview) {
  font-size: 15px;
  line-height: 1.85;
}

/* ---------- 底部操作 ---------- */
.detail-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 24px;
  margin-top: 12px;
  border-top: 1px solid var(--blog-border);
}

.like-btn {
  min-width: 130px;
}

/* ---------- 评论区 ---------- */
.comment-card {
  padding: 24px 32px 28px;
}

.comment-card:hover {
  transform: none;
}

.comment-form {
  margin-bottom: 24px;
}

.reply-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--blog-text-regular);
  background: rgba(64, 158, 255, 0.08);
  border-radius: 6px;
}

.reply-tip b {
  color: var(--blog-primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.comment-list {
  min-height: 80px;
}

.comment-item {
  padding: 16px 0;
  border-bottom: 1px dashed var(--blog-border);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-main {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--blog-bg);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--blog-text);
}

.reply-to {
  font-size: 12px;
  color: var(--blog-primary);
}

.comment-time {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.comment-text {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--blog-text-regular);
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 子评论缩进 + 浅背景，形成层级感 */
.comment-children {
  margin: 12px 0 0 50px;
  padding: 12px 14px;
  background: #fafbfc;
  border-radius: 8px;
}

.comment-children .comment-item {
  padding: 10px 0;
}

/* ---------- 响应式 ---------- */
@media (max-width: 768px) {
  .detail-card,
  .comment-card {
    padding: 16px;
  }

  .detail-title {
    font-size: 21px;
  }

  .detail-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .comment-children {
    margin-left: 16px;
  }
}
</style>
