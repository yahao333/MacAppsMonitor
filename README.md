# Mac App Store Monitor

一个现代化的 React 应用，用于实时监控全球多个国家/地区的 Mac App Store 排行榜。支持查看免费榜和付费榜，提供详细的应用信息、多语言界面以及个性化设置。

## ✨ 功能特性 (Features)

*   **🌍 多国榜单监控**: 支持美国 (US)、中国 (CN)、日本 (JP)、英国 (GB)、德国 (DE)、法国 (FR)、加拿大 (CA)、澳大利亚 (AU) 等主要市场。
*   **📊 实时排行**: 覆盖 **Top Free (免费榜)** 和 **Top Paid (付费榜)**，每小时自动更新数据。
*   **📱 应用详情深度分析**:
    *   高清图标与应用截图预览
    *   实时价格与分类信息
    *   版本号与更新时间
    *   评分与评价人数
    *   一键跳转 Mac App Store
*   **🌐 多语言支持**: 完美支持 **简体中文** 和 **English**，可随时切换。
*   **🎨 现代化 UI**:
    *   响应式设计，适配桌面与移动端
    *   **暗黑模式 (Dark Mode)** 深度适配
    *   平滑的过渡动画与加载反馈
*   **⚡ 高性能**:
    *   基于 LocalStorage 的智能缓存策略，减少不必要的 API 请求
    *   支持自定义数据刷新频率 (1/6/12/24小时)

## 🛠 技术栈 (Tech Stack)

*   **Core**: [React 19](https://react.dev/), TypeScript
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (via CDN)
*   **Data Source**: Apple RSS Feed
*   **Package Manager**: pnpm

## 🚀 快速开始 (Getting Started)

### 前置要求

*   Node.js (推荐 v18+)
*   pnpm

### 安装

1.  克隆项目到本地：
    ```bash
    git clone https://github.com/your-username/MacAppsMonitor.git
    cd MacAppsMonitor
    ```

2.  安装依赖：
    ```bash
    pnpm install
    ```

### 运行开发服务器

```bash
pnpm dev
```
应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
pnpm build
```

## ⚠️ 注意事项

*   **CORS 代理**: 由于浏览器同源策略限制，本项目在前端直接调用 Apple RSS API 时使用了 `corsproxy.io` 和 `allorigins.win` 作为代理服务。这确保了应用可以在纯前端环境下运行而无需配置后端服务器。
*   **数据延迟**: 排行榜数据来源于 Apple RSS Feed，可能会有轻微的更新延迟。

## 📄 License

MIT License
