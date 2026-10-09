import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite 配置
 *
 * 关键点说明：
 * 1. alias：把 '@' 映射到 src 目录，避免 ../../../ 这种相对路径地狱。
 * 2. server.proxy：开发期把 /api 反向代理到后端 http://localhost:8080。
 *    这样做的好处是浏览器只请求 http://localhost:5173/api/xxx（同源），
 *    不存在跨域，因此开发期完全不依赖后端 CORS 配置。
 *    注意：不能 rewrite 掉 /api 前缀，因为后端接口本身就是以 /api 开头的。
 */
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8082', // 后端地址
        changeOrigin: true,              // 修改请求头中的 Host，避免后端校验 Host 失败
        // 后端 Controller 路径自带 /api（如 @RequestMapping("/api/articles")），
        // 所以这里【不能】写 rewrite 去剥离前缀
        ws: false
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // md-editor-v3 + element-plus 体积较大，放宽警告阈值
    rollupOptions: {
      output: {
        // 手动分包：把体积大且变动少的库拆开，利于浏览器长期缓存
        manualChunks: {
          vue: ['vue', 'vue-router'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          'md-editor': ['md-editor-v3']
        }
      }
    }
  }
})
