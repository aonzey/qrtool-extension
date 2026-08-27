// background.js — MV3 service worker
// 职责：注册右键菜单、按需注入内容脚本、截图、消息中转
// 工具栏图标点击 -> 打开 popup（见 popup.html），框选识别由 popup 按钮触发

chrome.runtime.onInstalled.addListener(() => {
  // 1) 划选文字 -> 生成二维码
  chrome.contextMenus.create({
    id: 'qr-from-selection',
    title: chrome.i18n.getMessage('menuGenQr', ['%s']) || '生成二维码："%s"',
    contexts: ['selection']
  });

  // 2) 框选区域 -> 识别二维码
  chrome.contextMenus.create({
    id: 'qr-decode-region',
    title: chrome.i18n.getMessage('menuDecodeRegion') || '框选识别页面二维码',
    contexts: ['page', 'image', 'link', 'video', 'frame']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'qr-from-selection') {
    let text = info.selectionText || '';
    // 某些页面 selectionText 会缺失，回退到页面里直接取
    if (!text) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        });
        text = results && results[0] && results[0].result ? results[0].result : '';
      } catch (e) { /* ignore */ }
    }
    if (!text) return;
    if (text.length > 2000) text = text.slice(0, 2000); // 二维码容量限制

    const ok = await injectContentScripts(tab.id);
    if (ok) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'showQR', text: text });
      } catch (e) { /* ignore */ }
    }
  }

  if (info.menuItemId === 'qr-decode-region') {
    const ok = await injectContentScripts(tab.id);
    if (ok) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'startRegionSelect' });
      } catch (e) { /* ignore */ }
    }
  }
});

// 按需注入内容脚本（含两个库文件），避免在每个页面常驻
async function injectContentScripts(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['libs/qrcode.min.js', 'libs/jsQR.js', 'content.js']
    });
    return true;
  } catch (e) {
    console.warn('QRTool: 脚本注入失败（chrome:// 或商店等受限页面）', e);
    return false;
  }
}

// 内容脚本 -> 截图 -> 回传给内容脚本解码
// popup -> 框选识别按钮 -> 注入内容脚本并开始框选
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'startRegionSelectFromPopup') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) return;
        const ok = await injectContentScripts(tab.id);
        if (ok) {
          await chrome.tabs.sendMessage(tab.id, { type: 'startRegionSelect' });
        }
      } catch (e) {
        console.warn('QRTool: 无法开始框选识别（可能是受限页面）', e);
      }
    })();
  }

  if (msg && msg.type === 'captureRegion' && sender.tab && sender.tab.id) {
    (async () => {
      const tabId = sender.tab.id;
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        await chrome.tabs.sendMessage(tabId, {
          type: 'decodeImage',
          dataUrl: dataUrl,
          rect: msg.rect,
          dpr: msg.dpr
        });
      } catch (e) {
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'decodeError', error: String(e) });
        } catch (e2) { /* ignore */ }
      }
    })();
  }
  return false;
});
