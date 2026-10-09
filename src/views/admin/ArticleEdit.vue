<script setup>
/**
 * 后台文章新增 / 编辑页
 *
 * 同一个组件承担两种模式：
 * - 新增：路由 /admin/article/create
 * - 编辑：路由 /admin/article/edit/:id，进入时调 GET /api/admin/articles/{id} 回填表单
 *
 * 编辑器使用 md-editor-v3 的 <MdEditor>（已在 main.js 全局注册），
 * 它自带 markdown-it 解析与代码高亮，无需额外引入 marked / highlight.js。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminArticleDetail,
  createArticle,
  updateArticle
} from '@/api/article'
import { getCategoryList } from '@/api/category'
import { getTagList } from '@/api/tag'
import { letterCover } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/* ==================== 模式判断 ==================== */

/** 路由里的文章 ID，有值即为编辑模式 */
const articleId = computed(() => route.params.id || null)
const isEdit = computed(() => !!articleId.value)

/* ==================== 表单 ==================== */

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  title: '',
  summary: '',
  cover: '',
  content: '',
  categoryId: null,
  tagIds: [],
  status: 1,
  top: 0
})

/** 表单校验规则 */
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度为 2~100 个字符', trigger: 'blur' }
  ],
  categoryId: [{ required: true, message: '请选择文章分类', trigger: 'change' }],
  content: [
    {
      required: true,
      // 自定义校验：Markdown 编辑器不会触发 blur，所以手动判断
      validator: (rule, value, callback) => {
        if (!value || !String(value).trim()) {
          callback(new Error('请输入文章正文'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

/* ==================== 下拉数据 ==================== */

const categories = ref([])
const tags = ref([])

/** 编辑器高度 */
const editorHeight = '520px'

/** 封面预览 */
const coverPreview = computed(() => form.cover || letterCover(form.title || 'B'))

/** 加载分类与标签 */
async function loadOptions() {
  try {
    const [categoryRes, tagRes] = await Promise.all([getCategoryList(), getTagList()])
    categories.value = categoryRes.data || []
    tags.value = tagRes.data || []
  } catch (e) {
    console.warn('[ArticleEdit] 分类/标签加载失败', e)
  }
}

/** 编辑模式：回填数据 */
async function loadArticle() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const { data } = await getAdminArticleDetail(articleId.value)
    if (!data) {
      ElMessage.error('文章不存在')
      router.replace('/admin/articles')
      return
    }
    form.title = data.title || ''
    form.summary = data.summary || ''
    form.cover = data.cover || ''
    form.content = data.content || ''
    form.categoryId = data.categoryId ?? null
    form.tagIds = data.tagIds || []
    form.status = data.status ?? 1
    form.top = data.top ?? 0
  } catch (e) {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

/**
 * 提交。
 * @param {number} status 0 保存草稿，1 发布
 */
async function handleSubmit(status) {
  // 保存草稿时也要求有标题，否则后台列表无法展示
  try {
    await formRef.value.validate()
  } catch (e) {
    ElMessage.warning('请先补全必填项：标题、分类、正文')
    return
  }

  if (status === 0) {
    try {
      await ElMessageBox.confirm('保存为草稿？草稿不会在前台展示。', '提示', {
        confirmButtonText: '保存草稿',
        cancelButtonText: '取消',
        type: 'info'
      })
    } catch (e) {
      return
    }
  }

  submitting.value = true
  const payload = {
    title: form.title.trim(),
    summary: (form.summary || '').trim(),
    cover: (form.cover || '').trim(),
    content: form.content,
    categoryId: form.categoryId,
    tagIds: form.tagIds || [],
    status,
    top: form.top
  }

  try {
    if (isEdit.value) {
      await updateArticle(articleId.value, payload)
      ElMessage.success(status === 1 ? '文章已更新并发布' : '草稿已保存')
    } else {
      await createArticle(payload)
      ElMessage.success(status === 1 ? '文章发布成功' : '草稿已保存')
    }
    router.push('/admin/articles')
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

/** 图片加载失败 */
function onCoverError() {
  form.cover = ''
}

onMounted(async () => {
  await loadOptions()
  await loadArticle()
})
</script>

<template>
  <div v-loading="loading" class="article-edit">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="edit-form"
    >
      <!-- ==================== 左侧：标题 + 编辑器 ==================== -->
      <div class="edit-main">
        <div class="panel">
          <el-form-item prop="title" class="title-item">
            <el-input
              v-model="form.title"
              placeholder="请输入文章标题（2~100 字）"
              size="large"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>

          <el-form-item prop="content" class="content-item">
            <!--
              Markdown 编辑器
              - v-model 双向绑定正文（Markdown 原文）
              - language 指定中文界面
              - 不传 toolbars 即为完整工具栏（加粗/标题/代码块/表格/图片/预览等）
            -->
            <MdEditor
              v-model="form.content"
              language="zh-CN"
              :style="{ height: editorHeight }"
              :preview="true"
              placeholder="开始写点什么吧～ 支持 Markdown 语法"
            />
          </el-form-item>
        </div>
      </div>

      <!-- ==================== 右侧：发布设置 ==================== -->
      <aside class="edit-aside">
        <div class="panel">
          <h3 class="section-title">{{ isEdit ? '编辑文章' : '发布文章' }}</h3>

          <el-form-item label="所属分类" prop="categoryId">
            <el-select
              v-model="form.categoryId"
              placeholder="请选择分类"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="item in categories"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="文章标签">
            <el-select
              v-model="form.tagIds"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="最多选择 5 个标签"
              :multiple-limit="5"
              style="width: 100%"
            >
              <el-option
                v-for="item in tags"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="是否置顶">
            <el-switch v-model="form.top" :active-value="1" :inactive-value="0" />
          </el-form-item>

          <el-form-item label="文章封面">
            <el-input
              v-model="form.cover"
              placeholder="图片 URL，留空自动使用占位图"
              clearable
            />
            <div class="cover-preview">
              <img :src="coverPreview" alt="cover preview" @error="onCoverError" />
            </div>
          </el-form-item>

          <el-form-item label="文章摘要">
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="4"
              maxlength="200"
              show-word-limit
              placeholder="用于列表页展示，留空则由后端截取正文"
            />
          </el-form-item>

          <div class="submit-actions">
            <el-button
              type="primary"
              :loading="submitting"
              class="action-btn"
              @click="handleSubmit(1)"
            >
              <el-icon><Promotion /></el-icon>
              {{ isEdit ? '保存并发布' : '发布文章' }}
            </el-button>
            <el-button :loading="submitting" class="action-btn" @click="handleSubmit(0)">
              <el-icon><DocumentAdd /></el-icon> 保存草稿
            </el-button>
            <el-button class="action-btn" @click="router.push('/admin/articles')">
              返回列表
            </el-button>
          </div>
        </div>
      </aside>
    </el-form>
  </div>
</template>

<style scoped>
.article-edit {
  min-height: 60vh;
}

.edit-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.edit-main {
  min-width: 0;
}

.edit-aside {
  position: sticky;
  top: 0;
}

.panel {
  padding: 18px 20px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.title-item {
  margin-bottom: 14px;
}

.title-item :deep(.el-form-item__content) {
  display: block;
}

.content-item {
  margin-bottom: 0;
}

.content-item :deep(.el-form-item__content) {
  display: block;
  line-height: normal;
}

/* Markdown 编辑器圆角与边框微调 */
.content-item :deep(.md-editor) {
  border-radius: 8px;
}

.edit-aside .section-title {
  margin-bottom: 14px;
}

.edit-aside :deep(.el-form-item__label) {
  padding-bottom: 2px;
  font-weight: 500;
}

.cover-preview {
  width: 100%;
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: var(--blog-bg);
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.submit-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.submit-actions .el-button {
  margin-left: 0;
  width: 100%;
}

@media (max-width: 992px) {
  .edit-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .edit-aside {
    position: static;
  }
}
</style>
