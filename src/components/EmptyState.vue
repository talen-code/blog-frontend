<script setup>
/**
 * 空状态组件
 *
 * 列表、评论、搜索结果为空时统一使用，避免各页面各写一套。
 * 基于 Element Plus 的 el-empty 做了二次封装，支持自定义插槽与操作按钮。
 */
defineProps({
  /** 提示文案 */
  description: { type: String, default: '暂无数据' },
  /** 图标尺寸 */
  imageSize: { type: Number, default: 100 }
})
</script>

<template>
  <div class="empty-state">
    <el-empty :description="description" :image-size="imageSize">
      <!-- 允许调用方传入自定义内容，例如「去写第一篇文章」按钮 -->
      <slot />
    </el-empty>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  background: #fff;
  border-radius: var(--blog-radius);
}
</style>
