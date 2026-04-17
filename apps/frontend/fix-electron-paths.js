/**
 * 修复 expo export 生成的 index.html 中绝对路径问题
 * 将 /_expo/ 和 /assets/ 替换为相对路径，以便 Electron loadFile() 正确加载
 * 同时也修复 JS bundle 中 require() 生成的绝对路径 URI
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('[fix-paths] index.html not found in dist/');
  process.exit(1);
}

let content = fs.readFileSync(indexHtml, 'utf-8');

// 将绝对路径转换为相对路径
// href="/_expo/..." -> href="_expo/..."
// src="/_expo/..." -> src="_expo/..."
// href="/assets/..." -> href="assets/..."
// href="/favicon.ico" -> href="favicon.ico"
content = content.replace(/(href|src)="\/(_expo\/[^"]*)"/g, '$1="$2"');
content = content.replace(/(href|src)="\/(assets\/[^"]*)"/g, '$1="$2"');
content = content.replace(/(href|src)="\/(favicon\.ico)"/g, '$1="$2"');

fs.writeFileSync(indexHtml, content, 'utf-8');
console.log('[fix-paths] 已将 index.html 中的绝对路径替换为相对路径');

// 修复 JS bundle 中 require() 生成的绝对路径 URI
// 匹配模式: uri:"/assets/..." 和 uri:'/assets/...'
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
if (fs.existsSync(jsDir)) {
  for (const file of fs.readdirSync(jsDir)) {
    if (file.endsWith('.js')) {
      const jsPath = path.join(jsDir, file);
      let jsContent = fs.readFileSync(jsPath, 'utf-8');
      const original = jsContent;
      jsContent = jsContent.replace(/uri:"\/(assets\/[^"]*)"/g, 'uri:"$1"');
      jsContent = jsContent.replace(/uri:'\/(assets\/[^']*)'/g, "uri:'$1'");
      if (jsContent !== original) {
        fs.writeFileSync(jsPath, jsContent, 'utf-8');
        console.log(`[fix-paths] 已修复 JS bundle 中的绝对路径: ${file}`);
      }
    }
  }
}
