// content.js — 划词二维码生成 + 框选区域二维码识别
// 通过 background.js 按需注入（附带 libs/qrcode.min.js 与 libs/jsQR.js）

(function () {
  'use strict';
  if (window.__QR_TOOL_LOADED__) return; // 防止重复注入导致监听器叠加
  window.__QR_TOOL_LOADED__ = true;

  // 让 qrcode-generator 正确处理中文（UTF-8 编码）
  try {
    if (typeof qrcode === 'function' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }
  } catch (e) { /* ignore */ }

  var HOST_ID = '__qr-tool-host__';
  var Z_TOP = 2147483646;

  // i18n：优先取 _locales 消息，取不到则回退中文
  function t(key, fallback) {
    try {
      var m = chrome.i18n.getMessage(key);
      return m || fallback;
    } catch (e) {
      return fallback;
    }
  }

  /* ---------------------------------------------------------------- *
   *  消息入口
   * ---------------------------------------------------------------- */
  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'showQR') {
      showQrPanel(msg.text);
    } else if (msg.type === 'startRegionSelect') {
      startRegionSelect();
    } else if (msg.type === 'decodeImage') {
      decodeImage(msg.dataUrl, msg.rect, msg.dpr);
    } else if (msg.type === 'decodeError') {
      showResultPanel(null, t('errCapture', '截图失败：') + (msg.error || t('errUnknown', '未知错误')));
    }
  });

  /* ---------------------------------------------------------------- *
   *  浮层面板（Shadow DOM，避免被页面样式污染）
   * ---------------------------------------------------------------- */
  function getHost() {
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position:fixed;top:0;left:0;z-index:' + Z_TOP + ';width:0;height:0;';
      document.documentElement.appendChild(host);
      var root = host.attachShadow({ mode: 'open' });
      root.innerHTML = buildPanelHtml();
      bindPanelEvents(root);
    }
    return host;
  }

  function buildPanelHtml() {
    return '' +
    '<style>' +
      '.panel{position:fixed;top:24px;right:24px;width:320px;background:#fff;border:1px solid #dcdfe6;' +
      'border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font:13px/1.6 -apple-system,"Segoe UI",' +
      '"Microsoft YaHei",sans-serif;color:#303133;overflow:hidden;user-select:none;}' +
      '.panel.dragging{opacity:.92}' +
      '.head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f5f7fa;' +
      'border-bottom:1px solid #ebeef5;cursor:move;font-weight:600;font-size:13px;}' +
      '.head .badge{width:8px;height:8px;border-radius:50%;background:#1677ff;flex:none}' +
      '.head .title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.head .btn-close{flex:none;width:22px;height:22px;line-height:22px;text-align:center;border:none;' +
      'background:transparent;border-radius:6px;cursor:pointer;color:#909399;font-size:15px;font-weight:700}' +
      '.head .btn-close:hover{background:#e8eaee;color:#303133}' +
      '.body{padding:14px 16px 16px}' +
      '.qr-wrap{display:flex;justify-content:center;padding:10px;background:#fff;border:1px solid #ebeef5;' +
      'border-radius:8px}' +
      '.qr-wrap svg{display:block;max-width:100%;height:auto}' +
      '.text-box{margin-top:12px;padding:8px 10px;background:#f5f7fa;border-radius:8px;border:1px solid #ebeef5;' +
      'font-size:12px;color:#606266;max-height:120px;overflow:auto;word-break:break-all;white-space:pre-wrap;' +
      'user-select:text}' +
      '.shot{display:block;max-width:100%;max-height:180px;margin:0 auto;border:1px solid #ebeef5;border-radius:8px}' +
      '.status{padding:4px 2px 0;font-size:12px;color:#909399}' +
      '.status.err{color:#f56c6c}' +
      '.foot{display:flex;gap:8px;margin-top:14px}' +
      '.btn{flex:1;padding:7px 10px;border:none;border-radius:8px;cursor:pointer;font-size:13px;' +
      'background:#1677ff;color:#fff;transition:background .15s}' +
      '.btn:hover{background:#409eff}' +
      '.btn.plain{background:#f0f2f5;color:#606266}' +
      '.btn.plain:hover{background:#e8eaee}' +
      '.btn:only-child{flex:1}' +
    '</style>' +
    '<div class="panel" id="qr-panel" style="display:none">' +
      '<div class="head"><span class="badge"></span><span class="title">' + t('panelQrTitle', '已生成二维码') + '</span>' +
      '<button class="btn-close" data-act="close" title="' + t('btnClose', '关闭') + '">×</button></div>' +
      '<div class="body">' +
        '<div class="qr-wrap" id="qr-holder"></div>' +
        '<div class="text-box" id="qr-text"></div>' +
        '<div class="foot">' +
          '<button class="btn plain" data-act="copy-qr">' + t('btnCopyText', '复制文字') + '</button>' +
          '<button class="btn" data-act="close">' + t('btnClose', '关闭') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="panel" id="result-panel" style="display:none">' +
      '<div class="head"><span class="badge"></span><span class="title">' + t('panelResultTitle', '二维码识别结果') + '</span>' +
      '<button class="btn-close" data-act="close" title="' + t('btnClose', '关闭') + '">×</button></div>' +
      '<div class="body">' +
        '<div style="text-align:center;margin-bottom:10px" id="shot-holder"></div>' +
        '<div class="text-box" id="result-text" contenteditable="true" spellcheck="false"></div>' +
        '<div class="status" id="result-status"></div>' +
        '<div class="foot" id="result-foot">' +
          '<button class="btn plain" data-act="copy-result">' + t('btnCopy', '复制') + '</button>' +
          '<button class="btn" data-act="open-url" style="display:none">' + t('btnOpenUrl', '打开链接') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindPanelEvents(root) {
    root.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'close') {
        hidePanels(root);
      } else if (act === 'copy-qr') {
        copyText(root.getElementById('qr-text').textContent, btn);
      } else if (act === 'copy-result') {
        copyText(root.getElementById('result-text').textContent, btn);
      } else if (act === 'open-url') {
        var url = btn.getAttribute('data-url');
        if (url) window.open(url, '_blank');
      }
    });
    makeDraggable(root, root.querySelector('.panel'));
    makeDraggable(root, root.querySelectorAll('.panel')[1]);
  }

  function hidePanels(root) {
    root.getElementById('qr-panel').style.display = 'none';
    root.getElementById('result-panel').style.display = 'none';
  }

  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = t('copied', '已复制');
      setTimeout(function () { btn.textContent = old; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  function makeDraggable(root, panel) {
    if (!panel) return;
    var head = panel.querySelector('.head');
    head.addEventListener('mousedown', function (ev) {
      if (ev.target.closest('button')) return;
      var startX = ev.clientX, startY = ev.clientY;
      var rect = panel.getBoundingClientRect();
      var offX = startX - rect.left, offY = startY - rect.top;
      panel.classList.add('dragging');
      function onMove(e) {
        panel.style.left = Math.max(0, Math.min(window.innerWidth - rect.width, e.clientX - offX)) + 'px';
        panel.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offY)) + 'px';
        panel.style.right = 'auto';
      }
      function onUp() {
        panel.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      ev.preventDefault();
    });
  }

  /* ---------------------------------------------------------------- *
   *  功能一：划选文字 -> 生成二维码
   * ---------------------------------------------------------------- */
  function showQrPanel(text) {
    var root = getHost().shadowRoot;
    var panel = root.getElementById('qr-panel');
    var holder = root.getElementById('qr-holder');
    var textBox = root.getElementById('qr-text');
    holder.innerHTML = '';
    textBox.textContent = '';

    try {
      var qr = qrcode(0, 'M'); // 0 = 自动选择版本, M 纠错级别
      qr.addData(text);
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
      holder.innerHTML = '<div style="color:#f56c6c;font-size:12px;padding:16px 8px">' +
        t('errTooLong', '生成失败：文字过长，超出二维码容量，请缩短后重试') + '</div>';
    }
    textBox.textContent = text.length > 500 ? text.slice(0, 500) + '…' : text;

    hidePanels(root);
    panel.style.display = 'block';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '24px';
  }

  /* ---------------------------------------------------------------- *
   *  功能二：框选区域 -> 识别二维码
   * ---------------------------------------------------------------- */
  function startRegionSelect() {
    removeRegionOverlay();

    var overlay = document.createElement('div');
    overlay.id = '__qr-tool-region__';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:' + Z_TOP +
      ';background:rgba(0,0,0,.12);cursor:crosshair;';

    var hint = document.createElement('div');
    hint.textContent = t('hintSelect', '拖动鼠标框选二维码区域，按 Esc 取消');
    hint.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:' + Z_TOP +
      ';background:#1677ff;color:#fff;padding:8px 18px;border-radius:20px;font:13px/1 "Segoe UI",' +
      '"Microsoft YaHei",sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;white-space:nowrap;';
    overlay.appendChild(hint);

    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;display:none;border:2px solid #1677ff;' +
      'background:rgba(22,119,255,.12);box-shadow:0 0 0 9999px rgba(0,0,0,0);';
    overlay.appendChild(box);

    var startX = 0, startY = 0, dragging = false;

    function onDown(e) {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.display = 'block';
      box.style.left = startX + 'px';
      box.style.top = startY + 'px';
      box.style.width = '0';
      box.style.height = '0';
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var x = Math.min(startX, e.clientX);
      var y = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX);
      var h = Math.abs(e.clientY - startY);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      var x = Math.min(startX, e.clientX);
      var y = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX);
      var h = Math.abs(e.clientY - startY);
      cleanup();
      if (w < 8 || h < 8) return; // 误触，忽略
      chrome.runtime.sendMessage({
        type: 'captureRegion',
        rect: { x: x, y: y, w: w, h: h },
        dpr: window.devicePixelRatio || 1
      }).catch(function () { /* ignore */ });
    }

    function onKey(e) {
      if (e.key === 'Escape') cleanup();
    }

    function cleanup() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      document.removeEventListener('keydown', onKey, true);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    }

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('mousedown', onDown);
    document.documentElement.appendChild(overlay);
  }

  function removeRegionOverlay() {
    var old = document.getElementById('__qr-tool-region__');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  /* ---------------------------------------------------------------- *
   *  截图解码
   * ---------------------------------------------------------------- */
  function decodeImage(dataUrl, rect, dpr) {
    var img = new Image();
    img.onload = function () {
      var MARGIN = 6; // 适当外扩，补回二维码静区
      var sx = Math.max(0, Math.round(rect.x * dpr) - MARGIN);
      var sy = Math.max(0, Math.round(rect.y * dpr) - MARGIN);
      var sw = Math.min(img.width - sx, Math.round(rect.w * dpr) + MARGIN * 2);
      var sh = Math.min(img.height - sy, Math.round(rect.h * dpr) + MARGIN * 2);
      if (sw <= 0 || sh <= 0) {
        showResultPanel(null, t('errInvalidRegion', '选区无效，请重新框选'));
        return;
      }

      var canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      var croppedUrl = null;
      try { croppedUrl = canvas.toDataURL('image/png'); } catch (e) { /* ignore */ }

      // 多尺度尝试：原始 / 2x / 3x（小图或模糊图提高成功率）
      var result = null;
      var scales = [1, 2, 3];
      for (var i = 0; i < scales.length && !result; i++) {
        result = tryDecode(canvas, scales[i]);
      }

      if (result && result.data) {
        showResultPanel({
          text: result.data,
          image: croppedUrl
        });
      } else {
        showResultPanel({ image: croppedUrl }, t('errNotFound', '未识别到二维码，请尽量框选完整、清晰的二维码后重试'));
      }
    };
    img.onerror = function () {
      showResultPanel(null, t('errImageLoad', '截图加载失败，请重试'));
    };
    img.src = dataUrl;
  }

  function tryDecode(srcCanvas, scale) {
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    var cw = Math.round(w * scale);
    var ch = Math.round(h * scale);
    if (cw > 4000 || ch > 4000 || cw < 1 || ch < 1) return null;

    var work = document.createElement('canvas');
    work.width = cw;
    work.height = ch;
    var ctx = work.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, cw, ch);

    var data = ctx.getImageData(0, 0, cw, ch);
    try {
      return jsQR(data.data, cw, ch, { inversionAttempts: 'attemptBoth' });
    } catch (e) {
      return null;
    }
  }

  /* ---------------------------------------------------------------- *
   *  结果面板
   * ---------------------------------------------------------------- */
  function showResultPanel(result, errMsg) {
    var root = getHost().shadowRoot;
    var panel = root.getElementById('result-panel');
    var shotHolder = root.getElementById('shot-holder');
    var textBox = root.getElementById('result-text');
    var status = root.getElementById('result-status');
    var openBtn = null;
    var foot = root.getElementById('result-foot');
    openBtn = foot.querySelector('[data-act="open-url"]');

    shotHolder.innerHTML = '';
    status.textContent = '';
    status.classList.remove('err');
    textBox.textContent = '';

    if (result && result.image) {
      var shot = new Image();
      shot.src = result.image;
      shot.className = 'shot';
      shotHolder.appendChild(shot);
    }

    if (errMsg) {
      status.textContent = errMsg;
      status.classList.add('err');
      textBox.textContent = result && result.text ? result.text : '';
      openBtn.style.display = 'none';
      openBtn.removeAttribute('data-url');
    } else if (result && result.text) {
      textBox.textContent = result.text;
      var isUrl = /^https?:\/\/\S+$/i.test(result.text.trim());
      if (isUrl) {
        openBtn.style.display = '';
        openBtn.setAttribute('data-url', result.text.trim());
      } else {
        openBtn.style.display = 'none';
        openBtn.removeAttribute('data-url');
      }
    }

    hidePanels(root);
    panel.style.display = 'block';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '24px';
  }
})();
