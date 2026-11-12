/* Chấm điểm bài học và lưu kết quả — dùng chung cho mọi bài.
   Cách dùng trong một bài học:
     Tracker.init({id:'bai-1-pets', topic:1, title:'Pets', activities:[{id:'quiz', label:'Trắc nghiệm', weight:5, required:true}, ...]});
     Tracker.mark('quiz', 7/8, '7/8 câu đúng');      // tỉ lệ 0..1 và chữ mô tả
     Tracker.mount(document.getElementById('scorePanel'));
   Tổng weight của các phần = 10 (thang điểm 10). */
(function () {
  var CFG = window.APP_CONFIG || {};
  var KEY = 'results:v1';

  function load() { try { var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function store(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function deviceName() { try { return localStorage.getItem('device-name') || ''; } catch (e) { return ''; } }
  function round1(x) { return Math.round(x * 10) / 10; }
  function fmt(n) { return String(round1(n)).replace('.', ','); }
  function comment(s) {
    if (s >= 9) return 'Xuất sắc! 🏆';
    if (s >= 7) return 'Giỏi lắm! 🌟';
    if (s >= 5) return 'Khá rồi, cố thêm chút nữa nhé! 💪';
    return 'Mình ôn lại rồi làm lại nhé! 🌈';
  }

  var lesson = null, marks = {}, started = Date.now(), dirty = false, panel = null, last = null;

  function score() {
    var s = 0;
    lesson.activities.forEach(function (a) { var m = marks[a.id]; if (m) s += a.weight * m.ratio; });
    return round1(s);
  }
  function ready() { return lesson.activities.every(function (a) { return !a.required || marks[a.id]; }); }

  function send(rec) {
    if (!CFG.sheetUrl) return Promise.resolve(false);
    return fetch(CFG.sheetUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: CFG.sheetKey || '', record: rec })
    }).then(function () {
      var all = load();
      all.forEach(function (r) { if (r.id === rec.id) r.synced = true; });
      store(all);
      return true;
    }).catch(function () { return false; });
  }

  var T = {};
  T.config = CFG;
  T.all = load;
  T.fmt = fmt;
  T.comment = comment;

  T.init = function (l) { lesson = l; marks = {}; started = Date.now(); dirty = false; last = null; T.flush(); };

  T.mark = function (id, ratio, text) {
    marks[id] = { ratio: Math.max(0, Math.min(1, ratio || 0)), text: text || '' };
    dirty = true; last = null;
    render();
  };

  T.submit = function () {
    if (!lesson || !ready()) return null;
    var s = score(), parts = {};
    lesson.activities.forEach(function (a) {
      var m = marks[a.id];
      parts[a.id] = m
        ? { label: a.label, ratio: Math.round(m.ratio * 100) / 100, points: round1(a.weight * m.ratio), max: a.weight, text: m.text }
        : { label: a.label, ratio: 0, points: 0, max: a.weight, text: 'Chưa làm' };
    });
    var rec = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      lesson: lesson.id, topic: lesson.topic, title: lesson.title,
      score: s, comment: comment(s), parts: parts,
      minutes: Math.max(1, Math.round((Date.now() - started) / 60000)),
      device: deviceName(), synced: false
    };
    var all = load(); all.push(rec); store(all);
    dirty = false; started = Date.now(); last = rec;
    render();
    send(rec).then(function (ok) { if (ok && last && last.id === rec.id) { last.synced = true; render(); } });
    try { document.dispatchEvent(new CustomEvent('tracker:submit', { detail: rec })); } catch (e) {}
    return rec;
  };

  /* Gửi lại các kết quả chưa gửi được (ví dụ lúc trước mất mạng). */
  T.flush = function () {
    if (!CFG.sheetUrl) return;
    load().filter(function (r) { return !r.synced; }).forEach(send);
  };

  T.mount = function (el) { panel = el; injectCss(); render(); };

  function render() {
    if (!panel || !lesson) return;
    var rows = lesson.activities.map(function (a) {
      var m = marks[a.id], pts = m ? a.weight * m.ratio : 0;
      return '<li class="tk-row' + (m ? ' done' : '') + '">' +
        '<span class="tk-ic" aria-hidden="true">' + (m ? '✅' : '⬜') + '</span>' +
        '<span class="tk-l"><b>' + a.label + '</b><small>' + (m ? m.text : (a.required ? 'Bắt buộc · chưa làm' : 'Chưa làm')) + '</small></span>' +
        '<span class="tk-bar" aria-hidden="true"><i style="width:' + (m ? Math.round(m.ratio * 100) : 0) + '%"></i></span>' +
        '<span class="tk-p">' + fmt(pts) + '<small>/' + a.weight + '</small></span></li>';
    }).join('');
    var ok = ready();
    var need = lesson.activities.filter(function (a) { return a.required && !marks[a.id]; }).map(function (a) { return a.label; });
    var html = '<ul class="tk-list">' + rows + '</ul>' +
      '<div class="tk-sum"><p class="tk-now">Điểm hiện tại <b>' + fmt(score()) + '</b><span>/10</span></p>' +
      '<button class="tk-btn" id="tkSubmit"' + (ok && dirty ? '' : ' disabled') + '>📝 Nộp bài &amp; chấm điểm</button></div>';
    if (!ok) html += '<p class="tk-hint">Làm xong phần ' + need.join(' và ') + ' rồi nộp bài nhé!</p>';
    if (last) {
      var t = new Date(last.at);
      html += '<div class="tk-result" role="status"><div class="tk-big">' + fmt(last.score) + '<span>/10</span></div>' +
        '<div><p class="tk-cmt">' + last.comment + '</p>' +
        '<p class="tk-saved">Đã lưu kết quả lúc ' + t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        (CFG.sheetUrl ? (last.synced ? ' và gửi về file quản lý.' : '. Đang gửi về file quản lý…') : ' trên máy này.') + '</p>' +
        '<a class="tk-link" href="' + (lesson.resultsUrl || '../ket-qua.html') + '">📊 Xem kết quả học</a></div></div>';
    } else if (ok && !dirty) {
      html += '<p class="tk-hint">Đã nộp bài. Muốn có điểm cao hơn, bạn chơi lại các phần rồi nộp lần nữa nhé.</p>';
    }
    panel.innerHTML = html;
    var b = panel.querySelector('#tkSubmit');
    if (b) b.addEventListener('click', function () { T.submit(); });
  }

  function injectCss() {
    if (document.getElementById('tk-css')) return;
    var s = document.createElement('style');
    s.id = 'tk-css';
    s.textContent =
      '.tk-list{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:10px}' +
      '.tk-row{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(60px,160px) auto;gap:12px;align-items:center;background:var(--sky,#E6F4FF);border:2px solid var(--line,#CDE2F4);border-radius:16px;padding:10px 14px}' +
      '.tk-row.done{background:var(--grass-soft,#DDF6E9);border-color:var(--grass,#1E9E62)}' +
      '.tk-ic{font-size:22px}' +
      '.tk-l{display:grid;min-width:0}.tk-l b{font-size:17px}.tk-l small{font-size:14px;font-weight:700;color:var(--ink-soft,#56627F)}' +
      '.tk-bar{height:12px;border-radius:999px;background:var(--paper,#fff);border:2px solid var(--line,#CDE2F4);overflow:hidden}' +
      '.tk-bar i{display:block;height:100%;background:var(--grass,#1E9E62)}' +
      '.tk-p{font-family:var(--display,inherit);font-weight:800;font-size:22px;font-variant-numeric:tabular-nums;white-space:nowrap}.tk-p small{font-size:14px;color:var(--ink-soft,#56627F)}' +
      '.tk-sum{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;border-top:2px dashed var(--line,#CDE2F4);padding-top:14px}' +
      '.tk-now{font-weight:800;font-size:18px}.tk-now b{font-family:var(--display,inherit);font-size:34px;margin-left:6px}.tk-now span{color:var(--ink-soft,#56627F)}' +
      '.tk-btn{background:var(--coral,#FF6B5B);color:var(--on-coral,#fff);border:3px solid var(--ink,#1E2A4A);border-radius:999px;padding:10px 22px;font-weight:800;font-size:18px;box-shadow:0 4px 0 var(--ink,#1E2A4A)}' +
      '.tk-btn:active{transform:translateY(2px);box-shadow:0 2px 0 var(--ink,#1E2A4A)}' +
      '.tk-btn:disabled{background:var(--line,#CDE2F4);color:var(--ink-soft,#56627F);border-color:var(--line,#CDE2F4);box-shadow:none;cursor:not-allowed}' +
      '.tk-hint{margin-top:10px;font-weight:700;color:var(--ink-soft,#56627F)}' +
      '.tk-result{margin-top:16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;background:var(--sun-soft,#FFF3CC);border:3px solid var(--sun,#FFC83D);border-radius:20px;padding:16px 20px}' +
      '.tk-big{font-family:var(--display,inherit);font-weight:800;font-size:64px;line-height:1;color:var(--coral,#FF6B5B)}.tk-big span{font-size:24px;color:var(--ink-soft,#56627F)}' +
      '.tk-cmt{font-family:var(--display,inherit);font-size:24px;font-weight:800}.tk-saved{font-weight:600;color:var(--ink-soft,#56627F)}' +
      '.tk-link{display:inline-block;margin-top:8px;font-weight:800;color:var(--ink,#1E2A4A)}' +
      '@media (max-width:560px){.tk-row{grid-template-columns:auto minmax(0,1fr) auto}.tk-p{grid-row:1;grid-column:3}.tk-bar{grid-row:2;grid-column:2/4}.tk-result{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  window.Tracker = T;
})();
