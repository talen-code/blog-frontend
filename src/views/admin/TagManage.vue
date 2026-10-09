<script setup>
/**
 * 后台标签管理
 *
 * 功能：列表展示 + 新增 / 编辑（含颜色选择器）+ 删除
 * 对应接口：GET/POST/PUT/DELETE /api/tags
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import TagChip from '@/components/TagChip.vue'
import { getTagList, createTag, updateTag, deleteTag } from '@/api/tag'
import { formatTime } from '@/utils/format'

const loading = ref(false)
const tags = ref([])

/* ==================== 弹窗表单 ==================== */

const dialogVisible = ref(false)
const dialogTitle = ref('新增标签')
const editingId = ref(null)
const formRef = ref(null)
const submitting = ref(false)

/** 预设颜色，方便快速选择 */
const presetColors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
  '#42B983', '#6DB33F', '#E76F00', '#8E44AD', '#16A085'
]

const form = reactive({
  name: '',
  color: '#409EFF'
})

const rules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '名称长度为 1~20 个字符', trigger: 'blur' }
  ],
  color: [{ required: true, message: '请选择标签颜色', trigger: 'change' }]
}

/** 加载标签列表 */
async function loadList() {
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

/** 新增 */
function openCreate() {
  dialogTitle.value = '新增标签'
  editingId.value = null
  form.name = ''
  form.color = '#409EFF'
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

/** 编辑 */
function openEdit(row) {
  dialogTitle.value = '编辑标签'
  editingId.value = row.id
  form.name = row.name
  form.color = row.color || '#409EFF'
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

/** 提交 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  submitting.value = true
  const payload = {
    name: form.name.trim(),
    color: form.color
  }

  try {
    if (editingId.value) {
      await updateTag(editingId.value, payload)
      ElMessage.success('标签已更新')
    } else {
      await createTag(payload)
      ElMessage.success('标签已创建')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

/** 删除 */
async function handleDelete(row) {
  const count = row.articleCount || 0
  const tip = count > 0
    ? `标签「${row.name}」已被 ${count} 篇文章使用，删除后这些文章将失去该标签。确定删除吗？`
    : `确定要删除标签「${row.name}」吗？`

  try {
    await ElMessageBox.confirm(tip, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }

  try {
    await deleteTag(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(loadList)
</script>

<template>
  <div class="manage-page">
    <!-- ==================== 工具栏 ==================== -->
    <div class="toolbar">
      <div class="toolbar-title">
        <h3 class="section-title">标签管理</h3>
        <span class="toolbar-sub">共 {{ tags.length }} 个标签</span>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 新增标签
      </el-button>
    </div>

    <!-- ==================== 表格 ==================== -->
    <div class="table-wrap">
      <el-table v-loading="loading" :data="tags" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="标签" min-width="140">
          <template #default="{ row }">
            <TagChip :tag="row" size="default" />
          </template>
        </el-table-column>
        <el-table-column label="颜色" width="150">
          <template #default="{ row }">
            <div class="color-cell">
              <span class="color-block" :style="{ background: row.color }"></span>
              <code class="color-code">{{ row.color }}</code>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="文章数" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.articleCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState description="暂无标签" :image-size="90" />
        </template>
      </el-table>
    </div>

    <!-- ==================== 新增 / 编辑弹窗 ==================== -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：Vue3" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="颜色" prop="color">
          <div class="color-picker-row">
            <el-color-picker v-model="form.color" :predefine="presetColors" />
            <el-input v-model="form.color" style="width: 130px" placeholder="#409EFF" />
          </div>
          <div class="preset-row">
            <span
              v-for="color in presetColors"
              :key="color"
              class="preset-dot"
              :style="{ background: color }"
              :title="color"
              @click="form.color = color"
            ></span>
          </div>
        </el-form-item>

        <el-form-item label="预览">
          <TagChip :name="form.name || '标签预览'" :color="form.color" size="default" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.manage-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

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

.toolbar-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.toolbar-title .section-title {
  margin-bottom: 0;
}

.toolbar-sub {
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.table-wrap {
  padding: 8px 16px 16px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.color-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--blog-border);
}

.color-code {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.preset-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.preset-dot:hover {
  transform: scale(1.2);
}
</style>
