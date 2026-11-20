/* Trò chơi học từ vựng — dùng chung cho các bài.
   Cách dùng trong một bài học:
     Games.mount(document.getElementById('game1'), {
       type: 'memory',              // memory | balloons | spell | missing | where | shop | count | whack | wheel
       title: 'Lật thẻ tìm cặp', how: 'Cách chơi...',
       items: PETS,                 // [{w, e, vi, ...}]
       speak: speak,                // hàm đọc tiếng Anh của bài
       fx: {yay, oops, toast, confetti, addStars},
       onDone: function(ratio, text){ ... }   // tỉ lệ 0..1, chữ mô tả
     });
   Trò chơi không tự đọc gì khi tải trang; bé bấm "Bắt đầu chơi" mới bắt đầu. */
(function () {
  var G = {};
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function others(list, it, n) { return sample(list.filter(function (x) { return x.w !== it.w; }), n); }
  /* Lượt chơi lần lượt qua các từ, đủ số lượt thì xoay vòng lại */
  function plan(items, rounds) {
    var out = [], pool = [];
    while (out.length < rounds) { if (!pool.length) pool = shuffle(items); out.push(pool.pop()); }
    return out;
  }

  /* ---------- Khung chung: màn bắt đầu, đầu trò chơi, kết quả ---------- */
  function Frame(root, o) {
    var self = this;
    this.root = root; this.o = o;
    var fx = o.fx || {};
    this.fx = {
      yay: fx.yay || function () {}, oops: fx.oops || function () {}, toast: fx.toast || function () {},
      confetti: fx.confetti || function () {}, addStars: fx.addStars || function () {}
    };
    this.say = function (t, opt) { if (o.speak) o.speak(t, opt); };
    this.intro = function (startFn) {
      self.timers();
      root.innerHTML = '<div class="g-intro"><div class="g-intro-emo" aria-hidden="true">' + (o.icon || '🎮') + '</div>' +
        '<h3>' + esc(o.title) + '</h3><p class="vi">' + o.how + '</p>' +
        '<button class="say big g-start">▶ Bắt đầu chơi</button></div>';
      root.querySelector('.g-start').addEventListener('click', startFn);
    };
    this.head = function (label, again) {
      root.innerHTML = '<div class="g-head"><b class="g-title">' + (o.icon || '🎮') + ' ' + esc(o.title) + '</b>' +
        '<span class="g-prog"></span>' + (again ? '<button class="say g-again">🔊 Nghe lại</button>' : '') + '</div>' +
        '<div class="g-body"></div>';
      self.body = root.querySelector('.g-body');
      self.prog = root.querySelector('.g-prog');
      if (again) root.querySelector('.g-again').addEventListener('click', again);
      return self.body;
    };
    this.progress = function (i, n, extra) { self.prog.textContent = (label(i, n)) + (extra ? ' · ' + extra : ''); };
    function label(i, n) { return 'Lượt ' + Math.min(i + 1, n) + '/' + n; }
    var tlist = [];
    this.later = function (fn, ms) { var t = setTimeout(fn, ms); tlist.push(t); return t; };
    this.every = function (fn, ms) { var t = setInterval(fn, ms); tlist.push(t); return t; };
    this.timers = function () { tlist.forEach(function (t) { clearTimeout(t); clearInterval(t); }); tlist = []; };
    this.finish = function (ratio, text, restart) {
      self.timers();
      ratio = clamp(ratio, 0, 1);
      var big = ratio >= 0.85 ? '🏆' : ratio >= 0.6 ? '🥈' : '💪';
      var line = ratio >= 0.85 ? 'Xuất sắc! Excellent!' : ratio >= 0.6 ? 'Giỏi lắm! Chơi lại để được 🏆 nhé!' : 'Cố lên! Chơi lại lần nữa nào!';
      var nst = Math.round(ratio * 5);
      root.innerHTML = '<div class="g-result"><div class="g-big">' + big + '</div><h3>' + esc(text) + '</h3>' +
        '<p class="g-stars">' + new Array(nst + 1).join('⭐') + new Array(5 - nst + 1).join('☆') + '</p>' +
        '<p class="vi">' + line + '</p><button class="say big g-replay">🔄 Chơi lại</button></div>';
      root.querySelector('.g-replay').addEventListener('click', restart);
      self.say(ratio >= 0.85 ? 'Excellent!' : ratio >= 0.6 ? 'Good job!' : 'Keep trying!');
      self.fx.addStars(Math.max(1, Math.round(ratio * 3)));
      if (ratio >= 0.85) self.fx.confetti();
      if (o.onDone) o.onDone(ratio, text);
    };
  }

  /* ========== 1. Lật thẻ tìm cặp ========== */
  G.memory = function (F, o) {
    var items = (o.items || []).slice(0, o.pairs || 6), n = items.length;
    function start() {
      F.head();
      var cards = [];
      items.forEach(function (it, k) {
        cards.push({ k: k, kind: 'pic', it: it });
        cards.push({ k: k, kind: 'word', it: it });
      });
      cards = shuffle(cards);
      var open = [], pairs = 0, misses = 0, lock = false;
      F.body.innerHTML = '<div class="g-mem">' + cards.map(function (c, i) {
        return '<button class="g-card" data-i="' + i + '" aria-label="Thẻ ' + (i + 1) + '"><span class="g-back">❓</span>' +
          '<span class="g-front ' + c.kind + '">' + (c.kind === 'pic' ? c.it.e : esc(c.it.w)) + '</span></button>';
      }).join('') + '</div>';
      function prog() { F.prog.textContent = 'Đã tìm ' + pairs + '/' + n + ' cặp · lật sai ' + misses; }
      prog();
      F.body.querySelector('.g-mem').addEventListener('click', function (e) {
        var b = e.target.closest('.g-card');
        if (!b || lock || b.classList.contains('open')) return;
        var c = cards[+b.getAttribute('data-i')];
        b.classList.add('open');
        F.say(c.it.w);
        open.push({ b: b, c: c });
        if (open.length < 2) return;
        var a = open[0], d = open[1]; open = [];
        if (a.c.k === d.c.k) {
          a.b.classList.add('done'); d.b.classList.add('done');
          a.b.disabled = d.b.disabled = true;
          pairs++; F.fx.yay(); prog();
          if (pairs === n) {
            var ratio = 1 - Math.max(0, misses - n) / (2 * n);
            F.later(function () { F.finish(Math.max(0.4, ratio), 'Tìm đủ ' + n + ' cặp, lật sai ' + misses + ' lần', start); }, 900);
          }
        } else {
          misses++; lock = true; prog();
          F.later(function () { a.b.classList.remove('open'); d.b.classList.remove('open'); lock = false; }, 1000);
        }
      });
    }
    F.intro(start);
  };

  /* ========== 2. Bắt bóng bay: nghe rồi chạm đúng quả bóng ========== */
  G.balloons = function (F, o) {
    var items = o.items, R = o.rounds || 8, COLORS = ['#FF6B5B', '#FFC83D', '#4DB6FF', '#7ED957', '#C38BFF', '#FF8FC7'];
    function start() {
      var order = plan(items, R), r = 0, right = 0, missed = false, target;
      F.head(null, function () { F.say(target.say || target.w); });
      function round() {
        if (r >= R) { F.finish(right / R, 'Bắt đúng ' + right + '/' + R + ' quả bóng', start); return; }
        F.progress(r, R, 'đúng ' + right);
        target = order[r]; missed = false;
        var opts = shuffle([target].concat(others(items, target, Math.min(3, items.length - 1))));
        var cols = shuffle(COLORS);
        F.body.innerHTML = '<p class="g-ask">👂 Nghe cô đọc rồi chạm vào quả bóng đúng</p><div class="g-sky">' + opts.map(function (it, i) {
          var left = (100 / opts.length) * i + (100 / opts.length - 22) / 2;
          return '<button class="g-balloon" data-w="' + esc(it.w) + '" style="left:' + left + '%;--bc:' + cols[i] + ';animation-duration:' + (3 + Math.random() * 2).toFixed(1) + 's;animation-delay:-' + (Math.random() * 5).toFixed(1) + 's" aria-label="' + esc(o.show === 'word' ? it.w : it.vi) + '">' +
            '<span class="g-bl">' + (o.show === 'word' ? '<span class="g-bw">' + esc(it.w) + '</span>' : it.e) + '</span></button>';
        }).join('') + '</div>';
        F.later(function () { F.say(target.say || target.w); }, 300);
        F.body.querySelector('.g-sky').addEventListener('click', function (e) {
          var b = e.target.closest('.g-balloon');
          if (!b || b.disabled) return;
          if (b.getAttribute('data-w') === target.w) {
            if (!missed) right++;
            b.classList.add('pop'); b.querySelector('.g-bl').innerHTML = '💥';
            var all = F.body.querySelectorAll('.g-balloon'); for (var i = 0; i < all.length; i++) all[i].disabled = true;
            F.fx.yay(); F.say(target.w);
            r++; F.later(round, 1100);
          } else {
            missed = true; b.classList.remove('wob'); void b.offsetWidth; b.classList.add('wob');
            F.fx.oops(); F.fx.toast('Nghe lại nhé! 👂', 'try');
            F.later(function () { F.say(target.say || target.w); }, 500);
          }
        });
      }
      round();
    }
    F.intro(start);
  };

  /* ========== 3. Xếp chữ cái thành từ ========== */
  G.spell = function (F, o) {
    var items = o.items.slice(0, o.rounds || 6), R = items.length;
    function start() {
      var r = 0, mistakes = 0, total = 0, it, pos, slots, letters;
      F.head(null, function () { F.say(it.w); });
      function round() {
        if (r >= R) {
          var ratio = 1 - mistakes / Math.max(1, total);
          F.finish(Math.max(0.3, ratio), 'Xếp xong ' + R + ' từ, sai ' + mistakes + ' chữ', start); return;
        }
        F.progress(r, R, 'sai ' + mistakes + ' chữ');
        it = items[r]; pos = 0;
        slots = it.w.split('');
        letters = [];
        slots.forEach(function (ch, i) { if (/[a-z]/i.test(ch)) letters.push({ ch: ch.toLowerCase(), i: i }); });
        total += letters.length;
        var tiles = shuffle(letters);
        F.body.innerHTML = '<div class="g-spell-top"><span class="g-spell-emo">' + it.e + '</span><span class="vi">' + esc(cap(it.vi)) + '</span></div>' +
          '<div class="g-slots">' + slots.map(function (ch, i) {
            return /[a-z]/i.test(ch) ? '<span class="g-slot" data-i="' + i + '"></span>' : '<span class="g-slot gap">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
          }).join('') + '</div>' +
          '<div class="g-tiles">' + tiles.map(function (t) { return '<button class="g-tile" data-ch="' + t.ch + '">' + t.ch + '</button>'; }).join('') + '</div>' +
          '<div class="g-row"><button class="say g-hint">💡 Gợi ý</button></div>';
        F.later(function () { F.say(it.w); }, 300);
      }
      function nextIdx() { return letters[pos] ? letters[pos].i : -1; }
      function place(tile) {
        var slot = F.body.querySelector('.g-slot[data-i="' + nextIdx() + '"]');
        slot.textContent = letters[pos].ch; slot.classList.add('fill');
        tile.disabled = true; tile.classList.add('used');
        pos++;
        if (pos === letters.length) {
          F.body.querySelector('.g-slots').classList.add('ok');
          F.fx.yay(); F.say(it.w);
          r++; F.later(round, 1300);
        }
      }
      function onClick(e) {
        if (!F.body || !F.root.contains(e.target)) return;
        if (e.target.closest('.g-hint')) {
          if (pos >= letters.length) return;
          var want = letters[pos].ch, ts = F.body.querySelectorAll('.g-tile:not(:disabled)');
          for (var i = 0; i < ts.length; i++) { if (ts[i].getAttribute('data-ch') === want) { mistakes++; place(ts[i]); F.progress(r, R, 'sai ' + mistakes + ' chữ'); return; } }
          return;
        }
        var b = e.target.closest('.g-tile');
        if (!b || b.disabled || pos >= letters.length) return;
        if (b.getAttribute('data-ch') === letters[pos].ch) place(b);
        else {
          mistakes++; F.fx.oops(); F.progress(r, R, 'sai ' + mistakes + ' chữ');
          b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad');
        }
      }
      if (F.off) F.off();
      F.root.addEventListener('click', onClick);
      F.off = function () { F.root.removeEventListener('click', onClick); };
      round();
    }
    F.intro(start);
  };

  /* ========== 4. Cái gì biến mất? ========== */
  G.missing = function (F, o) {
    var items = o.items, R = o.rounds || 5, K = Math.min(o.show || 5, items.length);
    function start() {
      var r = 0, right = 0;
      F.head();
      function round() {
        if (r >= R) { F.finish(right / R, 'Đoán đúng ' + right + '/' + R + ' lượt', start); return; }
        F.progress(r, R, 'đúng ' + right);
        var set = sample(items, K), gone = pick(set);
        F.body.innerHTML = '<p class="g-ask">👀 Nhìn kỹ và nhớ các đồ vật nhé! <b class="g-count">5</b></p>' +
          '<div class="g-shelf">' + set.map(function (it) { return '<div class="g-item"><span>' + it.e + '</span><b>' + esc(it.w) + '</b></div>'; }).join('') + '</div>' +
          '<div class="g-row"><button class="say g-ready">✋ Con nhớ rồi!</button></div>';
        var left = 5, tick = F.every(function () {
          left--; var c = F.body.querySelector('.g-count'); if (c) c.textContent = left;
          if (left <= 0) hide();
        }, 1000);
        F.body.querySelector('.g-ready').addEventListener('click', hide);
        var hidden = false;
        function hide() {
          if (hidden) return; hidden = true; clearInterval(tick);
          F.body.innerHTML = '<div class="g-curtain">🙈<p class="vi">Nhắm mắt lại… 1, 2, 3!</p></div>';
          F.later(ask, 1300);
        }
        function ask() {
          var rest = shuffle(set.filter(function (x) { return x !== gone; }));
          var opts = shuffle([gone].concat(sample(rest, 2)));
          F.body.innerHTML = '<p class="g-ask">🤔 What\'s missing? <span class="vi">Cái gì biến mất?</span></p>' +
            '<div class="g-shelf">' + rest.map(function (it) { return '<div class="g-item"><span>' + it.e + '</span><b>' + esc(it.w) + '</b></div>'; }).join('') +
            '<div class="g-item q"><span>❓</span><b>?</b></div></div>' +
            '<div class="g-opts">' + opts.map(function (it) { return '<button class="g-opt" data-w="' + esc(it.w) + '"><span>' + it.e + '</span>' + esc(it.w) + '</button>'; }).join('') + '</div>';
          F.say("What's missing?");
          F.body.querySelector('.g-opts').addEventListener('click', function (e) {
            var b = e.target.closest('.g-opt'); if (!b || b.disabled) return;
            var bs = F.body.querySelectorAll('.g-opt');
            for (var i = 0; i < bs.length; i++) { bs[i].disabled = true; if (bs[i].getAttribute('data-w') === gone.w) bs[i].classList.add('ok'); }
            var q = F.body.querySelector('.g-item.q'); q.innerHTML = '<span>' + gone.e + '</span><b>' + esc(gone.w) + '</b>'; q.classList.add('found');
            if (b.getAttribute('data-w') === gone.w) { right++; F.fx.yay(); F.fx.toast('Đúng rồi! 🎉', 'good'); }
            else { b.classList.add('bad'); F.fx.oops(); F.fx.toast('Đồ bị mất là “' + gone.w + '” 💪', 'try'); }
            F.say('The ' + gone.w + ' is missing!');
            r++; F.later(round, 2000);
          });
        }
      }
      round();
    }
    F.intro(start);
  };

  /* ========== 5. Đồ chơi ở đâu? (in / on / under / next to) ==========
     o.toys: đồ chơi; o.places: [{w, e, vi, preps:['in','on','under','next to']}]; o.mode: 'see' | 'put' */
  var PREP_VI = { 'in': 'ở trong', 'on': 'ở trên', 'under': 'ở dưới', 'next to': 'ở bên cạnh' };
  function sceneHTML(place, toy, prep, targets) {
    var h = '<div class="g-scene"><span class="g-place">' + place.e + '</span>';
    if (toy && prep) h += '<span class="g-toy at-' + prep.replace(' ', '-') + '">' + toy.e + '</span>';
    (targets || []).forEach(function (p) { h += '<button class="g-spot at-' + p.replace(' ', '-') + '" data-p="' + p + '" aria-label="' + PREP_VI[p] + '">?</button>'; });
    return h + '</div>';
  }
  G.where = function (F, o) {
    var R = o.rounds || 6;
    function start() {
      var r = 0, right = 0, cur;
      F.head(null, function () { if (cur) F.say(cur.say); });
      function round() {
        if (r >= R) { F.finish(right / R, 'Làm đúng ' + right + '/' + R + ' lượt', start); return; }
        F.progress(r, R, 'đúng ' + right);
        var place = pick(o.places), toy = pick(o.toys), prep = pick(place.preps);
        var sent = 'The ' + toy.w + ' is ' + prep + ' the ' + place.w + '.';
        if (o.mode === 'put') {
          cur = { say: 'Put the ' + toy.w + ' ' + prep + ' the ' + place.w + '.' };
          var missed = false;
          F.body.innerHTML = '<p class="g-ask">🎧 <b>' + esc(cur.say) + '</b><br><span class="vi">Nghe cô nói rồi chạm vào dấu ? để đặt ' + esc(toy.vi) + ' đúng chỗ</span></p>' +
            '<div class="g-tray"><span>' + toy.e + '</span></div>' + sceneHTML(place, null, null, place.preps);
          F.later(function () { F.say(cur.say); }, 300);
          F.body.querySelector('.g-scene').addEventListener('click', function (e) {
            var b = e.target.closest('.g-spot'); if (!b || b.disabled) return;
            var p = b.getAttribute('data-p'), sc = F.body.querySelector('.g-scene');
            var old = sc.querySelector('.g-toy'); if (old) old.remove();
            var t = document.createElement('span'); t.className = 'g-toy at-' + p.replace(' ', '-'); t.textContent = toy.e; sc.appendChild(t);
            if (p === prep) {
              if (!missed) right++;
              var ss = sc.querySelectorAll('.g-spot'); for (var i = 0; i < ss.length; i++) ss[i].disabled = true;
              F.body.querySelector('.g-tray').classList.add('empty');
              F.fx.yay(); F.fx.toast('Đúng rồi! 🎉', 'good'); F.say(sent);
              r++; F.later(round, 1800);
            } else {
              missed = true; F.fx.oops(); F.fx.toast('Chưa đúng: ' + toy.vi + ' phải ' + PREP_VI[prep] + '. Thử lại nhé!', 'try');
              t.classList.add('bad');
              F.later(function () { if (t.parentNode) t.remove(); }, 900);
            }
          });
        } else {
          cur = { say: "Where's the " + toy.w + '?' };
          var opts = shuffle([prep].concat(sample(['in', 'on', 'under', 'next to'].filter(function (x) { return x !== prep; }), 2)));
          F.body.innerHTML = '<p class="g-ask">🔍 <b>' + esc(cur.say) + '</b> <span class="vi">' + esc(cap(toy.vi)) + ' ở đâu?</span></p>' +
            sceneHTML(place, toy, prep) +
            '<div class="g-opts col">' + opts.map(function (p) { return '<button class="g-opt" data-p="' + p + '">It\'s ' + p + ' the ' + esc(place.w) + '.</button>'; }).join('') + '</div>';
          F.later(function () { F.say(cur.say); }, 300);
          F.body.querySelector('.g-opts').addEventListener('click', function (e) {
            var b = e.target.closest('.g-opt'); if (!b || b.disabled) return;
            var bs = F.body.querySelectorAll('.g-opt');
            for (var i = 0; i < bs.length; i++) { bs[i].disabled = true; if (bs[i].getAttribute('data-p') === prep) bs[i].classList.add('ok'); }
            if (b.getAttribute('data-p') === prep) { right++; F.fx.yay(); F.fx.toast('Đúng rồi! 🎉', 'good'); }
            else { b.classList.add('bad'); F.fx.oops(); F.fx.toast(cap(toy.vi) + ' ' + PREP_VI[prep] + ' ' + place.vi + ' 💪', 'try'); }
            F.say("It's " + prep + ' the ' + place.w + '.');
            r++; F.later(round, 1900);
          });
        }
      }
      round();
    }
    F.intro(start);
  };

  /* ========== 6. Cửa hàng đồ chơi: nghe khách hỏi, lấy đúng số lượng ==========
     o.toys: [{w, pl, e, vi}], o.nums: [{n, w}] */
  G.shop = function (F, o) {
    var R = o.rounds || 5;
    function start() {
      var r = 0, right = 0, cur;
      F.head(null, function () { if (cur) F.say(cur.say); });
      function round() {
        if (r >= R) { F.finish(right / R, 'Bán đúng ' + right + '/' + R + ' lượt khách', start); return; }
        F.progress(r, R, 'đúng ' + right);
        var shelf = sample(o.toys, 4), toy = pick(shelf), num = pick(o.nums), basket = [], missed = false;
        cur = { say: 'Can I have ' + num.w + ' ' + toy.pl + ', please?' };
        var kid = pick(['🧒', '👧', '👦', '👩']);
        F.body.innerHTML = '<div class="g-cust"><span class="g-cust-av">' + kid + '</span><p class="g-cust-say"><b>' + esc(cur.say) + '</b></p></div>' +
          '<p class="vi g-small">Chạm vào món đồ trên kệ để bỏ vào giỏ, đủ rồi bấm 🎁 Đưa hàng.</p>' +
          '<div class="g-stock">' + shelf.map(function (t) { return '<button class="g-stock-it" data-w="' + esc(t.w) + '"><span>' + t.e + '</span>' + esc(t.w) + '</button>'; }).join('') + '</div>' +
          '<div class="g-basket"><span class="g-basket-l">🧺 Giỏ hàng (<b class="g-bn">0</b>)</span><div class="g-basket-in"></div></div>' +
          '<div class="g-row"><button class="say g-undo">↩️ Bỏ bớt</button><button class="say big g-give">🎁 Đưa hàng</button></div>';
        F.later(function () { F.say(cur.say); }, 300);
        function draw() {
          F.body.querySelector('.g-bn').textContent = basket.length;
          F.body.querySelector('.g-basket-in').innerHTML = basket.map(function (t) { return '<span>' + t.e + '</span>'; }).join('');
        }
        F.body.querySelector('.g-stock').addEventListener('click', function (e) {
          var b = e.target.closest('.g-stock-it'); if (!b) return;
          if (basket.length >= 12) { F.fx.toast('Giỏ đầy rồi!', 'try'); return; }
          var t = shelf.filter(function (x) { return x.w === b.getAttribute('data-w'); })[0];
          basket.push(t); draw();
          var c = basket.filter(function (x) { return x === t; }).length;
          F.say(c <= 10 ? ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][c - 1] : t.w);
        });
        F.body.querySelector('.g-undo').addEventListener('click', function () { basket.pop(); draw(); });
        F.body.querySelector('.g-give').addEventListener('click', function () {
          var ok = basket.length === num.n && basket.every(function (x) { return x === toy; });
          if (ok) {
            if (!missed) right++;
            F.fx.yay(); F.say('Thank you! ' + cap(num.w) + ' ' + toy.pl + '!');
            F.body.querySelector('.g-cust-say').innerHTML = '<b>Thank you! 😊</b>';
            F.body.querySelector('.g-give').disabled = true;
            r++; F.later(round, 2000);
          } else {
            missed = true; F.fx.oops();
            var have = basket.filter(function (x) { return x === toy; }).length;
            var msg = basket.some(function (x) { return x !== toy; }) ? 'Khách chỉ cần ' + toy.vi + ' thôi!'
              : have < num.n ? 'Chưa đủ! Khách cần ' + num.n + ' ' + toy.vi + '.' : 'Nhiều quá! Khách cần ' + num.n + ' thôi.';
            F.fx.toast(msg, 'try');
            F.later(function () { F.say(cur.say); }, 400);
          }
        });
      }
      round();
    }
    F.intro(start);
  };

  /* ========== 7. Đếm đồ chơi ========== */
  G.count = function (F, o) {
    var R = o.rounds || 6;
    function start() {
      var r = 0, right = 0, cur;
      F.head(null, function () { if (cur) F.say(cur.say); });
      function round() {
        if (r >= R) { F.finish(right / R, 'Đếm đúng ' + right + '/' + R + ' lượt', start); return; }
        F.progress(r, R, 'đúng ' + right);
        var toy = pick(o.toys), num = pick(o.nums);
        var opts = shuffle([num].concat(sample(o.nums.filter(function (x) { return x !== num; }), 2)));
        cur = { say: 'How many ' + toy.pl + '?' };
        var pile = '';
        for (var i = 0; i < num.n; i++) pile += '<span style="transform:rotate(' + Math.round(Math.random() * 30 - 15) + 'deg)">' + toy.e + '</span>';
        F.body.innerHTML = '<p class="g-ask">🔢 <b>' + esc(cur.say) + '</b> <span class="vi">Có bao nhiêu ' + esc(toy.vi) + '?</span></p>' +
          '<div class="g-pile">' + pile + '</div>' +
          '<div class="g-opts">' + opts.map(function (x) { return '<button class="g-opt" data-n="' + x.n + '">' + esc(cap(x.w)) + '</button>'; }).join('') + '</div>';
        F.later(function () { F.say(cur.say); }, 300);
        F.body.querySelector('.g-opts').addEventListener('click', function (e) {
          var b = e.target.closest('.g-opt'); if (!b || b.disabled) return;
          var bs = F.body.querySelectorAll('.g-opt');
          for (var k = 0; k < bs.length; k++) { bs[k].disabled = true; if (+bs[k].getAttribute('data-n') === num.n) bs[k].classList.add('ok'); }
          if (+b.getAttribute('data-n') === num.n) { right++; F.fx.yay(); F.fx.toast('Đúng rồi! 🎉', 'good'); }
          else { b.classList.add('bad'); F.fx.oops(); F.fx.toast('Đếm lại nhé: có ' + num.n + ' 💪', 'try'); }
          F.say(cap(num.w) + ' ' + toy.pl + '.');
          r++; F.later(round, 1800);
        });
      }
      round();
    }
    F.intro(start);
  };

  /* ========== 8. Đập chuột: nghe câu, đập đúng chú chuột ========== */
  G.whack = function (F, o) {
    var items = o.items, R = o.rounds || 8, H = 6;
    function start() {
      var order = plan(items, R), r = 0, right = 0, missed = false, target, busy = false;
      F.head(null, function () { F.say(target.say || target.w); });
      F.body.innerHTML = '<p class="g-ask">🔨 Nghe cô nói, chú chuột nào cầm đúng đồ thì đập nhé!</p><p class="g-ask g-sent"></p>' +
        '<div class="g-holes">' + new Array(H + 1).join('<div class="g-hole"><button class="g-mole" disabled></button></div>') + '</div>';
      var moles = F.body.querySelectorAll('.g-mole');
      function popUp() {
        var idx = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
        var show = shuffle([target].concat(others(items, target, 2)));
        for (var i = 0; i < H; i++) { moles[i].className = 'g-mole'; moles[i].disabled = true; moles[i].innerHTML = ''; }
        idx.forEach(function (h, k) {
          moles[h].innerHTML = '<span class="g-hold">' + show[k].e + '</span><span class="g-rat">🐭</span>';
          moles[h].setAttribute('data-w', show[k].w);
          moles[h].setAttribute('aria-label', show[k].vi);
          moles[h].disabled = false;
          F.later(function () { moles[h].classList.add('up'); }, 30);
        });
      }
      var loop;
      function round() {
        if (loop) clearInterval(loop);
        if (r >= R) { F.finish(right / R, 'Đập đúng ' + right + '/' + R + ' lượt', start); return; }
        F.progress(r, R, 'đúng ' + right);
        target = order[r]; missed = false; busy = false;
        F.body.querySelector('.g-sent').textContent = '“' + (target.say || target.w) + '”';
        F.say(target.say || target.w);
        popUp();
        loop = F.every(function () { if (!busy) popUp(); }, o.speed || 3200);
      }
      F.body.querySelector('.g-holes').addEventListener('click', function (e) {
        var b = e.target.closest('.g-mole'); if (!b || b.disabled || busy) return;
        if (b.getAttribute('data-w') === target.w) {
          busy = true; if (!missed) right++;
          b.classList.add('hit'); b.querySelector('.g-rat').textContent = '💫';
          F.fx.yay(); F.say(target.say || target.w);
          r++; F.later(round, 1500);
        } else {
          missed = true; F.fx.oops();
          b.classList.add('miss'); b.disabled = true;
          F.fx.toast('Không phải chú này! 👂', 'try');
        }
      });
      round();
    }
    F.intro(start);
  };

  /* ========== 9. Vòng quay ôn tập ========== */
  G.wheel = function (F, o) {
    var items = o.items.slice(0, 8), R = o.rounds || 6, n = items.length, seg = 360 / n;
    var PAL = ['#FFD6E5', '#FFF0B3', '#CDEFFF', '#D4F2D9', '#E6DDFB', '#FFE1B3', '#E6EEF7', '#FDE3E7'];
    function start() {
      var r = 0, right = 0, rot = 0, spinning = false, cur = null;
      F.head(null, function () { if (cur) F.say("What's this?"); });
      var grad = items.map(function (_, i) { return PAL[i % PAL.length] + ' ' + (i * seg) + 'deg ' + ((i + 1) * seg) + 'deg'; }).join(',');
      F.body.innerHTML = '<div class="g-wheel-wrap"><div class="g-pointer">▼</div><div class="g-wheel" style="background:conic-gradient(' + grad + ')">' +
        items.map(function (it, i) { return '<span class="g-sec" style="transform:rotate(' + (i * seg + seg / 2) + 'deg) translateY(calc(-1 * var(--wr))) rotate(-' + (i * seg + seg / 2) + 'deg)">' + it.e + '</span>'; }).join('') +
        '</div></div><div class="g-row"><button class="say big g-spin">🎡 Quay!</button></div><div class="g-wq"></div>';
      var wheel = F.body.querySelector('.g-wheel'), spinBtn = F.body.querySelector('.g-spin'), q = F.body.querySelector('.g-wq');
      function prog() { F.progress(r, R, 'đúng ' + right); }
      prog();
      spinBtn.addEventListener('click', function () {
        if (spinning || r >= R) return;
        spinning = true; spinBtn.disabled = true; q.innerHTML = '';
        var idx = Math.floor(Math.random() * n);
        var want = 360 - (idx * seg + seg / 2);
        var curMod = ((rot % 360) + 360) % 360;
        rot += 360 * 4 + ((want - curMod + 360) % 360);
        wheel.style.transform = 'rotate(' + rot + 'deg)';
        F.later(function () { ask(items[idx]); }, REDUCED ? 200 : 2700);
      });
      function ask(it) {
        cur = it;
        var opts = shuffle([it].concat(others(items, it, 2)));
        q.innerHTML = '<p class="g-ask">🎯 <span class="g-wq-emo">' + it.e + '</span> <b>What\'s this?</b> <span class="vi">Đây là gì?</span></p>' +
          '<div class="g-opts">' + opts.map(function (x) { return '<button class="g-opt" data-w="' + esc(x.w) + '">' + esc(x.w) + '</button>'; }).join('') + '</div>';
        F.say("What's this?");
        q.querySelector('.g-opts').addEventListener('click', function (e) {
          var b = e.target.closest('.g-opt'); if (!b || b.disabled) return;
          var bs = q.querySelectorAll('.g-opt');
          for (var i = 0; i < bs.length; i++) { bs[i].disabled = true; if (bs[i].getAttribute('data-w') === it.w) bs[i].classList.add('ok'); }
          if (b.getAttribute('data-w') === it.w) { right++; F.fx.yay(); F.fx.toast('Đúng rồi! 🎉', 'good'); }
          else { b.classList.add('bad'); F.fx.oops(); F.fx.toast('Đây là “' + it.w + '” 💪', 'try'); }
          F.say(it.say || ("It's " + (/^[aeiou]/i.test(it.w) ? 'an ' : 'a ') + it.w + '.'));
          r++; prog();
          if (r >= R) { F.later(function () { F.finish(right / R, 'Trả lời đúng ' + right + '/' + R + ' lượt quay', start); }, 1800); return; }
          spinning = false; spinBtn.disabled = false;
        });
      }
    }
    F.intro(start);
  };

  /* ---------- CSS ---------- */
  function css() {
    if (document.getElementById('games-css')) return;
    var s = document.createElement('style'); s.id = 'games-css';
    s.textContent =
      '.g-intro,.g-result{display:grid;justify-items:center;gap:8px;text-align:center;padding:10px 0}' +
      '.g-intro-emo,.g-big{font-size:72px;line-height:1}' +
      '.g-intro h3,.g-result h3{font-family:var(--display);font-size:28px;margin:0;line-height:1.15}' +
      '.g-stars{font-size:26px;letter-spacing:2px;color:var(--sun)}' +
      '.g-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}' +
      '.g-title{font-family:var(--display);font-size:22px}' +
      '.g-prog{margin-left:auto;font-weight:800;background:var(--sky);border:2px solid var(--line);border-radius:999px;padding:2px 12px;font-size:14px;font-variant-numeric:tabular-nums}' +
      '.g-ask{text-align:center;font-weight:700;font-size:18px;margin-bottom:10px;text-wrap:balance}' +
      '.g-ask b{font-family:var(--display);font-size:22px}' +
      '.g-small{text-align:center;font-size:14px;margin-bottom:8px}' +
      '.g-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:14px}' +
      '.g-opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:620px;margin:14px auto 0}' +
      '.g-opts.col{grid-template-columns:1fr;max-width:460px}' +
      '.g-opt{background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:10px 8px;font-family:var(--display);font-size:20px;font-weight:800;box-shadow:0 4px 0 var(--ink);display:grid;justify-items:center;gap:2px;line-height:1.15}' +
      '.g-opt span{font-size:38px;line-height:1.1}' +
      '.g-opt:hover:not(:disabled){background:var(--sun-soft)}' +
      '.g-opt:disabled{cursor:default}' +
      '.g-opt.ok{background:var(--grass-soft);border-color:var(--grass);box-shadow:0 4px 0 var(--grass)}' +
      '.g-opt.bad{background:var(--berry-soft);border-color:var(--berry);box-shadow:0 4px 0 var(--berry);animation:shake .4s}' +
      /* memory */
      '.g-mem{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:620px;margin:0 auto}' +
      '.g-card{aspect-ratio:1/1;border:3px solid var(--ink);border-radius:16px;background:var(--coral);box-shadow:0 4px 0 var(--ink);display:grid;place-items:center;padding:4px;min-width:0}' +
      '.g-card .g-back{font-size:34px}.g-card .g-front{display:none}' +
      '.g-card.open{background:var(--paper);animation:pop .3s}.g-card.open .g-back{display:none}.g-card.open .g-front{display:block}' +
      '.g-front.pic{font-size:44px;line-height:1}.g-front.word{font-family:var(--display);font-weight:800;font-size:19px;line-height:1.1;overflow-wrap:anywhere}' +
      '.g-card.done{background:var(--grass-soft);border-color:var(--grass);box-shadow:0 4px 0 var(--grass);cursor:default}' +
      /* balloons */
      '.g-sky{position:relative;height:340px;border-radius:18px;background:linear-gradient(#BFE6FF,#EAF7FF);border:2px solid var(--line);overflow:hidden}' +
      '.g-balloon{position:absolute;top:30%;width:22%;max-width:110px;aspect-ratio:4/5;border:0;background:none;padding:0;animation:g-float ease-in-out infinite alternate}' +
      '.g-balloon .g-bl{display:grid;place-items:center;width:100%;height:100%;border-radius:50% 50% 46% 46%;background:var(--bc);border:3px solid rgba(30,42,74,.35);font-size:clamp(28px,6vw,44px);box-shadow:inset -8px -10px 0 rgba(0,0,0,.08)}' +
      '.g-balloon::after{content:"";position:absolute;left:50%;top:100%;width:2px;height:46px;background:rgba(30,42,74,.4)}' +
      '.g-bw{font-family:var(--display);font-weight:800;font-size:clamp(13px,3.4vw,20px);line-height:1.05;color:var(--ink);background:rgba(255,255,255,.85);border-radius:8px;padding:2px 4px;overflow-wrap:anywhere}' +
      '.g-balloon.pop{animation:pop .4s forwards}.g-balloon.wob{animation:shake .4s}' +
      '@keyframes g-float{0%{transform:translateY(140px)}100%{transform:translateY(-70px)}}' +
      /* spell */
      '.g-spell-top{display:grid;justify-items:center;gap:2px;margin-bottom:10px}.g-spell-emo{font-size:72px;line-height:1.1}' +
      '.g-slots{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:16px}' +
      '.g-slot{width:42px;height:50px;border-bottom:4px solid var(--ink);display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:30px;text-transform:lowercase}' +
      '.g-slot.gap{border-bottom-color:transparent;width:22px}.g-slot.fill{animation:pop .25s}' +
      '.g-slots.ok .g-slot{color:var(--grass);border-bottom-color:var(--grass)}' +
      '.g-tiles{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}' +
      '.g-tile{width:52px;height:52px;border:3px solid var(--ink);border-radius:14px;background:var(--sun-soft);box-shadow:0 4px 0 var(--ink);font-family:var(--display);font-weight:800;font-size:28px}' +
      '.g-tile.used{opacity:.25}.g-tile.bad{background:var(--berry-soft);animation:shake .4s}' +
      /* missing */
      '.g-shelf{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;padding:12px;background:var(--sun-soft);border:3px dashed var(--sun);border-radius:18px}' +
      '.g-item{display:grid;justify-items:center;gap:2px;width:96px;background:var(--paper);border:2px solid var(--line);border-radius:14px;padding:6px 4px}' +
      '.g-item span{font-size:44px;line-height:1.1}.g-item b{font-size:15px;line-height:1.1;text-align:center}' +
      '.g-item.q{border:3px dashed var(--coral)}.g-item.found{border-style:solid;border-color:var(--grass);background:var(--grass-soft);animation:pop .4s}' +
      '.g-curtain{display:grid;place-items:center;gap:6px;font-size:80px;min-height:200px;text-align:center}.g-curtain p{font-size:18px}' +
      '.g-count{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--coral);color:var(--on-coral);font-size:18px}' +
      /* where */
      '.g-scene{position:relative;height:300px;max-width:420px;margin:0 auto;border-radius:18px;background:linear-gradient(#FFF8E6 70%,#F2DEC0 70%);border:2px solid var(--line);overflow:hidden}' +
      '.g-place{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:120px;line-height:1;z-index:2}' +
      '.g-toy{position:absolute;font-size:52px;line-height:1;transform:translate(-50%,-50%);z-index:3;animation:pop .35s}' +
      '.g-toy.bad{filter:grayscale(1);opacity:.6}' +
      '.at-on{left:50%;top:calc(50% - 96px)}' +
      '.at-in{left:50%;top:calc(50% - 30px);z-index:1!important}' +
      '.g-toy.at-in{font-size:56px;top:calc(50% - 80px)}.g-spot.at-in{top:50%}' +
      '.at-under{left:50%;top:calc(50% + 80px)}.g-toy.at-under{top:calc(50% + 72px)}' +
      '.at-next-to{left:calc(50% + 112px);top:calc(50% + 20px)}' +
      '.g-spot{position:absolute;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;border:3px dashed var(--coral);background:rgba(255,255,255,.7);font-family:var(--display);font-weight:800;font-size:24px;color:var(--coral);z-index:4!important}' +
      '.g-spot:hover:not(:disabled){background:var(--sun-soft)}.g-spot:disabled{opacity:0}' +
      '.g-tray{display:grid;place-items:center;width:84px;height:84px;margin:0 auto 10px;border-radius:50%;background:var(--sun-soft);border:3px dashed var(--sun);font-size:50px}' +
      '.g-tray.empty span{visibility:hidden}' +
      /* shop */
      '.g-cust{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:8px}' +
      '.g-cust-av{font-size:54px;line-height:1}' +
      '.g-cust-say{background:var(--sky);border:2px solid var(--line);border-radius:18px 18px 18px 4px;padding:10px 14px;font-size:18px}' +
      '.g-stock{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:560px;margin:0 auto}' +
      '.g-stock-it{background:var(--paper);border:3px solid var(--ink);border-radius:16px;box-shadow:0 4px 0 var(--ink);padding:6px 4px;display:grid;justify-items:center;font-weight:800;font-size:15px;line-height:1.1}' +
      '.g-stock-it span{font-size:42px;line-height:1.15}' +
      '.g-stock-it:active{transform:translateY(2px);box-shadow:0 2px 0 var(--ink)}' +
      '.g-basket{margin:14px auto 0;max-width:560px;border:3px dashed var(--grass);background:var(--grass-soft);border-radius:18px;padding:8px 12px;min-height:84px}' +
      '.g-basket-l{font-weight:800;font-size:15px}.g-basket-in{display:flex;flex-wrap:wrap;gap:2px;font-size:34px;line-height:1.2}' +
      /* count */
      '.g-pile{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:440px;margin:0 auto;padding:14px;background:var(--sun-soft);border-radius:18px;font-size:46px;line-height:1.1}' +
      '.g-pile span{display:inline-block}' +
      /* whack */
      '.g-sent{font-family:var(--display);font-size:24px;color:var(--coral);min-height:32px}' +
      '.g-holes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px;max-width:480px;margin:0 auto}' +
      '.g-hole{position:relative;height:132px;overflow:hidden;border-radius:0 0 50% 50%/0 0 30% 30%}' +
      '.g-hole::after{content:"";position:absolute;left:4%;right:4%;bottom:0;height:34px;border-radius:50%;background:#7A4E2D;box-shadow:inset 0 8px 0 #5A361D;z-index:1}' +
      '.g-mole{position:absolute;left:50%;bottom:0;width:86px;height:124px;margin-left:-43px;border:0;background:none;padding:0;display:grid;justify-items:center;align-content:start;transform:translateY(110%);transition:transform .25s ease;z-index:0}' +
      '.g-mole.up{transform:translateY(0)}' +
      '.g-mole .g-rat{font-size:42px;line-height:1;margin-top:-6px}.g-mole .g-hold{font-size:38px;line-height:1;background:var(--paper);border:3px solid var(--ink);border-radius:14px;padding:4px 6px;position:relative;z-index:2}' +
      '.g-mole.hit{transform:translateY(0) scale(.9)}.g-mole.miss{opacity:.35}' +
      /* wheel */
      '.g-wheel-wrap{position:relative;width:300px;max-width:100%;aspect-ratio:1;margin:0 auto}' +
      '.g-pointer{position:absolute;left:50%;top:-6px;transform:translateX(-50%);z-index:2;color:var(--coral);font-size:34px;line-height:1;text-shadow:0 2px 0 var(--ink)}' +
      '.g-wheel{--wr:104px;position:absolute;inset:14px;border-radius:50%;border:5px solid var(--ink);box-shadow:0 6px 0 var(--ink);transition:transform 2.6s cubic-bezier(.17,.67,.21,1)}' +
      '.g-sec{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;display:grid;place-items:center;font-size:38px;line-height:1}' +
      '.g-wq{min-height:40px;margin-top:10px}.g-wq-emo{font-size:40px;vertical-align:middle}' +
      '@media (max-width:560px){' +
      '.g-mem{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.g-front.pic{font-size:38px}.g-front.word{font-size:16px}' +
      '.g-opts{grid-template-columns:1fr}.g-opt{flex-direction:row}' +
      '.g-item{width:78px}.g-item span{font-size:36px}' +
      '.g-stock{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.g-slot{width:32px;height:42px;font-size:24px}.g-tile{width:46px;height:46px;font-size:24px}' +
      '.g-place{font-size:100px}.at-next-to{left:calc(50% + 96px)}' +
      '.g-wheel-wrap{width:270px}.g-wheel{--wr:90px}.g-sec{font-size:32px}' +
      '.g-holes{gap:10px 6px}.g-mole{width:76px;margin-left:-38px}' +
      '}';
    document.head.appendChild(s);
  }

  window.Games = {
    mount: function (el, o) {
      if (!el || !G[o.type]) return;
      css();
      var F = new Frame(el, o);
      G[o.type](F, o);
      return F;
    },
    types: Object.keys(G)
  };
})();
