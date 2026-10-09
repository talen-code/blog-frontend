# 个人博客系统 · 前端（blog-frontend）

前后端分离个人博客系统的前端工程。

## 技术栈

| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Vue 3 | 全部使用 `<script setup>` 组合式 API |
| 构建 | Vite 5 | 含 `/api` 开发代理 |
| UI 库 | Element Plus 2 | **全量引入**（非 unplugin 按需） |
| 路由 | vue-router 4 | history 模式 + 全局前置守卫 |
| 请求 | axios 1 | 统一拦截器封装 |
| Markdown | md-editor-v3 5 | `MdEditor` 用于后台编辑，`MdPreview` 用于前台渲染（自带 markdown-it 与代码高亮） |
| 状态 | 手写 `reactive` + localStorage | **不使用 Pinia** |
| 图标 | @element-plus/icons-vue | 全量注册 |

> 刻意未引入：Pinia、TypeScript、Tailwind CSS、unplugin-auto-import。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 3. 生产构建（产物在 dist/）
npm run build

# 4. 本地预览构建产物
npm run preview
```

### 后端联调

开发环境下 Vite 已配置代理：

```
浏览器 → http://localhost:5173/api/**  →  Vite proxy  →  http://localhost:8080/api/**
```

因此**开发期不依赖后端 CORS 配置**，只要后端跑在 `http://localhost:8080` 即可。
代理配置见 [`vite.config.js`](./vite.config.js) 的 `server.proxy`。

> 注意：不能给代理加 rewrite 去掉 `/api` 前缀，因为后端接口本身就带 `/api`。

## 环境变量

变量定义在 [`.env.development`](./.env.development)，只有 `VITE_` 前缀的变量会被注入前端。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | axios 的 baseURL，走 Vite 代理 |
| `VITE_API_TIMEOUT` | `15000` | 请求超时（毫秒） |
| `VITE_APP_TITLE` | `个人博客系统` | 页面标题后缀 |

## 与后端的接口约定

- 所有接口以 `/api` 开头，HTTP 状态码永远返回 `200`
- 统一响应体：`{ code, msg, data, timestamp }`，**`code === 200` 才算成功**
- 分页响应体：`{ records, total, page, size, pages }`
- 认证：请求头 `Authorization: Bearer <token>`

### 关键约定（前端已按此实现）

1. **列表接口返回的 `ArticleVO.content` 为 `null`，详情接口才有正文。**
   因此后台文章列表里切换「发布/草稿」开关时，前端会先调
   `GET /api/admin/articles/{id}` 取回完整正文，再 `PUT` 提交，
   避免把正文覆盖成空。见 [`ArticleList.vue`](./src/views/admin/ArticleList.vue) 的 `handleStatusChange`。
2. `POST /api/auth/register` 直接返回 `LoginVO`，注册成功即为登录态。
3. `PUT /api/users/profile` 的 `password` 传空字符串表示不修改密码。
4. 评论接口返回的是**两级树**（顶级评论的 `children` 里是回复）。
   前端额外做了容错：若返回扁平列表，会按 `parentId` 自行组装成树。

## 演示账号

| 用户名 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `admin` | `123456` | ADMIN | 可进入后台管理 |
| `zhangsan` | `123456` | USER | 普通用户 |
| `wangwu` | `123456` | USER | **已禁用**，登录会被拒绝 |

> 数据全部由后端内存 Mock 提供，后端重启后数据重置。

## 目录结构

```
src/
├── main.js                 入口：注册 Element Plus / 图标 / Markdown 组件 / 路由
├── App.vue                 根组件 + 全局样式
├── router/index.js         路由表 + 全局前置守卫（登录/管理员校验）
├── api/
│   ├── request.js          axios 实例 + 请求/响应拦截器（核心）
│   ├── auth.js             登录、注册、登出、当前用户
│   ├── article.js          文章分页、详情、热门、点赞、后台 CRUD
│   ├── category.js         分类 CRUD
│   ├── tag.js              标签 CRUD
│   ├── comment.js          评论树、发表、删除、后台分页
│   ├── user.js             个人资料、后台用户管理
│   └── statistics.js       统计面板数据
├── store/user.js           登录态（reactive + localStorage）
├── utils/format.js         时间/数字格式化、防抖节流、SVG 占位图
├── layouts/
│   ├── FrontLayout.vue     前台布局：导航 + 搜索 + 页脚
│   └── AdminLayout.vue     后台布局：侧边菜单 + 面包屑
├── components/
│   ├── ArticleCard.vue     文章卡片
│   ├── TagChip.vue         彩色标签
│   └── EmptyState.vue      空状态
└── views/
    ├── front/              Home / ArticleDetail / CategoryList / TagList / Login / Register / Profile / NotFound
    └── admin/              Dashboard / ArticleList / ArticleEdit / CategoryManage / TagManage / CommentManage / UserManage
```

## 权限设计

路由 `meta` 上声明权限，由 `router/index.js` 的全局前置守卫统一校验：

| meta | 含义 |
| --- | --- |
| `requiresAuth` | 需要登录，未登录跳 `/login?redirect=当前路径` |
| `requiresAdmin` | 需要管理员，非管理员提示后回首页 |

后台路由挂在 `AdminLayout` 下，父路由已声明 `requiresAuth + requiresAdmin`；
vue-router 4 会合并父子路由的 `meta`，因此所有子路由自动继承该权限要求。

## 401 处理

`api/request.js` 的响应拦截器发现 `code === 401` 时会：

1. 清空本地登录态（token + 用户信息）
2. 提示「登录已过期，请重新登录」
3. 跳转 `/login?redirect=<当前路径>`，登录后可回到原页面

同一批并发请求同时返回 401 时，用一个 `redirecting` 标志位避免重复弹窗和重复跳转。

## 构建产物说明

`vite.config.js` 里做了手动分包，便于浏览器长期缓存：

- `vue` chunk：vue + vue-router
- `element-plus` chunk：element-plus + 图标
- `md-editor` chunk：md-editor-v3

## 已知注意事项

- 封面图与头像默认使用在线占位服务（picsum / dicebear）。
  **离线环境会自动降级为内置 SVG 首字母色块**（见 `utils/format.js` 的 `letterCover` / `letterAvatar`），不会出现破图。
- `md-editor-v3` 的 `MdPreview` 必须显式传 `preview-theme`（该 prop 无默认值），本项目传 `default`。
- 生产部署时若使用 Nginx，history 模式需要配置 `try_files $uri $uri/ /index.html;`。
