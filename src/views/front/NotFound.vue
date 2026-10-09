<script setup>
/**
 * 404 页面
 *
 * 匹配 /:pathMatch(.*)* 通配路由。
 * 注意：该路由没有挂在 FrontLayout 下，所以是独立整屏页面。
 */
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="nf-content">
      <h1 class="nf-code">404</h1>
      <h2 class="nf-title">页面走丢了</h2>
      <p class="nf-desc">你访问的页面不存在，可能是链接输入错误或文章已被删除。</p>
      <div class="nf-actions">
        <el-button type="primary" size="large" @click="router.push('/')">返回首页</el-button>
        <el-button size="large" @click="router.back()">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--blog-bg);
}

.nf-content {
  text-align: center;
}

.nf-code {
  margin: 0;
  font-size: 120px;
  font-weight: 800;
  line-height: 1;
  color: var(--blog-primary);
  opacity: 0.85;
}

.nf-title {
  margin: 16px 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.nf-desc {
  margin: 0 0 28px;
  font-size: 14px;
  color: var(--blog-text-secondary);
}

.nf-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .nf-code {
    font-size: 80px;
  }
}
</style>
