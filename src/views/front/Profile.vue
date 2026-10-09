<script setup>
/**
 * 个人资料页（需登录）
 *
 * 功能：修改昵称、头像、邮箱、个人简介，可选修改密码。
 * 提交成功后调用 setUserInfo 更新全局登录态，顶部导航的头像/昵称会立即刷新。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { updateProfile } from '@/api/user'
import { getCurrentUser } from '@/api/auth'
import { userStore, setUserInfo, displayName } from '@/store/user'
import { letterAvatar, formatTime } from '@/utils/format'

const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

const form = reactive({
  nickname: '',
  avatar: '',
  email: '',
  signature: '',
  password: ''
})

/** 表单校验规则 */
const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1~20 个字符', trigger: 'blur' }
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [{ min: 6, max: 20, message: '密码长度为 6~20 个字符', trigger: 'blur' }]
}

/** 头像预览：没填就用昵称首字母色块 */
const avatarPreview = computed(() => form.avatar || letterAvatar(form.nickname || displayName.value))

/** 把最新的用户信息回填到表单 */
function fillForm(user) {
  if (!user) return
  form.nickname = user.nickname || ''
  form.avatar = user.avatar || ''
  form.email = user.email || ''
  form.signature = user.signature || ''
  form.password = ''
}

/**
 * 加载当前用户信息。
 * 优先调接口拿最新数据（顺便验证 token 是否仍然有效），
 * 失败则退回使用本地缓存的用户信息。
 */
async function loadProfile() {
  loading.value = true
  try {
    const { data } = await getCurrentUser()
    setUserInfo(data)
    fillForm(data)
  } catch (e) {
    fillForm(userStore.userInfo)
  } finally {
    loading.value = false
  }
}

/** 提交修改 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  saving.value = true
  try {
    // password 为空表示不修改密码，传空字符串后端会忽略
    const payload = {
      nickname: form.nickname.trim(),
      avatar: form.avatar.trim(),
      email: form.email.trim(),
      signature: form.signature.trim(),
      password: form.password || ''
    }
    const { data } = await updateProfile(payload)
    // 更新全局登录态，导航栏昵称/头像立即生效
    setUserInfo(data)
    form.password = ''
    ElMessage.success('资料已更新')
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

/** 头像加载失败兜底 */
function onAvatarError() {
  form.avatar = ''
}

onMounted(loadProfile)
</script>

<template>
  <div class="profile-page blog-container blog-main">
    <div class="profile-layout">
      <!-- 左侧：资料卡片 -->
      <aside class="profile-aside blog-card">
        <img class="profile-avatar" :src="avatarPreview" alt="avatar" @error="onAvatarError" />
        <h3 class="profile-name">{{ form.nickname || displayName }}</h3>
        <p class="profile-username">@{{ userStore.userInfo?.username }}</p>
        <el-tag :type="userStore.userInfo?.role === 'ADMIN' ? 'danger' : 'info'" size="small">
          {{ userStore.userInfo?.role === 'ADMIN' ? '管理员' : '普通用户' }}
        </el-tag>
        <p class="profile-signature">{{ form.signature || '这个人很懒，什么都没写～' }}</p>

        <el-divider />

        <div class="profile-meta">
          <p>
            <el-icon><Clock /></el-icon>
            注册于 {{ formatTime(userStore.userInfo?.createTime, 'yyyy-MM-dd') }}
          </p>
          <p>
            <el-icon><Message /></el-icon>
            {{ userStore.userInfo?.email || '未填写邮箱' }}
          </p>
        </div>
      </aside>

      <!-- 右侧：编辑表单 -->
      <section v-loading="loading" class="profile-main blog-card">
        <h2 class="section-title">编辑资料</h2>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="90px"
          label-position="right"
        >
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="展示在文章与评论中的名字" clearable />
          </el-form-item>

          <el-form-item label="头像地址" prop="avatar">
            <el-input v-model="form.avatar" placeholder="图片 URL，留空则使用昵称首字母头像" clearable />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
          </el-form-item>

          <el-form-item label="个人简介" prop="signature">
            <el-input
              v-model="form.signature"
              type="textarea"
              :rows="3"
              maxlength="100"
              show-word-limit
              placeholder="简单介绍一下自己"
            />
          </el-form-item>

          <el-form-item label="新密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="留空表示不修改密码"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSubmit">保存修改</el-button>
            <el-button @click="router.push('/')">返回首页</el-button>
          </el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

/* ---------- 左侧资料卡 ---------- */
.profile-aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px;
  text-align: center;
}

.profile-aside:hover,
.profile-main:hover {
  transform: none;
  box-shadow: var(--blog-shadow);
}

.profile-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
  background: var(--blog-bg);
}

.profile-name {
  margin: 0 0 2px;
  font-size: 17px;
  font-weight: 600;
}

.profile-username {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--blog-text-secondary);
}

.profile-signature {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--blog-text-regular);
}

.profile-meta {
  width: 100%;
  font-size: 12px;
  color: var(--blog-text-secondary);
  text-align: left;
}

.profile-meta p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0;
  word-break: break-all;
}

/* ---------- 右侧表单 ---------- */
.profile-main {
  padding: 24px 28px;
}

@media (max-width: 768px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-main {
    padding: 18px 14px;
  }
}
</style>
