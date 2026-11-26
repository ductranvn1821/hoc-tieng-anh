/* Thay emoji đồ vật bằng ảnh Microsoft Fluent Emoji (MIT) để hình đẹp và giống nhau trên mọi máy.
   Ảnh ở common/img/emoji/<tên>.png (256px). Thêm emoji mới: thêm dòng vào MAP và chép ảnh tương ứng
   (tạo bằng Database/image/_tools). Trang bật bằng TOPIC emoji_img=True trong file nội dung. */
(function () {
  var MAP = {
    '🛁': 'bathtub',
    '🛏': 'bed',
    '🥣': 'bowl-with-spoon',
    '🧹': 'broom',
    '🐈': 'cat',
    '🐱': 'cat-face',
    '🥢': 'chopsticks',
    '🍚': 'cooked-rice',
    '🍳': 'cooking',
    '🛋': 'couch-and-lamp',
    '🌳': 'deciduous-tree',
    '🚪': 'door',
    '🍽': 'fork-and-knife-with-plate',
    '🖼': 'framed-picture',
    '🥛': 'glass-of-milk',
    '🔨': 'hammer',
    '☕': 'hot-beverage',
    '🏠': 'house',
    '💡': 'light-bulb',
    '👨': 'man',
    '🕰': 'mantelpiece-clock',
    '🛌': 'person-in-bed',
    '🍲': 'pot-of-food',
    '🧻': 'roll-of-paper',
    '🌱': 'seedling',
    '🚿': 'shower',
    '🧼': 'soap',
    '🧽': 'sponge',
    '🥄': 'spoon',
    '🍜': 'steaming-bowl',
    '💦': 'sweat-droplets',
    '👕': 't-shirt',
    '🧸': 'teddy-bear',
    '☎': 'telephone',
    '📺': 'television',
    '🚽': 'toilet',
    '🦷': 'tooth'
  };
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^\/]*$/, '') + 'img/emoji/' : '../common/img/emoji/';
  var keys = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('(' + keys.join('|') + ')\uFE0F?', 'g');
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, INPUT: 1, CANVAS: 1, svg: 1 };

  var css = document.createElement('style');
  css.textContent = 'img.emo-img{height:1em;width:1em;vertical-align:-0.125em;display:inline-block;pointer-events:none;-webkit-user-drag:none;user-select:none}';
  document.head.appendChild(css);

  function swapText(t) {
    var s = t.nodeValue; RE.lastIndex = 0;
    if (!RE.test(s)) return;
    var p = t.parentNode; if (!p || SKIP[p.nodeName] || p.isContentEditable) return;
    var f = document.createDocumentFragment(), last = 0, m; RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      if (m.index > last) f.appendChild(document.createTextNode(s.slice(last, m.index)));
      var img = document.createElement('img');
      img.className = 'emo-img'; img.alt = m[0]; img.draggable = false;
      img.src = BASE + MAP[m[1]] + '.png';
      f.appendChild(img); last = RE.lastIndex;
    }
    if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(f, t);
  }
  function walk(root) {
    if (root.nodeType === 3) { swapText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(swapText);
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') swapText(m.target);
        else for (var i = 0; i < m.addedNodes.length; i++) walk(m.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
