<script setup>
/**
 * 后台评论管理
 *
 * 功能：分页列表 + 关键词搜索 + 删除
 * 对应接口：GET /api/admin/comments、DELETE /api/comments/{id}
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EmptyState from '@/components/EmptyState.vue'
import { getAdminCommentPage, deleteComment } from '@/api/comment'
import { formatTime, letterAvatar } from '@/utils/format'

const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  page: 1,
  size: 10,
  keyword: ''
})

/** 加载分页数据 */
async function loadList() {
  loading.value = true
  try {
    const { data } = await getAdminCommentPage({ ...query })
    list.value = data?.records || []
    total.value = data?.total || 0
  } catch (e) {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 搜索（重置到第一页） */
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

/** 删除评论 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${row.nickname || '该用户'} 的这条评论吗？`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }

  try {
    await deleteComment(row.id)
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
  event.target.src = letterAvatar(row.nickname || 'U')
}

onMounted(loadList)
</script>

<template>
  <div class="manage-page">
    <!-- ==================== 工具栏 ==================== -->
    <div class="toolbar">
      <div class="toolbar-title">
        <h3 class="section-title">评论管理</h3>
        <span class="toolbar-sub">共 {{ total }} 条评论</span>
      </div>

      <div class="toolbar-right">
        <el-input
          v-model="query.keyword"
          placeholder="搜索评论内容或用户昵称"
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

        <el-table-column label="评论人" width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <img
                class="user-avatar"
                :src="row.avatar || letterAvatar(row.nickname)"
                :alt="row.nickname"
                @error="onAvatarError($event, row)"
              />
              <span class="user-name">{{ row.nickname || '匿名' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="评论内容" min-width="240">
          <template #default="{ row }">
            <div class="content-cell">
              <el-tag v-if="row.parentId" size="small" type="info" effect="plain">回复</el-tag>
              <span class="content-text">{{ row.content }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="所属文章" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.articleTitle || `文章 #${row.articleId}` }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '正常' : '已屏蔽' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="评论时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <EmptyState description="暂无评论" :image-size="90" />
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
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--blog-bg);
}

.user-name {
  font-size: 13px;
}

.content-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.content-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
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
