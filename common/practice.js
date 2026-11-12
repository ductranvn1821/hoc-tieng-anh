/* Luyện nghe + luyện nói + tốc độ đọc — dùng chung cho mọi bài.
   Practice.getRate()                       tốc độ đọc hiện tại (0,5–1,3), lưu trên máy
   Practice.mountRateButton(btn)            nút đổi nhanh tốc độ (🐢 / 🚶 / 🐇)
   Practice.mountListening(el, {items:[{en,ipa,vi}], count, speak, onAnswer(ok), onDone(correct, total)})
   Practice.mountSpeaking(el,  {words:[{en,ipa,vi,e}], sentences:[{en,ipa,vi}], speak, onDone(avg0to1, said, total)})
   speak(text, {rateMul}) là hàm đọc của bài học. */
(function () {
  var KEY_RATE = 'speech-rate';
  var PRESETS = [
    { v: 0.6, icon: '🐢', label: 'Chậm' },
    { v: 0.8, icon: '🚶', label: 'Vừa' },
    { v: 1.0, icon: '🐇', label: 'Nhanh' }
  ];
  var rate = 0.8;
  try { var saved = parseFloat(localStorage.getItem(KEY_RATE)); if (saved >= 0.5 && saved <= 1.3) rate = saved; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtRate(v) { return String(Math.round(v * 100) / 100).replace('.', ',') + '×'; }
  function setRate(v) {
    rate = Math.max(0.5, Math.min(1.3, Math.round(v * 100) / 100));
    try { localStorage.setItem(KEY_RATE, rate); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('practice:rate', { detail: rate })); } catch (e) {}
  }
  function nearest(v) { var b = PRESETS[0]; PRESETS.forEach(function (p) { if (Math.abs(p.v - v) < Math.abs(b.v - v)) b = p; }); return b; }
  function isPreset(v) { return PRESETS.some(function (p) { return Math.abs(p.v - v) < 0.001; }); }

  /* tách câu thành từ (bỏ dấu câu) */
  function toks(s) { return String(s).replace(/[.,!?;:“”"]/g, ' ').split(/\s+/).filter(Boolean); }
  var NUM = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' };
  var SAME = { to: 'TWO', two: 'TWO', too: 'TWO', 'for': 'FOUR', four: 'FOUR', ok: 'OKAY', okay: 'OKAY' };
  function normTok(w) {
    w = String(w).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
    return NUM[w] || w;
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function eq(x, y) {
    if (!x || !y) return false;
    if (x === y) return true;
    if (SAME[x] && SAME[x] === SAME[y]) return true;
    if (x + 's' === y || y + 's' === x || x + 'es' === y || y + 'es' === x) return true;
    return x.length >= 4 && y.length >= 4 && lev(x, y) <= 1;
  }
  /* so khớp từ theo thứ tự (LCS), trả về số từ khớp và từ nào của câu mẫu đã nói đúng */
  function match(target, heard) {
    var n = target.length, m = heard.length, dp = [], i, j;
    for (i = 0; i <= n; i++) { dp[i] = []; for (j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = eq(target[i], heard[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var hit = [], k; for (k = 0; k < n; k++) hit.push(false);
    i = 0; j = 0;
    while (i < n && j < m) {
      if (eq(target[i], heard[j])) { hit[i] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    return { count: dp[0][0], hit: hit };
  }
  function scoreAlts(targetText, alts) {
    var t = toks(targetText).map(normTok);
    var best = { ratio: 0, hit: t.map(function () { return false; }), heard: alts[0] || '' };
    alts.forEach(function (a) {
      var r = match(t, toks(a).map(normTok)), ratio = t.length ? r.count / t.length : 0;
      if (ratio > best.ratio) best = { ratio: ratio, hit: r.hit, heard: a };
    });
    return best;
  }
  function starsOf(r) { return r >= 0.85 ? 3 : r >= 0.6 ? 2 : r >= 0.3 ? 1 : 0; }
  function praise(st) {
    return ['Cô chưa nghe rõ, mình thử lại nhé 🌈', 'Cố lên! Nghe mẫu rồi nói lại nhé 🎧', 'Khá lắm! Nói lại các từ màu đỏ nhé 💪', 'Tuyệt vời! Phát âm rất rõ! 🌟'][st];
  }

  var P = {};
  P.getRate = function () { return rate; };
  P.scoreText = function (target, heard) { return scoreAlts(target, [heard]); };
  P.setRate = setRate;

  P.mountRateButton = function (btn) {
    function draw() {
      var p = nearest(rate);
      btn.innerHTML = p.icon + '<span class="lbl"> ' + (isPreset(rate) ? 'Đọc ' + p.label.toLowerCase() : fmtRate(rate)) + '</span>';
      btn.title = 'Tốc độ cô đọc: ' + fmtRate(rate) + ' (bấm để đổi)';
      btn.setAttribute('aria-pressed', rate < 0.75 ? 'true' : 'false');
    }
    btn.addEventListener('click', function () {
      var p = nearest(rate), i = PRESETS.indexOf(p);
      setRate(isPreset(rate) ? PRESETS[(i + 1) % PRESETS.length].v : p.v);
    });
    document.addEventListener('practice:rate', draw);
    draw();
  };

  function rateControl() {
    var w = document.createElement('div');
    w.className = 'pr-rate';
    w.innerHTML = '<span class="pr-rate-l">🎚️ Tốc độ cô đọc</span>' +
      '<div class="pr-presets">' + PRESETS.map(function (p) { return '<button type="button" data-v="' + p.v + '">' + p.icon + ' ' + p.label + '</button>'; }).join('') + '</div>' +
      '<input type="range" min="0.5" max="1.3" step="0.05" aria-label="Tốc độ cô đọc"><output></output>';
    var inp = w.querySelector('input'), out = w.querySelector('output');
    function draw() {
      inp.value = rate; out.textContent = fmtRate(rate);
      var bs = w.querySelectorAll('[data-v]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', Math.abs(+bs[i].getAttribute('data-v') - rate) < 0.001);
    }
    inp.addEventListener('input', function () { setRate(parseFloat(inp.value)); });
    w.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) setRate(+b.getAttribute('data-v')); });
    document.addEventListener('practice:rate', draw);
    draw();
    return w;
  }

  /* ---------------- LUYỆN NGHE: nghe rồi xếp từ thành câu ---------------- */
  P.mountListening = function (el, o) {
    injectCss();
    var pool = o.items.filter(function (it) { var n = toks(it.en).length; return n >= 3 && n <= 8; });
    var seen = {}; pool = pool.filter(function (it) { if (seen[it.en]) return false; seen[it.en] = 1; return true; });
    var st;
    var rc = rateControl(), stage = document.createElement('div');
    el.innerHTML = ''; el.appendChild(rc); el.appendChild(stage);

    function start(auto) { st = { list: shuffle(pool.slice()).slice(0, o.count || 5), i: 0, correct: 0 }; render(auto); }

    function render(auto) {
      var it = st.list[st.i], target = toks(it.en);
      var shown = target.map(function (w, k) { return (k === 0 && !/^I($|')/.test(w)) ? w.charAt(0).toLowerCase() + w.slice(1) : w; });
      var order = target.map(function (_, k) { return k; });
      if (order.length > 1) { do { shuffle(order); } while (order.every(function (v, k) { return v === k; })); }
      var ans = [], done = false;
      var dots = st.list.map(function (_, k) { return '<span class="pr-dot' + (k < st.i ? ' done' : '') + (k === st.i ? ' cur' : '') + '"></span>'; }).join('');
      stage.innerHTML = '<div class="pr-top"><span class="pr-num">Câu ' + (st.i + 1) + '/' + st.list.length + '</span><div class="pr-dots">' + dots + '</div></div>' +
        '<div class="pr-play"><button class="pr-btn big" data-act="play">🔊 Nghe câu</button><button class="pr-btn ghost" data-act="slow">🐢 Nghe chậm hơn</button></div>' +
        '<p class="pr-hint">Nghĩa: ' + esc(it.vi) + '</p>' +
        '<p class="pr-lead">Chạm các từ theo đúng thứ tự bạn nghe được:</p>' +
        '<div class="pr-answer"></div><div class="pr-pool"></div>' +
        '<div class="pr-foot"><button class="pr-btn ghost" data-act="clear">↺ Xếp lại</button><button class="pr-btn" data-act="check" disabled>✔ Kiểm tra</button></div>' +
        '<div class="pr-res" aria-live="polite"></div>';
      var poolEl = stage.querySelector('.pr-pool'), ansEl = stage.querySelector('.pr-answer'), res = stage.querySelector('.pr-res'), chk = stage.querySelector('[data-act=check]');
      function draw() {
        poolEl.innerHTML = order.map(function (k) {
          var used = ans.indexOf(k) >= 0;
          return '<button class="pr-chip' + (used ? ' used' : '') + '" data-p="' + k + '"' + (used || done ? ' disabled' : '') + '>' + esc(shown[k]) + '</button>';
        }).join('');
        ansEl.innerHTML = ans.length ? ans.map(function (k, pos) { return '<button class="pr-chip in" data-a="' + pos + '"' + (done ? ' disabled' : '') + '>' + esc(shown[k]) + '</button>'; }).join('') : '<span class="pr-ph">Câu của bạn sẽ hiện ở đây…</span>';
        chk.disabled = done || ans.length !== target.length;
      }
      stage.onclick = function (e) {
        var b = e.target.closest('button'); if (!b || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act === 'play') { o.speak(it.en); return; }
        if (act === 'slow') { o.speak(it.en, { rateMul: 0.7 }); return; }
        if (act === 'clear') { if (!done) { ans = []; draw(); } return; }
        if (b.hasAttribute('data-p')) { ans.push(+b.getAttribute('data-p')); draw(); return; }
        if (b.hasAttribute('data-a')) { ans.splice(+b.getAttribute('data-a'), 1); draw(); return; }
        if (act === 'check') {
          done = true;
          var got = ans.map(function (k) { return target[k].toLowerCase(); }).join(' ');
          var ok = got === target.join(' ').toLowerCase();
          if (ok) st.correct++;
          ansEl.classList.add(ok ? 'ok' : 'bad');
          var last = st.i === st.list.length - 1;
          res.innerHTML = (ok ? '<p class="pr-ok">✅ Đúng rồi! Giỏi quá!</p>' : '<p class="pr-bad">Chưa đúng rồi. Câu đúng là:</p>') +
            '<p class="pr-target">' + esc(it.en) + '</p><p class="pr-ipa">' + esc(it.ipa) + '</p>' +
            '<button class="pr-btn" data-act="next">' + (last ? 'Xem kết quả 🏆' : 'Câu tiếp ➜') + '</button>';
          draw();
          if (o.onAnswer) o.onAnswer(ok);
          setTimeout(function () { o.speak(it.en); }, 300);
          return;
        }
        if (act === 'next') { st.i++; if (st.i < st.list.length) render(true); else finish(); }
      };
      draw();
      if (auto) setTimeout(function () { o.speak(it.en); }, 300);
    }

    function finish() {
      var n = st.list.length;
      stage.innerHTML = '<div class="pr-result"><div class="pr-big">' + st.correct + '<span>/' + n + '</span></div>' +
        '<div><p class="pr-cmt">' + (st.correct === n ? 'Tai nghe siêu thật! 🎧🌟' : st.correct >= n / 2 ? 'Giỏi lắm! Luyện thêm chút nữa nhé 💪' : 'Mình nghe chậm lại rồi luyện tiếp nhé 🐢') + '</p>' +
        '<p class="pr-hint">Bạn xếp đúng ' + st.correct + ' trên ' + n + ' câu.</p>' +
        '<button class="pr-btn" data-act="again">🔄 Luyện nghe lại</button></div></div>';
      stage.onclick = function (e) { if (e.target.closest('[data-act=again]')) start(true); };
      if (o.onDone) o.onDone(st.correct, n);
    }
    start(false);
  };

  /* ---------------- LUYỆN NÓI: thu âm + chấm điểm phát âm ---------------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  P.mountSpeaking = function (el, o) {
    injectCss();
    var short = function (s) { var n = toks(s.en).length; return n >= 2 && n <= 7; };
    var seen = {};
    var sents = shuffle(o.sentences.filter(short).filter(function (s) { if (seen[s.en]) return false; seen[s.en] = 1; return true; })).slice(0, 3);
    var words = shuffle(o.words.slice()).slice(0, 3);
    var items = words.concat(sents).map(function (it) { return { en: it.en, ipa: it.ipa, vi: it.vi, e: it.e || '', best: null, url: null }; });

    el.innerHTML = '';
    el.appendChild(rateControl());
    var note = document.createElement('p');
    note.className = 'pr-note';
    note.innerHTML = SR
      ? 'Bấm <b>🔊 Nghe mẫu</b>, rồi bấm <b>🎙️ Thu âm</b> và nói to, rõ ràng. Cô nghe và chấm ngay. Lần đầu máy hỏi quyền dùng micro, bố mẹ bấm <b>Cho phép</b> nhé.'
      : 'Máy này chưa tự chấm được giọng nói (nên mở bằng Chrome hoặc Edge). Bạn vẫn thu âm và nghe lại được, rồi bố mẹ chấm sao giúp nhé.';
    var list = document.createElement('div');
    list.className = 'pr-speak-list';
    items.forEach(function (it, i) {
      var c = document.createElement('article');
      c.className = 'pr-say';
      c.setAttribute('data-i', i);
      c.innerHTML = '<div class="pr-say-t"><p class="pr-target">' + (it.e ? '<span class="pr-emo">' + it.e + '</span> ' : '') + esc(it.en) + '</p>' +
        '<p class="pr-ipa">' + esc(it.ipa) + '</p><p class="pr-vi">' + esc(it.vi) + '</p></div>' +
        '<div class="pr-say-b"><button class="pr-btn ghost" data-act="model">🔊 Nghe mẫu</button>' +
        '<button class="pr-btn rec" data-act="rec"' + (canRecord || SR ? '' : ' disabled') + '>🎙️ Thu âm</button>' +
        '<button class="pr-btn ghost" data-act="mine" hidden>▶ Nghe giọng mình</button></div>' +
        '<div class="pr-say-r" aria-live="polite"></div>';
      list.appendChild(c);
    });
    var sum = document.createElement('p');
    sum.className = 'pr-sum';
    sum.textContent = 'Nói hết ' + items.length + ' câu để được chấm điểm phần nói nhé!';
    el.appendChild(note); el.appendChild(list); el.appendChild(sum);

    function update() {
      var n = items.length, said = 0, total = 0;
      items.forEach(function (it) { if (it.best != null) { said++; total += it.best; } });
      var avg = total / n;
      sum.innerHTML = 'Đã nói <b>' + said + '/' + n + '</b> câu · điểm nói <b>' + Math.round(avg * 100) + '%</b>' + (said < n ? ' · nói tiếp các câu còn lại nhé!' : ' · xong phần nói rồi! 🎉');
      if (o.onDone) o.onDone(avg, said, n);
    }

    function showScore(card, it, ratio, hit, heard) {
      it.best = Math.max(it.best || 0, ratio);
      var s = starsOf(ratio), res = card.querySelector('.pr-say-r');
      var words = toks(it.en).map(function (w, k) { return '<span class="' + (hit && hit[k] ? 'w-ok' : 'w-miss') + '">' + esc(w) + '</span>'; }).join(' ');
      res.innerHTML = '<div class="pr-score s' + s + '"><span class="pr-stars">' + '★★★'.slice(0, s) + '<i>' + '★★★'.slice(s) + '</i></span>' +
        '<b>' + Math.round(ratio * 100) + '%</b><span>' + praise(s) + '</span></div>' +
        (hit ? '<p class="pr-words">' + words + '</p>' : '') +
        (heard ? '<p class="pr-heard">Cô nghe được: “' + esc(heard) + '”</p>' : '');
      card.classList.toggle('good', s >= 2);
      update();
    }
    function selfRate(card, it, msg) {
      var res = card.querySelector('.pr-say-r');
      res.innerHTML = '<p class="pr-heard">' + msg + '</p><div class="pr-self">Bố mẹ chấm: ' +
        '<button class="pr-btn ghost" data-self="0.33">★</button><button class="pr-btn ghost" data-self="0.67">★★</button><button class="pr-btn ghost" data-self="1">★★★</button></div>';
    }

    var active = null;
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var card = b.closest('.pr-say'), it = items[+card.getAttribute('data-i')], act = b.getAttribute('data-act');
      if (act === 'model') { if (!active) o.speak(it.en); return; }
      if (act === 'mine') { if (it.url) { try { new Audio(it.url).play(); } catch (err) {} } return; }
      if (b.hasAttribute('data-self')) { showScore(card, it, +b.getAttribute('data-self'), null, ''); return; }
      if (act === 'rec') {
        if (active) { if (active.card === card) active.stop(); return; }
        record(card, it, b);
      }
    });

    function record(card, it, btn) {
      var res = card.querySelector('.pr-say-r');
      var stream = null, rec = null, chunks = [], recog = null;
      var srDone = !SR, recDone = !canRecord, finished = false, alts = [], err = '', interim = '';
      var timer = null;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      btn.classList.add('on'); btn.innerHTML = '⏹ Dừng';
      res.innerHTML = '<p class="pr-live"><span class="pr-rdot"></span> Đang nghe… bạn nói đi nào!</p>';

      function finalize() {
        if (!(srDone && recDone) || finished) return;
        finished = true; active = null; clearTimeout(timer);
        btn.classList.remove('on'); btn.innerHTML = '🎙️ Thu lại';
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (chunks.length) {
          if (it.url) URL.revokeObjectURL(it.url);
          it.url = URL.createObjectURL(new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' }));
          card.querySelector('[data-act=mine]').hidden = false;
        }
        if (alts.length) { var r = scoreAlts(it.en, alts); showScore(card, it, r.ratio, r.hit, r.heard); return; }
        if (err === 'not-allowed' || err === 'mic') { res.innerHTML = '<p class="pr-heard">Máy chưa cho dùng micro. Bố mẹ bấm biểu tượng 🔒 trên thanh địa chỉ, chọn <b>Cho phép micro</b> rồi thử lại nhé.</p>'; return; }
        if (!SR || err === 'network' || err === 'service-not-allowed' || err === 'language-not-supported') {
          selfRate(card, it, SR ? 'Máy chưa chấm tự động được (cần có mạng). Bạn nghe lại giọng mình rồi bố mẹ chấm nhé.' : 'Bạn nghe lại giọng mình rồi bố mẹ chấm nhé.');
          return;
        }
        res.innerHTML = '<p class="pr-heard">Cô chưa nghe thấy gì 🙉. Bạn nói to hơn, gần micro hơn rồi thử lại nhé!</p>';
      }
      function stopAll() {
        clearTimeout(timer);
        if (recog && !srDone) { try { recog.stop(); } catch (e) { srDone = true; } }
        if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (e) { recDone = true; } }
        finalize();
      }
      active = { card: card, stop: stopAll };

      function startRecognition() {
        if (!SR) return;
        recog = new SR();
        recog.lang = 'en-US'; recog.interimResults = true; recog.maxAlternatives = 5; recog.continuous = false;
        recog.onresult = function (e) {
          interim = '';
          for (var i = e.resultIndex; i < e.results.length; i++) {
            var r = e.results[i];
            if (r.isFinal) { for (var k = 0; k < r.length; k++) alts.push(r[k].transcript); }
            else interim += r[0].transcript;
          }
          if (interim) res.innerHTML = '<p class="pr-live"><span class="pr-rdot"></span> Cô đang nghe: “' + esc(interim) + '”</p>';
        };
        recog.onerror = function (e) { err = e.error || 'error'; };
        recog.onend = function () {
          srDone = true;
          if (!alts.length && interim) alts.push(interim);
          if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (e) { recDone = true; } }
          finalize();
        };
        try { recog.start(); } catch (e) { srDone = true; err = 'error'; }
      }

      if (canRecord) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          if (finished) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = s;
          try {
            rec = new MediaRecorder(s);
            rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = function () { recDone = true; finalize(); };
            rec.start();
          } catch (e) { recDone = true; }
          startRecognition();
          timer = setTimeout(stopAll, SR ? 9000 : 5000);
        }).catch(function () { err = 'mic'; srDone = true; recDone = true; finalize(); });
      } else {
        startRecognition();
        timer = setTimeout(stopAll, 9000);
      }
    }
  };

  function injectCss() {
    if (document.getElementById('pr-css')) return;
    var s = document.createElement('style');
    s.id = 'pr-css';
    s.textContent =
      '.pr-rate{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;background:var(--sky,#E6F4FF);border:2px solid var(--line,#CDE2F4);border-radius:16px;padding:10px 14px;margin-bottom:16px}' +
      '.pr-rate-l{font-weight:800}' +
      '.pr-presets{display:flex;gap:6px;flex-wrap:wrap}' +
      '.pr-presets button{background:var(--paper,#fff);border:2px solid var(--line,#CDE2F4);border-radius:999px;padding:3px 12px;font-weight:800;font-size:14px}' +
      '.pr-presets button.on{background:var(--sun,#FFC83D);border-color:var(--ink,#1E2A4A)}' +
      '.pr-rate input{flex:1;min-width:120px;accent-color:var(--coral,#FF6B5B)}' +
      '.pr-rate output{font-weight:800;font-variant-numeric:tabular-nums;min-width:48px;text-align:right}' +
      '.pr-btn{display:inline-flex;align-items:center;gap:6px;background:var(--sun,#FFC83D);border:2px solid var(--ink,#1E2A4A);border-radius:999px;padding:7px 16px;font-weight:800;box-shadow:0 3px 0 var(--ink,#1E2A4A);cursor:pointer}' +
      '.pr-btn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink,#1E2A4A)}' +
      '.pr-btn.ghost{background:var(--paper,#fff)}' +
      '.pr-btn.big{font-size:19px;padding:10px 22px}' +
      '.pr-btn:disabled{background:var(--line,#CDE2F4);border-color:var(--line,#CDE2F4);color:var(--ink-soft,#56627F);box-shadow:none;cursor:not-allowed}' +
      '.pr-btn.rec{background:var(--coral,#FF6B5B);color:var(--on-coral,#fff)}' +
      '.pr-btn.rec.on{background:var(--berry,#D93A55);animation:prPulse 1s ease-in-out infinite}' +
      '.pr-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}.pr-num{font-weight:800}' +
      '.pr-dots{display:flex;gap:6px}.pr-dot{width:12px;height:12px;border-radius:50%;background:var(--line,#CDE2F4)}.pr-dot.done{background:var(--grass,#1E9E62)}.pr-dot.cur{background:var(--coral,#FF6B5B)}' +
      '.pr-play{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:10px}' +
      '.pr-hint{text-align:center;font-weight:700;color:var(--ink-soft,#56627F)}' +
      '.pr-lead{font-weight:800;margin:14px 0 8px}' +
      '.pr-answer{min-height:58px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;border:3px dashed var(--line,#CDE2F4);border-radius:16px;background:var(--paper,#fff)}' +
      '.pr-answer.ok{border-style:solid;border-color:var(--grass,#1E9E62);background:var(--grass-soft,#DDF6E9)}' +
      '.pr-answer.bad{border-style:solid;border-color:var(--berry,#D93A55);background:var(--berry-soft,#FDE3E7)}' +
      '.pr-ph{color:var(--ink-soft,#56627F);font-weight:600}' +
      '.pr-pool{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center}' +
      '.pr-chip{font-family:var(--display,inherit);font-size:22px;font-weight:800;background:var(--paper,#fff);border:2px solid var(--ink,#1E2A4A);border-radius:12px;padding:4px 14px;box-shadow:0 3px 0 var(--ink,#1E2A4A);cursor:pointer}' +
      '.pr-chip.in{background:var(--sun-soft,#FFF3CC)}' +
      '.pr-chip.used{visibility:hidden}' +
      '.pr-chip:disabled{cursor:default}' +
      '.pr-foot{display:flex;justify-content:center;gap:10px;margin-top:14px;flex-wrap:wrap}' +
      '.pr-res{display:grid;justify-items:center;gap:4px;margin-top:12px;text-align:center}' +
      '.pr-ok{font-weight:800;color:var(--grass,#1E9E62);font-size:18px}.pr-bad{font-weight:800;color:var(--berry,#D93A55)}' +
      '.pr-target{font-family:var(--display,inherit);font-size:22px;font-weight:800;line-height:1.2}' +
      '.pr-ipa{font-family:var(--ipa,inherit);color:var(--ink-soft,#56627F)}' +
      '.pr-vi{font-weight:600;color:var(--ink-soft,#56627F)}' +
      '.pr-res .pr-btn{margin-top:8px}' +
      '.pr-result{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;background:var(--sun-soft,#FFF3CC);border:3px solid var(--sun,#FFC83D);border-radius:20px;padding:16px 20px}' +
      '.pr-big{font-family:var(--display,inherit);font-weight:800;font-size:60px;line-height:1;color:var(--coral,#FF6B5B)}.pr-big span{font-size:24px;color:var(--ink-soft,#56627F)}' +
      '.pr-cmt{font-family:var(--display,inherit);font-size:22px;font-weight:800}.pr-result .pr-hint{text-align:left;margin-bottom:8px}' +
      '.pr-note{font-weight:600;color:var(--ink-soft,#56627F);margin-bottom:12px}' +
      '.pr-speak-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}' +
      '.pr-say{display:grid;gap:10px;align-content:start;background:var(--sky,#E6F4FF);border:2px solid var(--line,#CDE2F4);border-radius:18px;padding:12px 14px;min-width:0}' +
      '.pr-say.good{background:var(--grass-soft,#DDF6E9);border-color:var(--grass,#1E9E62)}' +
      '.pr-emo{font-size:26px}' +
      '.pr-say-b{display:flex;flex-wrap:wrap;gap:8px}.pr-say-b .pr-btn{font-size:15px;padding:6px 12px}' +
      '.pr-live{font-weight:800;color:var(--berry,#D93A55);display:flex;align-items:center;gap:8px}' +
      '.pr-rdot{width:12px;height:12px;border-radius:50%;background:var(--berry,#D93A55);animation:prPulse 1s infinite}' +
      '.pr-score{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-weight:700}' +
      '.pr-score b{font-family:var(--display,inherit);font-size:24px}' +
      '.pr-stars{font-size:22px;color:var(--sun,#FFC83D);letter-spacing:1px}.pr-stars i{font-style:normal;color:var(--line,#CDE2F4)}' +
      '.pr-words{font-family:var(--display,inherit);font-size:20px;font-weight:800}' +
      '.pr-words .w-ok{color:var(--grass,#1E9E62)}.pr-words .w-miss{color:var(--berry,#D93A55);text-decoration:underline wavy}' +
      '.pr-heard{font-size:14px;font-weight:600;color:var(--ink-soft,#56627F)}' +
      '.pr-self{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-weight:800;margin-top:6px}' +
      '.pr-sum{margin-top:14px;font-weight:700;text-align:center}' +
      '@keyframes prPulse{50%{opacity:.55}}' +
      '@media (prefers-reduced-motion:reduce){.pr-btn.rec.on,.pr-rdot{animation:none}}' +
      '@media (max-width:620px){.pr-speak-list{grid-template-columns:1fr}.pr-result{grid-template-columns:1fr}.pr-chip{font-size:19px}}';
    document.head.appendChild(s);
  }

  window.Practice = P;
})();
