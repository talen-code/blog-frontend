<script setup>
/**
 * 登录页
 *
 * 流程：表单校验 -> 调 POST /api/auth/login -> 写入登录态(setLogin) -> 跳转
 * 跳转优先级：地址栏 redirect 参数 > 首页
 * （redirect 由路由守卫或 axios 401 处理时带上，登录后可以回到原来的页面）
 */
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { setLogin } from '@/store/user'

const route = useRoute()
const router = useRouter()

/** 表单 DOM 引用，用于调用 validate() */
const loginFormRef = ref(null)

/** 提交中状态，防止重复点击 */
const loading = ref(false)

/** 登录表单数据 */
const form = reactive({
  username: '',
  password: ''
})

/** 表单校验规则（Element Plus 使用 async-validator） */
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3~20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6~20 个字符', trigger: 'blur' }
  ]
}

/** 提交登录 */
async function handleLogin() {
  // validate() 返回 Promise，校验不通过会 reject
  try {
    await loginFormRef.value.validate()
  } catch (e) {
    return
  }

  loading.value = true
  try {
    const { data } = await login({
      username: form.username.trim(),
      password: form.password
    })

    // 写入 token 与用户信息（内部会持久化到 localStorage）
    setLogin(data)
    ElMessage.success(`欢迎回来，${data?.user?.nickname || form.username}`)

    // 回跳：优先 redirect，其次首页
    const redirect = route.query.redirect
    router.replace(redirect ? String(redirect) : '/')
  } catch (e) {
    // 具体错误信息（用户名或密码错误 / 账号已禁用）由 axios 拦截器统一提示
  } finally {
    loading.value = false
  }
}

/** 一键填充演示账号，方便联调 */
function fillDemo(type) {
  if (type === 'admin') {
    form.username = 'admin'
    form.password = '123456'
  } else {
    form.username = 'zhangsan'
    form.password = '123456'
  }
}

onMounted(() => {
  // 如果是被 401 踢回登录页，给个明确提示
  if (route.query.redirect) {
    ElMessage.info('请登录后继续访问')
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-box blog-card">
      <!-- 左侧品牌区（大屏显示） -->
      <div class="login-brand">
        <el-icon class="brand-icon"><Notebook /></el-icon>
        <h1 class="brand-title">个人博客</h1>
        <p class="brand-desc">Vue3 + Vite + Element Plus + Spring Boot</p>
        <p class="brand-desc">前后端分离 · 内存 Mock 数据</p>
      </div>

      <!-- 右侧表单区 -->
      <div class="login-form-wrap">
        <h2 class="form-title">登录</h2>
        <p class="form-sub">欢迎回来，请输入你的账号信息</p>

        <el-form
          ref="loginFormRef"
          :model="form"
          :rules="rules"
          size="large"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              clearable
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              clearable
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="loading"
              @click="handleLogin"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <span>还没有账号？</span>
          <el-button link type="primary" @click="router.push('/register')">立即注册</el-button>
          <el-button link type="primary" @click="router.push('/')">返回首页</el-button>
        </div>

        <!-- 演示账号快捷填充 -->
        <el-alert type="info" :closable="false" class="demo-tip">
          <template #title>
            <div class="demo-line">
              <span>演示账号：</span>
              <el-button link type="primary" size="small" @click="fillDemo('admin')">
                admin / 123456（管理员）
              </el-button>
              <el-button link type="primary" size="small" @click="fillDemo('user')">
                zhangsan / 123456（普通用户）
              </el-button>
            </div>
          </template>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px;
  background: linear-gradient(135deg, #e8f3ff 0%, #f5f7fa 50%, #eef6ff 100%);
}

.login-box {
  display: flex;
  width: 100%;
  max-width: 900px;
  overflow: hidden;
  background: #fff;
}

.login-box:hover {
  transform: none;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

/* ---------- 左侧品牌区 ---------- */
.login-brand {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 28px;
  color: #fff;
  background: linear-gradient(160deg, #409eff 0%, #2b7fd4 100%);
}

.brand-icon {
  font-size: 54px;
  margin-bottom: 16px;
}

.brand-title {
  margin: 0 0 14px;
  font-size: 26px;
  font-weight: 700;
}

.brand-desc {
  margin: 4px 0;
  font-size: 13px;
  opacity: 0.9;
  text-align: center;
}

/* ---------- 右侧表单区 ---------- */
.login-form-wrap {
  flex: 1.2;
  padding: 40px 36px;
}

.form-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.form-sub {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.submit-btn {
  width: 100%;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.demo-tip {
  margin-top: 18px;
}

.demo-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  font-size: 12px;
}

/* ---------- 响应式：小屏隐藏品牌区 ---------- */
@media (max-width: 768px) {
  .login-brand {
    display: none;
  }

  .login-form-wrap {
    padding: 28px 20px;
  }
}
</style>
