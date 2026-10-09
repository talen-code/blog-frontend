<script setup>
/**
 * 后台用户管理
 *
 * 功能：分页列表 + 关键词搜索 + 启用/禁用 + 删除
 * 对应接口：
 *   GET    /api/admin/users
 *   PUT    /api/admin/users/{id}/status
 *   DELETE /api/admin/users/{id}
 *
 * 保护逻辑：
 * - 不允许禁用/删除自己（否则会立刻把自己锁在门外）
 * - 前端只做体验层的拦截，真正的权限控制仍由后端负责
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import { getAdminUserPage, updateUserStatus, deleteUser } from '@/api/user'
import { userStore } from '@/store/user'
import { formatTime, letterAvatar } from '@/utils/format'

const loading = ref(false)
const list = ref([])
const total = ref(0)
/** 正在切换状态的用户 ID */
const switchingId = ref(null)

const query = reactive({
  page: 1,
  size: 10,
  keyword: ''
})

/** 当前登录用户 ID，用于禁止自操作 */
const currentUserId = ref(userStore.userInfo?.id)

/** 加载列表 */
async function loadList() {
  loading.value = true
  try {
    const { data } = await getAdminUserPage({ ...query })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleSearch() {
  query.page = 1
  loadList()
}

/** 重置 */
function resetFilter() {
  query.keyword = ''
  query.page = 1
  loadList()
}

/** 翻页 */
function handlePageChange(page) {
  query.page = page
  loadList()
}

/**
 * 切换用户启用/禁用状态。
 * @param {Object} row 用户行数据
 */
async function handleStatusChange(row) {
  // 不允许操作自己
  if (String(row.id) === String(currentUserId.value)) {
    ElMessage.warning('不能修改自己的账号状态')
    return
  }

  const nextStatus = row.status === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${actionText}用户「${row.nickname || row.username}」吗？`,
      '操作确认',
      { confirmButtonText: `确定${actionText}`, cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }

  switchingId.value = row.id
  try {
    await updateUserStatus(row.id, nextStatus)
    row.status = nextStatus
    ElMessage.success(`已${actionText}`)
  } catch (e) {
    // 拦截器已提示
  } finally {
    switchingId.value = null
  }
}

/** 删除用户 */
async function handleDelete(row) {
  if (String(row.id) === String(currentUserId.value)) {
    ElMessage.warning('不能删除自己的账号')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${row.nickname || row.username}」吗？删除后该用户无法再登录。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }

  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    if (list.value.length === 1 && query.page > 1) {
      query.page -= 1
    }
    loadList()
  } catch (e) {
    // 拦截器已提示
  }
}

/** 头像兜底 */
function onAvatarError(event, row) {
  event.target.src = letterAvatar(row.nickname || row.username || 'U')
}

onMounted(loadList)
</script>

<template>
  <div class="manage-page">
    <!-- ==================== 工具栏 ==================== -->
    <div class="toolbar">
      <div class="toolbar-title">
        <h3 class="section-title">用户管理</h3>
        <span class="toolbar-sub">共 {{ total }} 个用户</span>
      </div>

      <div class="toolbar-right">
        <el-input
          v-model="query.keyword"
          placeholder="搜索用户名或昵称"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
        <el-button @click="resetFilter">
          <el-icon><RefreshLeft /></el-icon> 重置
        </el-button>
      </div>
    </div>

    <!-- ==================== 表格 ==================== -->
    <div class="table-wrap">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />

        <el-table-column label="用户" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <img
                class="user-avatar"
                :src="row.avatar || letterAvatar(row.nickname || row.username)"
                :alt="row.nickname"
                @error="onAvatarError($event, row)"
              />
              <div class="user-info">
                <span class="user-nickname">
                  {{ row.nickname || row.username }}
                  <el-tag
                    v-if="String(row.id) === String(currentUserId)"
                    size="small"
                    type="success"
                    effect="plain"
                  >
                    我
                  </el-tag>
                </span>
                <span class="user-username">@{{ row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.email || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'" size="small">
              {{ row.role === 'ADMIN' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="switchingId === row.id"
              :disabled="String(row.id) === String(currentUserId)"
              inline-prompt
              active-text="启用"
              inactive-text="禁用"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              :disabled="String(row.id) === String(currentUserId)"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <EmptyState description="暂无用户" :image-size="90" />
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

.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-right .el-button {
  margin-left: 0;
}

.table-wrap {
  padding: 8px 16px 16px;
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--blog-bg);
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-nickname {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.user-username {
  font-size: 12px;
  color: var(--blog-text-secondary);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .toolbar-right,
  .toolbar-right :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
