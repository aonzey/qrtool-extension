# Privacy Policy / 隐私政策

**QR Selection Assistant / QR 划词助手**

Last updated / 最后更新：2026-08-27

---

## English

### Overview

QR Selection Assistant is a browser extension that converts selected text into QR codes and decodes QR codes from a selected area of a web page. It is designed to be completely local: **we do not collect, transmit, store, or share any personal data.**

### Data handling

- **No data collection.** The extension does not collect any personal information, browsing history, or usage analytics.
- **No network requests.** All processing (QR generation and decoding) happens locally in your browser. The extension contains no servers, no tracking, no advertising, and no third-party analytics. The only network access you may trigger is opening a decoded link — which you explicitly click yourself.
- **No data storage.** The extension does not use `chrome.storage`, cookies, or any persistent storage. Selected text and captured screenshots exist only temporarily in memory and are discarded immediately after the QR code is generated or decoded.
- **Screenshots.** Region decoding uses the browser's built-in `captureVisibleTab` API to take a temporary screenshot of the current tab. The screenshot is cropped and analyzed in memory, and never leaves your device.
- **Permissions.** `contextMenus` (add the right-click menu item), `activeTab` + `scripting` (inject the QR code UI into the current tab only when you use the feature). No host permissions are requested.

### Changes

If this policy changes, we will update this page and the version number of the extension.

### Contact

Open an issue at https://github.com/aonzey/qrtool-extension/issues

---

## 中文

### 概述

QR 划词助手是一款浏览器扩展，用于将划选的文字转换为二维码，以及框选页面区域识别二维码。本扩展完全在本地运行：**我们不收集、不传输、不存储、不共享任何个人数据。**

### 数据处理

- **不收集任何数据。** 扩展不收集任何个人信息、浏览历史或使用统计。
- **无网络请求。** 所有处理（二维码生成与识别）均在浏览器本地完成。扩展不含服务器、无跟踪、无广告、无第三方统计。您唯一可能触发的网络访问是打开识别出的链接——这需要您亲自点击。
- **不存储数据。** 扩展不使用 `chrome.storage`、Cookie 或任何持久化存储。划选的文字与截图仅临时存在于内存中，生成或识别完成后立即丢弃。
- **关于截图。** 框选识别功能使用浏览器内置的 `captureVisibleTab` API 对当前标签页进行临时截图。截图在内存中裁剪与分析，永远不会离开您的设备。
- **权限说明。** `contextMenus`（添加右键菜单项）、`activeTab` + `scripting`（仅在使用功能时向当前标签页注入二维码界面）。未申请任何主机权限。

### 政策变更

如本政策发生变更，我们将更新本页面并提升扩展版本号。

### 联系方式

请在 https://github.com/aonzey/qrtool-extension/issues 提交 issue
