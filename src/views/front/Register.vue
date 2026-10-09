<script setup>
/**
 * 注册页
 *
 * 流程：表单校验（含两次密码一致性校验）-> POST /api/auth/register
 *      -> 后端直接返回 LoginVO -> 写入登录态 -> 跳首页
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '@/api/auth'
import { setLogin } from '@/store/user'

const router = useRouter()

const registerFormRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  email: ''
})

/**
 * 自定义校验器：确认密码必须与密码一致。
 * 注意：这里用闭包读取 form.password，所以密码框变化时
 * 需要在模板里对 confirmPassword 重新触发校验（见下方 @blur / watch 处理）。
 */
function validateConfirmPassword(rule, value, callback) {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3~20 个字符', trigger: 'blur' },
    {
      // 只允许字母、数字、下划线，避免后端出现奇怪的用户名
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '用户名只能包含字母、数字和下划线',
      trigger: 'blur'
    }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1~20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6~20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

/** 密码变化时，如果确认密码已经填过，重新校验一次 */
function handlePasswordChange() {
  if (form.confirmPassword && registerFormRef.value) {
    registerFormRef.value.validateField('confirmPassword')
  }
}

/** 提交注册 */
async function handleRegister() {
  try {
    await registerFormRef.value.validate()
  } catch (e) {
    return
  }

  loading.value = true
  try {
    const { data } = await register({
      username: form.username.trim(),
      password: form.password,
      nickname: form.nickname.trim(),
      email: form.email.trim()
    })

    // 注册成功后端直接返回 LoginVO，可视为已登录
    setLogin(data)
    ElMessage.success('注册成功，已自动登录')
    router.replace('/')
  } catch (e) {
    // 用户名已存在等错误由拦截器统一提示
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-box blog-card">
      <h2 class="form-title">注册账号</h2>
      <p class="form-sub">创建属于你的博客账号</p>

      <el-form
        ref="registerFormRef"
        :model="form"
        :rules="rules"
        size="large"
        label-position="top"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="字母、数字或下划线，3~20 位" clearable>
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="展示在文章与评论中的名字" clearable>
            <template #prefix>
              <el-icon><Avatar /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="用于找回密码（演示项目不会真的发邮件）" clearable>
            <template #prefix>
              <el-icon><Message /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="6~20 位"
            show-password
            @change="handlePasswordChange"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            @keyup.enter="handleRegister"
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
            @click="handleRegister"
          >
            注 册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="form-footer">
        <span>已有账号？</span>
        <el-button link type="primary" @click="router.push('/login')">去登录</el-button>
        <el-button link type="primary" @click="router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
  background: linear-gradient(135deg, #e8f3ff 0%, #f5f7fa 50%, #eef6ff 100%);
}

.register-box {
  width: 100%;
  max-width: 480px;
  padding: 36px 32px;
}

.register-box:hover {
  transform: none;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.form-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.form-sub {
  margin: 0 0 22px;
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

@media (max-width: 768px) {
  .register-box {
    padding: 24px 18px;
  }
}
</style>
