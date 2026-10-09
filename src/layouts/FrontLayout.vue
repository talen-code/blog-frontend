<script setup>
/**
 * 前台布局
 *
 * 结构：顶部导航栏 + 内容区(<router-view/>) + 页脚
 * 顶部导航包含：Logo、首页/分类/标签 菜单、搜索框、登录注册 / 用户头像下拉菜单
 */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isLogin, isAdmin, userStore, clearLogin, displayName } from '@/store/user'
import { logout as logoutApi } from '@/api/auth'
import { letterAvatar } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/** 顶部搜索框的关键词（与地址栏 ?keyword= 双向同步） */
const keyword = ref(route.query.keyword || '')

/**
 * 监听地址栏变化同步到输入框。
 * 场景：在首页点了某个分类/清空了搜索，顶部搜索框也要跟着变。
 */
watch(
  () => route.query.keyword,
  (val) => {
    keyword.value = val || ''
  }
)

/** 顶部导航激活项：只根据一级路径判断 */
const activeMenu = computed(() => {
  const path = route.path
  if (path === '/') return '/'
  if (path.startsWith('/categories')) return '/categories'
  if (path.startsWith('/tags')) return '/tags'
  return ''
})

/** 头像地址，空则用首字母色块 */
const avatarSrc = computed(
  () => userStore.userInfo?.avatar || letterAvatar(displayName.value)
)

/** 搜索：回车或点击图标都会触发，统一跳首页并带上 keyword */
function handleSearch() {
  const kw = (keyword.value || '').trim()
  router.push({ path: '/', query: kw ? { keyword: kw } : {} })
}

/** 退出登录：先通知后端把 token 拉黑，再清本地登录态 */
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return // 用户点了取消
  }

  try {
    await logoutApi()
  } catch (e) {
    // 即使后端调用失败（比如 token 已过期），也要把本地登录态清掉
    console.warn('[logout] 后端退出登录接口调用失败，仍然清理本地登录态', e)
  }

  clearLogin()
  ElMessage.success('已退出登录')
  router.push('/')
}

/** 头像下拉菜单点击 */
function handleCommand(command) {
  if (command === 'logout') {
    handleLogout()
  } else if (command) {
    router.push(command)
  }
}
</script>

<template>
  <div class="front-layout">
    <!-- ==================== 顶部导航 ==================== -->
    <header class="front-header">
      <div class="blog-container header-inner">
        <!-- Logo -->
        <router-link to="/" class="logo">
          <el-icon class="logo-icon"><Notebook /></el-icon>
          <span class="logo-text">个人博客</span>
        </router-link>

        <!-- 主导航 -->
        <el-menu
          class="nav-menu"
          mode="horizontal"
          :default-active="activeMenu"
          :ellipsis="false"
          router
        >
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/categories">分类</el-menu-item>
          <el-menu-item index="/tags">标签</el-menu-item>
        </el-menu>

        <!-- 搜索框 -->
        <div class="header-search">
          <el-input
            v-model="keyword"
            placeholder="搜索文章标题或内容"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon class="search-icon" @click="handleSearch"><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 右侧：登录态 -->
        <div class="header-user">
          <template v-if="isLogin">
            <el-dropdown trigger="click" @command="handleCommand">
              <div class="user-trigger">
                <img class="user-avatar" :src="avatarSrc" alt="avatar" />
                <span class="user-name text-ellipsis">{{ displayName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="/profile">
                    <el-icon><User /></el-icon> 个人资料
                  </el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="/admin/dashboard">
                    <el-icon><Setting /></el-icon> 后台管理
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <template v-else>
            <el-button text @click="router.push('/login')">登录</el-button>
            <el-button type="primary" @click="router.push('/register')">注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <!-- ==================== 内容区 ==================== -->
    <main class="front-body">
      <router-view v-slot="{ Component }">
        <!-- 路由切换淡入，体验更顺滑 -->
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ==================== 页脚 ==================== -->
    <footer class="front-footer">
      <div class="blog-container">
        <p class="footer-text">
          个人博客系统 · Vue3 + Vite + Element Plus + Spring Boot
        </p>
        <p class="footer-sub">
          © {{ new Date().getFullYear() }} 本博客数据由后端内存 Mock 提供，重启服务后重置
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.front-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ---------- 顶部导航 ---------- */
.front-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid var(--blog-border);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--blog-primary);
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
}

.nav-menu {
  flex-shrink: 0;
  border-bottom: none !important;
}

.nav-menu :deep(.el-menu-item) {
  height: 60px;
  line-height: 60px;
  font-size: 15px;
}

.header-search {
  flex: 1;
  max-width: 320px;
  margin-left: auto;
}

.search-icon {
  cursor: pointer;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
  background: var(--blog-bg);
}

.user-name {
  max-width: 90px;
  font-size: 14px;
  color: var(--blog-text-regular);
}

/* ---------- 内容区 ---------- */
.front-body {
  flex: 1;
  min-height: 0;
}

/* ---------- 页脚 ---------- */
.front-footer {
  padding: 24px 0;
  text-align: center;
  background: #fff;
  border-top: 1px solid var(--blog-border);
}

.footer-text {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--blog-text-regular);
}

.footer-sub {
  margin: 0;
  font-size: 12px;
  color: var(--blog-text-secondary);
}

/* ---------- 过渡动画 ---------- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---------- 移动端适配 ---------- */
@media (max-width: 768px) {
  .header-inner {
    flex-wrap: wrap;
    height: auto;
    padding-top: 8px;
    padding-bottom: 8px;
    gap: 8px;
  }

  .nav-menu {
    order: 3;
    width: 100%;
  }

  .nav-menu :deep(.el-menu-item) {
    height: 44px;
    line-height: 44px;
  }

  .header-search {
    max-width: none;
    margin-left: 0;
    order: 4;
    width: 100%;
  }

  .logo-text {
    font-size: 16px;
  }
}
</style>
