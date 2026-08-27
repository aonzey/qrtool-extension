// popup.js — 工具栏弹窗：当前网址二维码 + 自定义内容生成 + 框选识别入口

(function () {
  'use strict';

  // 让 qrcode-generator 正确处理中文（UTF-8 编码）
  try {
    if (typeof qrcode === 'function' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }
  } catch (e) { /* ignore */ }

  var holder = document.getElementById('qr-holder');
  var placeholder = document.getElementById('qr-placeholder');
  var statusEl = document.getElementById('qr-status');
  var input = document.getElementById('qr-input');
  var btnGenerate = document.getElementById('btn-generate');
  var btnDecode = document.getElementById('btn-decode');

  // i18n：取不到消息时回退中文
  function t(key, fallback) {
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  document.getElementById('popup-title').textContent = t('popupTitle', 'QR 二维码工具');
  input.placeholder = t('inputPlaceholder', '输入要生成二维码的内容');
  btnGenerate.textContent = t('btnGenerate', '生成');
  btnDecode.textContent = t('btnDecode', '框选识别');

  /* ---------------------------------------------------------------- *
   *  二维码渲染
   * ---------------------------------------------------------------- */
  function renderQr(text) {
    holder.innerHTML = '';
    statusEl.textContent = '';
    statusEl.classList.remove('err');

    if (!text || !text.trim()) {
      holder.appendChild(placeholder);
      statusEl.textContent = t('errEmpty', '请输入内容');
      statusEl.classList.add('err');
      return;
    }

    try {
      var qr = qrcode(0, 'M'); // 0 = 自动选择版本, M 纠错级别
      qr.addData(text.trim());
      qr.make();
      var svg;
      try {
        svg = qr.createSvgTag({ cellSize: 6, margin: 8 });
      } catch (e) {
        svg = qr.createSvgTag(6, 8); // 兼容旧签名
      }
      holder.innerHTML = svg;
      var svgEl = holder.querySelector('svg');
      if (svgEl) { svgEl.removeAttribute('width'); svgEl.removeAttribute('height'); }
    } catch (e) {
      holder.appendChild(placeholder);
      statusEl.textContent = t('errTooLong', '生成失败：文字过长，超出二维码容量，请缩短后重试');
      statusEl.classList.add('err');
    }
  }

  /* ---------------------------------------------------------------- *
   *  初始化：取当前标签页网址，默认生成其二维码
   * ---------------------------------------------------------------- */
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    var url = tab && tab.url ? tab.url : '';
    // chrome:// 等受限页面拿不到 url 时，回退用标题
    if (!url && tab && tab.title) url = tab.title;
    input.value = url;
    renderQr(url);
  });

  /* ---------------------------------------------------------------- *
   *  交互
   * ---------------------------------------------------------------- */
  btnGenerate.addEventListener('click', function () {
    renderQr(input.value);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') renderQr(input.value);
  });

  // 框选识别：交给 background 注入内容脚本并开始框选，同时关闭弹窗
  btnDecode.addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'startRegionSelectFromPopup' }).catch(function () { /* ignore */ });
    window.close();
  });
})();
