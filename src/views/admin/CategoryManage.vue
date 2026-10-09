<script setup>
/**
 * 后台分类管理
 *
 * 功能：列表展示 + 新增 / 编辑（弹窗表单）+ 删除
 * 对应接口：GET/POST/PUT/DELETE /api/categories
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/api/category'
import { formatTime } from '@/utils/format'

const loading = ref(false)
const categories = ref([])

/* ==================== 弹窗表单 ==================== */

const dialogVisible = ref(false)
/** 弹窗标题：新增分类 / 编辑分类 */
const dialogTitle = ref('新增分类')
/** 当前编辑的分类 ID，null 表示新增 */
const editingId = ref(null)
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  name: '',
  description: '',
  sort: 0
})

const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 20, message: '名称长度为 1~20 个字符', trigger: 'blur' }
  ],
  description: [{ max: 100, message: '描述最多 100 个字符', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序值', trigger: 'blur' }]
}

/** 加载分类列表 */
async function loadList() {
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

/** 打开新增弹窗 */
function openCreate() {
  dialogTitle.value = '新增分类'
  editingId.value = null
  form.name = ''
  form.description = ''
  form.sort = (categories.value.length + 1) * 10
  dialogVisible.value = true
  // 清除上一次的校验状态
  formRef.value?.clearValidate()
}

/** 打开编辑弹窗 */
function openEdit(row) {
  dialogTitle.value = '编辑分类'
  editingId.value = row.id
  form.name = row.name
  form.description = row.description || ''
  form.sort = row.sort ?? 0
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

/** 提交表单 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  submitting.value = true
  const payload = {
    name: form.name.trim(),
    description: (form.description || '').trim(),
    sort: Number(form.sort) || 0
  }

  try {
    if (editingId.value) {
      await updateCategory(editingId.value, payload)
      ElMessage.success('分类已更新')
    } else {
      await createCategory(payload)
      ElMessage.success('分类已创建')
    }
    dialogVisible.value = false
    loadList()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

/** 删除分类 */
async function handleDelete(row) {
  const count = row.articleCount || 0
  const tip = count > 0
    ? `分类「${row.name}」下还有 ${count} 篇文章，删除后这些文章将变为未分类。确定删除吗？`
    : `确定要删除分类「${row.name}」吗？`

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
    await deleteCategory(row.id)
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
        <h3 class="section-title">分类管理</h3>
        <span class="toolbar-sub">共 {{ categories.length }} 个分类</span>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 新增分类
      </el-button>
    </div>

    <!-- ==================== 表格 ==================== -->
    <div class="table-wrap">
      <el-table v-loading="loading" :data="categories" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="分类名称" min-width="140">
          <template #default="{ row }">
            <div class="name-cell">
              <el-icon class="name-icon"><Folder /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="90" />
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
          <EmptyState description="暂无分类" :image-size="90" />
        </template>
      </el-table>
    </div>

    <!-- ==================== 新增 / 编辑弹窗 ==================== -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：前端开发" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="100"
            show-word-limit
            placeholder="简单描述这个分类涵盖的内容"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
          <span class="form-tip">数值越小越靠前</span>
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

.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.name-icon {
  color: var(--blog-primary);
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: var(--blog-text-secondary);
}
</style>
