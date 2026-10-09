<script setup>
/**
 * 彩色标签组件
 *
 * 用于统一渲染后端 TagVO（含自定义颜色 color）。
 * 使用方式：
 *   <TagChip :tag="{ id: 1, name: 'Vue3', color: '#42B983' }" clickable @click="..." />
 *   或者只传名字：<TagChip name="草稿" color="#E6A23C" />
 */
import { computed } from 'vue'

const props = defineProps({
  /** 完整标签对象（优先使用） */
  tag: { type: Object, default: null },
  /** 只传名字时的简写方式 */
  name: { type: String, default: '' },
  /** 只传颜色时的简写方式 */
  color: { type: String, default: '' },
  /** 尺寸：small / default */
  size: { type: String, default: 'small' },
  /** 是否可点击（鼠标变手型） */
  clickable: { type: Boolean, default: false },
  /** 是否显示为实心（选中态更醒目） */
  effect: { type: String, default: 'light' }
})

const emit = defineEmits(['click'])

/** 标签文字 */
const label = computed(() => props.tag?.name || props.name || '')

/** 标签颜色，缺省用主题蓝 */
const tagColor = computed(() => props.tag?.color || props.color || '#409EFF')

/**
 * 根据自定义颜色计算浅色背景。
 * 后端返回的是十六进制色值（如 #42B983），这里拼一个透明度后缀当背景，
 * 形成「浅底 + 同色文字」的效果，比纯色块更清爽。
 */
const bgColor = computed(() => {
  const c = tagColor.value
  // 支持 #RGB 与 #RRGGBB 两种写法
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return `${c}1a` // 1a ≈ 10% 透明度
  if (/^#[0-9a-fA-F]{3}$/.test(c)) return `${c}1a`
  return 'rgba(64, 158, 255, 0.1)'
})

function handleClick(event) {
  emit('click', event)
}
</script>

<template>
  <span
    class="tag-chip"
    :class="[`tag-chip--${size}`, { 'is-clickable': clickable }]"
    :style="{ color: tagColor, backgroundColor: bgColor, borderColor: bgColor }"
    @click="handleClick"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  line-height: 1;
  white-space: nowrap;
  transition: all 0.2s;
  user-select: none;
}

.tag-chip--small {
  height: 22px;
  padding: 0 10px;
  font-size: 12px;
}

.tag-chip--default {
  height: 28px;
  padding: 0 14px;
  font-size: 13px;
}

.tag-chip.is-clickable {
  cursor: pointer;
}

.tag-chip.is-clickable:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}
</style>
