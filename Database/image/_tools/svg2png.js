// Chuyển danh sách SVG sang PNG. Dùng: node svg2png.js <size> <list.txt>
// list.txt: mỗi dòng một đường dẫn .svg; PNG được ghi cạnh file SVG.
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');
const size = parseInt(process.argv[2] || '512', 10);
const files = fs.readFileSync(process.argv[3], 'utf8').split(/\r?\n/).filter(Boolean);
for (const f of files) {
  const svg = fs.readFileSync(f, 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(f.replace(/\.svg$/i, '.png'), png);
}
console.log(`PNG: ${files.length} file`);
