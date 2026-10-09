import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 中文语言包（分页、日期选择器等组件的内置文案）
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// Element Plus 图标库：全量注册，模板里可直接写 <el-icon><Search /></el-icon>
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// Markdown 编辑器与预览器（自带 markdown-it 与代码高亮，无需再引入 marked / highlight.js）
import { MdEditor, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

import App from './App.vue'
import router from './router'

/**
 * 应用入口
 *
 * 技术栈：Vue3 + Vite + Element Plus（全量引入）+ Axios + md-editor-v3
 * 刻意不使用：Pinia（用 store/user.js 手写）、TypeScript、Tailwind、unplugin 自动导入
 */

const app = createApp(App)

/* ---------- 1. 全量注册 Element Plus 图标 ---------- */
// Object.entries 拿到 { Search: Component, Edit: Component, ... }
// 注册后组件名即图标名，例如 <el-icon><Edit /></el-icon>
Object.entries(ElementPlusIconsVue).forEach(([name, component]) => {
  app.component(name, component)
})

/* ---------- 2. 注册 Element Plus（全量引入 + 中文） ---------- */
app.use(ElementPlus, { locale: zhCn })

/* ---------- 3. 注册 Markdown 组件 ---------- */
// 全局注册后，页面里直接写 <MdEditor v-model="form.content" /> 与 <MdPreview :model-value="content" />
app.component('MdEditor', MdEditor)
app.component('MdPreview', MdPreview)

/* ---------- 4. 注册路由 ---------- */
app.use(router)

/* ---------- 5. 全局错误兜底 ---------- */
// 组件渲染期间的未捕获异常会走到这里，方便开发期定位问题
app.config.errorHandler = (err, instance, info) => {
  console.error('[全局异常]', info, err)
}

app.mount('#app')
