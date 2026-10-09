<script setup>
/**
 * 后台管理布局
 *
 * 结构：左侧菜单（el-menu，router 模式）+ 顶部面包屑/用户区 + 内容区(<router-view/>)
 * 进入该布局的路由都带 meta.requiresAdmin，路由守卫保证只有管理员能看到。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userStore, clearLogin, displayName } from '@/store/user'
import { logout as logoutApi } from '@/api/auth'
import { letterAvatar } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/** 侧边栏折叠状态 */
const isCollapse = ref(false)

/** 菜单激活项 = 当前路径（新增/编辑文章时高亮「文章管理」） */
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/article/')) return '/admin/articles'
  return path
})

/** 面包屑：后台 / 当前页面标题 */
const breadcrumbs = computed(() => {
  const list = [{ title: '后台管理', path: '/admin/dashboard' }]
  if (route.meta?.title && route.path !== '/admin/dashboard') {
    list.push({ title: route.meta.title, path: route.path })
  }
  return list
})

/** 头像 */
const avatarSrc = computed(
  () => userStore.userInfo?.avatar || letterAvatar(displayName.value)
)

/** 折叠 / 展开侧边栏 */
function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

/** 退出登录 */
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }

  try {
    await logoutApi()
  } catch (e) {
    console.warn('[logout] 后端退出登录失败，仍然清理本地登录态', e)
  }

  clearLogin()
  ElMessage.success('已退出登录')
  router.push('/login')
}

/** 顶部头像下拉 */
function handleCommand(command) {
  if (command === 'logout') {
    handleLogout()
  } else if (command) {
    router.push(command)
  }
}
</script>

<template>
  <el-container class="admin-layout">
    <!-- ==================== 左侧菜单 ==================== -->
    <el-aside class="admin-aside" :width="isCollapse ? '64px' : '210px'">
      <div class="aside-logo">
        <el-icon class="aside-logo-icon"><Notebook /></el-icon>
        <span v-show="!isCollapse" class="aside-logo-text">博客后台</span>
      </div>

      <el-menu
        class="aside-menu"
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
        <el-menu-item index="/admin/articles">
          <el-icon><Document /></el-icon>
          <template #title>文章管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/categories">
          <el-icon><Collection /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/tags">
          <el-icon><PriceTag /></el-icon>
          <template #title>标签管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/comments">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>评论管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><UserFilled /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- ==================== 顶部栏 ==================== -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>

          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="(item, index) in breadcrumbs"
              :key="index"
              :to="index < breadcrumbs.length - 1 ? item.path : undefined"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-button text @click="router.push('/')">
            <el-icon><HomeFilled /></el-icon>
            <span class="btn-text">返回前台</span>
          </el-button>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-trigger">
              <img class="user-avatar" :src="avatarSrc" alt="avatar" />
              <span class="user-name">{{ displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="/profile">
                  <el-icon><User /></el-icon> 个人资料
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- ==================== 内容区 ==================== -->
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  height: 100vh;
}

/* ---------- 侧边栏 ---------- */
.admin-aside {
  background: #001529;
  transition: width 0.25s ease;
  overflow-x: hidden;
}

.aside-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.aside-logo-icon {
  font-size: 22px;
  color: var(--blog-primary);
}

.aside-menu {
  border-right: none;
  background: #001529;
}

/* 深色侧边栏配色微调 */
.aside-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.72);
}

.aside-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.aside-menu :deep(.el-menu-item.is-active) {
  background: var(--blog-primary);
  color: #fff;
}

/* ---------- 顶部栏 ---------- */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid var(--blog-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--blog-text-regular);
}

.collapse-btn:hover {
  color: var(--blog-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
  outline: none;
  transition: background 0.2s;
}

.user-trigger:hover {
  background: var(--blog-bg);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  color: var(--blog-text-regular);
}

/* ---------- 内容区 ---------- */
.admin-main {
  padding: 16px;
  background: var(--blog-bg);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .btn-text,
  .user-name {
    display: none;
  }

  .admin-main {
    padding: 10px;
  }
}
</style>
