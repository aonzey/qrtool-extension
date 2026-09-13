# QR 划词助手 / QR Selection Assistant

浏览器插件（Chrome / Edge，Manifest V3）

- **中文**：点击图标查看当前网址二维码；划选文字或右键超链接生成二维码；框选页面区域识别二维码。
- **English**: Click the toolbar icon for a QR code of the current URL; select text or right-click a hyperlink to generate a QR code; drag to select any area on a page to decode QR codes.

## 功能 / Features

1. **点击图标查看当前网址二维码 / Click icon → URL QR code**：点击工具栏插件图标，弹出面板自动生成当前页面网址的二维码；可在输入框修改内容（默认当前网址）后点「生成」重新生成。
2. **超链接转二维码 / Right-click link → QR code**：在任意超链接上右键 →「把链接转成二维码："..."」，二维码在页面右上角浮层展示（可拖动、可复制链接地址）。
3. **划选文字生成二维码 / Select text → QR code**：选中任意页面文字 → 右键 →「生成二维码："..."」，二维码在页面右上角浮层展示（可拖动、可复制原文）。
4. **框选识别页面二维码 / Drag region → decode**：点击插件图标弹窗中的「框选识别」按钮（或页面右键 →「框选识别页面二维码」），拖动鼠标框选页面上的二维码，自动解码并弹窗显示结果，支持一键复制 / 打开链接。

## 安装 / Install（开发者模式加载 / Sideload）

1. 打开 Chrome，地址栏输入 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 右上角打开「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本目录（`qrcode-extension` 文件夹）
4. 建议把插件图标固定到工具栏

> 提示：如需在本地 `file://` 页面使用，请在扩展详情页打开「允许访问文件网址」。

## 测试 / Test

打开本目录下的 `test.html`：
- 划选黄色区域的文字 → 右键生成二维码
- 点击插件图标 → 弹窗中点「框选识别」→ 框选页面上的任意二维码 → 查看识别结果

## 多语言 / i18n

扩展内置 **简体中文** 与 **English**，会根据浏览器语言自动切换；默认回退为英文。

- `_locales/zh_CN/messages.json`
- `_locales/en/messages.json`

## 隐私政策 / Privacy Policy

本扩展完全在本地运行，不收集、不传输、不存储任何个人数据。详见：

**[PRIVACY.md](./PRIVACY.md)**

## 文件结构 / Structure

```
manifest.json        扩展清单（MV3）
background.js        Service Worker：右键菜单、按需注入脚本、页面截图、消息路由
popup.html/.css/.js  工具栏弹窗：当前网址二维码、自定义输入生成、框选识别入口
content.js           内容脚本：浮层 UI、二维码生成、框选交互、解码逻辑
libs/                qrcode-generator（生成） / jsQR（识别）
icons/               扩展图标
_locales/            中英多语言消息
store-assets/        商店截图与宣传图
```

## 技术说明 / Notes

- 脚本按需注入，不在所有页面常驻，性能开销小
- 识别基于 `chrome.tabs.captureVisibleTab` 可视区截图 + Canvas 裁剪，对图片二维码、canvas 渲染、跨域图片同样有效
- 解码支持原始 / 2x / 3x 多尺度重试与反色二维码（attemptBoth）
- 划选生成使用 qrcode-generator 自动版本选择，超长文字（>2000 字符截断）会给出提示
- 兼容 Chrome 与 Edge

## 发布 / Releases

由 GitHub Actions 自动构建。每次推送 `v*` 标签即会生成 `crx` + `zip` 并发布到 Releases。

最新 Release：https://github.com/aonzey/qrtool-extension/releases/latest
