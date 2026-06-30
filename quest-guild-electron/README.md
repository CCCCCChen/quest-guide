# 悬赏任务公会 - Electron 桌面版

RPG游戏风格的目标管理工具，基于 Electron 打包的桌面应用。

## ✨ 功能特性

- 🎮 **RPG游戏风格**：深色魔幻主题，金色/紫色配色，符文装饰元素
- ⚔️ **史诗任务系统**：任务拆解、Boss进度、层级管理
- 💎 **法力水晶机制**：限制每日注意力任务数量，精力管理
- 🌳 **技能树系统**：可视化天赋树，技能点亮与强化
- 🏪 **公会商店**：积分兑换自定义奖励
- 🪟 **悬浮窗模式**：类歌词悬浮效果，悬停展开操作
- 💾 **本地数据存储**：加密本地存储，数据安全不丢失
- 📊 **统计面板**：专注时长、完成数、连续天数等数据

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖

```bash
cd quest-guild-electron
npm install
```

### 开发运行

```bash
npm start
```

### 打包成 exe

```bash
# 打包安装版 + 便携版
npm run build:win

# 仅打包64位安装版
npm run build:win64

# 仅打包便携版
npm run build:portable
```

打包完成后，exe 文件在 `dist` 目录中。

## 📁 项目结构

```
quest-guild-electron/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本（API 桥接）
├── package.json         # 项目配置
├── assets/              # 资源文件
│   ├── icon.ico         # 应用图标（需自行添加）
│   └── icon.png         # 托盘图标（需自行添加）
├── renderer/            # 渲染进程页面
│   └── float.html       # 悬浮窗页面
└── dist/                # 打包输出目录
```

## ⚙️ 配置说明

### 修改应用加载地址

在 `main.js` 中修改 `APP_CONFIG.appUrl`：

```javascript
// 加载在线应用
appUrl: 'https://your-app-url.com'

// 或者加载本地静态文件
appUrl: `file://${path.join(__dirname, 'renderer/index.html')}`
```

### 替换应用图标

1. 准备 `.ico` 格式的图标文件（推荐 256x256）
2. 放入 `assets/icon.ico`
3. 准备 `.png` 格式的托盘图标（16x16 或 32x32）
4. 放入 `assets/icon.png`

### 数据存储

应用数据使用 `electron-store` 加密存储，位置在：

- Windows: `%APPDATA%/quest-guild/quest-guild-data.json`

数据文件已加密，确保用户数据安全。

## 🎯 使用说明

### 主窗口

- 完整功能界面，包含所有模块
- 关闭按钮默认最小化到悬浮窗，不退出应用
- 可通过系统托盘或悬浮窗重新打开

### 悬浮窗

- **收起态**：小型悬浮条，显示任务概览
- **展开态**：鼠标悬停展开，可进行快捷操作
- **拖拽移动**：按住悬浮条可拖动到任意位置
- **位置记忆**：自动记住最后位置

### 系统托盘

- 右键托盘图标显示菜单
- 左键点击切换主窗口显示/隐藏
- 完全退出应用请通过托盘菜单选择「退出」

## 🔧 高级配置

### 开机自启

取消 `main.js` 末尾以下代码的注释：

```javascript
app.setLoginItemSettings({
  openAtLogin: true,
  path: process.execPath
});
```

### 修改悬浮窗尺寸

在 `main.js` 的 `APP_CONFIG` 中调整：

```javascript
floatWidth: 360,        // 悬浮窗宽度
floatHeight: 72,        // 收起态高度
floatExpandedHeight: 500 // 展开态高度
```

### 自定义主题

修改 `renderer/float.html` 中的 CSS 变量和样式。

## 📝 注意事项

1. **图标文件**：首次打包前请确保添加了 `assets/icon.ico` 和 `assets/icon.png`
2. **网络依赖**：默认加载在线应用，需要联网；如需离线使用，请导出静态文件
3. **数据备份**：建议定期通过应用内的导出功能备份数据
4. **Windows  defender**：首次运行可能被 SmartScreen 拦截，点击「更多信息」→「仍要运行」即可

## 🆘 常见问题

**Q: 打包后运行白屏？**
A: 检查 `appUrl` 地址是否正确，确保网络连接正常。

**Q: 悬浮窗不显示？**
A: 检查系统托盘，应用可能在后台运行，点击托盘图标显示。

**Q: 数据丢失了怎么办？**
A: 应用有自动备份机制，可在设置页的备份管理中恢复。

**Q: 如何完全退出应用？**
A: 右键系统托盘图标，选择「退出」。

## 📄 License

MIT License
