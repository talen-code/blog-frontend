import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { isLogin, isAdmin } from '@/store/user'

/**
 * 路由配置（history 模式 + 懒加载 + 全局前置守卫）
 *
 * 布局思路：
 * - FrontLayout：前台（首页、详情、分类、标签、个人资料），带顶部导航与页脚
 * - AdminLayout：后台（需登录 + 管理员），带左侧菜单
 * - /login、/register：独立布局，不套任何 Layout
 *
 * 权限元信息（meta）：
 * - meta.title        页面标题，用于 document.title
 * - meta.requiresAuth 需要登录
 * - meta.requiresAdmin 需要管理员
 *
 * 注意：vue-router 4 会把父子路由的 meta 合并到 route.meta，
 * 所以 AdminLayout 父路由上声明的 requiresAdmin 对其所有子路由都生效。
 */
const routes = [
  /* ==================== 前台 ==================== */
  {
    path: '/',
    component: () => import('@/layouts/FrontLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/front/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'article/:id',
        name: 'ArticleDetail',
        component: () => import('@/views/front/ArticleDetail.vue'),
        meta: { title: '文章详情' }
      },
      {
        path: 'categories',
        name: 'CategoryList',
        component: () => import('@/views/front/CategoryList.vue'),
        meta: { title: '文章分类' }
      },
      {
        path: 'tags',
        name: 'TagList',
        component: () => import('@/views/front/TagList.vue'),
        meta: { title: '文章标签' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/front/Profile.vue'),
        meta: { title: '个人资料', requiresAuth: true }
      }
    ]
  },

  /* ==================== 后台管理 ==================== */
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '数据统计' }
      },
      {
        path: 'articles',
        name: 'AdminArticleList',
        component: () => import('@/views/admin/ArticleList.vue'),
        meta: { title: '文章管理' }
      },
      {
        path: 'article/create',
        name: 'AdminArticleCreate',
        component: () => import('@/views/admin/ArticleEdit.vue'),
        meta: { title: '新增文章' }
      },
      {
        path: 'article/edit/:id',
        name: 'AdminArticleEdit',
        component: () => import('@/views/admin/ArticleEdit.vue'),
        meta: { title: '编辑文章' }
      },
      {
        path: 'categories',
        name: 'AdminCategoryManage',
        component: () => import('@/views/admin/CategoryManage.vue'),
        meta: { title: '分类管理' }
      },
      {
        path: 'tags',
        name: 'AdminTagManage',
        component: () => import('@/views/admin/TagManage.vue'),
        meta: { title: '标签管理' }
      },
      {
        path: 'comments',
        name: 'AdminCommentManage',
        component: () => import('@/views/admin/CommentManage.vue'),
        meta: { title: '评论管理' }
      },
      {
        path: 'users',
        name: 'AdminUserManage',
        component: () => import('@/views/admin/UserManage.vue'),
        meta: { title: '用户管理' }
      }
    ]
  },

  /* ==================== 登录 / 注册（独立布局） ==================== */
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/front/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/front/Register.vue'),
    meta: { title: '注册' }
  },

  /* ==================== 404 ==================== */
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/front/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  /**
   * 路由切换时的滚动行为：
   * - 浏览器前进/后退：恢复原来的滚动位置
   * - 正常跳转：回到页面顶部（详情页跳转后停在中间会很奇怪）
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

/**
 * 全局前置守卫：统一处理登录校验与角色校验。
 *
 * 执行顺序（很重要）：
 * 1. 先设置页面标题；
 * 2. 未登录访问需登录页面 -> 跳登录页并带上 redirect 回跳地址；
 * 3. 已登录但非管理员访问后台 -> 提示并回首页；
 * 4. 已登录访问 /login 或 /register -> 直接回首页，避免重复登录。
 */
router.beforeEach((to, from, next) => {
  // ---------- 1. 页面标题 ----------
  const appTitle = import.meta.env.VITE_APP_TITLE || '个人博客系统'
  document.title = to.meta?.title ? `${to.meta.title} - ${appTitle}` : appTitle

  const logged = isLogin.value
  const admin = isAdmin.value

  // ---------- 2. 需要登录 ----------
  if (to.meta?.requiresAuth && !logged) {
    ElMessage.warning('请先登录')
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // ---------- 3. 需要管理员 ----------
  if (to.meta?.requiresAdmin && !admin) {
    ElMessage.error('需要管理员权限，无法访问后台')
    next({ path: '/' })
    return
  }

  // ---------- 4. 已登录用户不应再看到登录/注册页 ----------
  if (logged && (to.path === '/login' || to.path === '/register')) {
    next({ path: '/' })
    return
  }

  next()
})

export default router
