<script setup>
/**
 * 根组件
 *
 * 仅做两件事：
 * 1. 提供 <router-view /> 出口（真正的布局由 FrontLayout / AdminLayout 承担）；
 * 2. 承载全局样式（非 scoped，作用于整个应用）。
 *
 * 说明：为了让目录结构严格符合约定（不额外增加 styles 目录），
 * 全局样式直接写在根组件里，通过 <style> 不加 scoped 生效。
 */
</script>

<template>
  <router-view />
</template>

<style>
/* ==================== 全局基础样式 ==================== */
:root {
  /* 主题色，与 Element Plus 默认主色保持一致 */
  --blog-primary: #409eff;
  --blog-text: #303133;
  --blog-text-regular: #606266;
  --blog-text-secondary: #909399;
  --blog-border: #ebeef5;
  --blog-bg: #f5f7fa;
  --blog-radius: 10px;
  --blog-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --blog-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', Helvetica, Arial, sans-serif;
  color: var(--blog-text);
  background-color: var(--blog-bg);
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

/* 通用容器：最大宽度 1200px 居中，移动端左右留白 */
.blog-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 卡片：圆角 + 悬停上浮阴影 */
.blog-card {
  background: #fff;
  border-radius: var(--blog-radius);
  box-shadow: var(--blog-shadow);
  transition: all 0.25s ease;
}

.blog-card:hover {
  box-shadow: var(--blog-shadow-hover);
  transform: translateY(-4px);
}

/* 页面主体区域统一下边距 */
.blog-main {
  padding: 24px 0 48px;
}

/* 文本截断工具类 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 标题栏（左侧竖线 + 标题） */
.section-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--blog-text);
}

.section-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 18px;
  margin-right: 8px;
  border-radius: 2px;
  background: var(--blog-primary);
}

/* 对 md-editor-v3 的预览做一点点约束，避免超宽图片撑破布局 */
.md-editor-preview-wrapper img,
.md-editor-preview img {
  max-width: 100%;
  border-radius: 6px;
}

/* 滚动条美化（Webkit） */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: #c8c9cc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a9ac;
}

/* 移动端细微调整 */
@media (max-width: 768px) {
  .blog-main {
    padding: 16px 0 32px;
  }
}
</style>
