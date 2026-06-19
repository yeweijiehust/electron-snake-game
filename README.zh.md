# 贪吃蛇 - Electron 桌面应用

一个经典的贪吃蛇游戏，基于 **Electron**、**React**、**TypeScript** 和 **Canvas API** 构建的跨平台桌面应用。

## 什么是 Electron？

[Electron](https://www.electronjs.org/) 是一个开源框架，让你可以用 Web 技术（HTML、CSS、JavaScript）构建桌面应用程序。它将 **Chromium** 渲染引擎与 **Node.js** 运行时结合在一起，这意味着你的应用既拥有完整的浏览器环境，又能直接访问文件系统、操作系统级 API 和原生窗口管理。

本项目使用了 Electron 的**三进程架构**：

- **主进程** (`src/main/`) — 创建浏览器窗口，管理应用生命周期
- **预加载脚本** (`src/preload/`) — 通过 `contextBridge` 安全地桥接主进程和渲染进程
- **渲染进程** (`src/renderer/`) — 渲染 React UI 并运行游戏循环

## 功能特性

- **Canvas 渲染画面** — 20×20 网格，街机风格视觉效果
- **键盘控制** — 方向键操控，支持 2 个输入缓存
- **碰撞检测** — 撞墙和撞自己都会结束游戏
- **实时计分** — 每吃一个食物加 1 分，分数实时显示在顶栏
- **中英文切换** — 随时通过顶栏按钮切换语言
- **对局历史** — 最近 10 条记录保存到 `localStorage`，弹窗查看和清空
- **游戏逻辑零外部依赖** — 纯 TypeScript 实现，无需游戏引擎

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面外壳 | Electron 39 |
| UI 框架 | React 19 |
| 编程语言 | TypeScript 5.9 |
| 打包工具 | electron-vite（Vite 7） |
| 游戏渲染 | Canvas 2D API |
| 测试框架 | Vitest + jsdom |
| 安装包生成 | electron-builder |

## 项目结构

```
src/
├── main/index.ts              # Electron 主进程
├── preload/index.ts           # 预加载脚本（contextBridge）
└── renderer/src/
    ├── App.tsx                # 根组件，状态机
    ├── main.tsx               # React 入口
    ├── components/
    │   ├── GameCanvas.tsx     # Canvas + 游戏循环控制器
    │   └── HistoryModal.tsx   # 历史记录弹窗
    ├── game/
    │   ├── types.ts           # Direction, Position, Snake 等类型
    │   ├── snake.ts           # 蛇的移动、碰撞、输入队列
    │   ├── food.ts            # 食物生成（避开蛇身）
    │   ├── renderer.ts        # Canvas 绘制函数
    │   └── gameLoop.ts        # 150ms 间隔的 tick 循环
    ├── i18n/
    │   ├── context.tsx        # I18nProvider + useI18n hook
    │   ├── zh.json            # 中文翻译
    │   └── en.json            # 英文翻译
    └── utils/
        └── history.ts         # localStorage 读写/清空
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

打开 Electron 窗口，支持热重载。

### 运行测试

```bash
npm test
```

Vitest 会执行 18 个单元测试，覆盖蛇的逻辑、食物生成和历史记录工具函数。

### 构建安装包

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

使用 electron-builder 打包为安装程序。

## 操作说明

| 操作 | 按键 |
|------|------|
| 向上移动 | ↑ |
| 向下移动 | ↓ |
| 向左移动 | ← |
| 向右移动 | → |
| 开始 / 重新开始 | 空格 |
| 切换语言 | 顶栏按钮 |
| 查看历史 | 顶栏按钮 |

- 蛇从 20×20 网格中央开始
- 吃红色食物可以变长并增加分数
- 撞墙或撞到自己身体游戏结束
- 最多缓存 2 个方向输入，操控更跟手

## 许可

MIT
