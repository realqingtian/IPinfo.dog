import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

// Local-only review surface; it never calls application or external APIs.
const folder = "docs/archive/m2/m2-ux-02-mobile-icons";
const routes: Record<string, string> = {
  "/zh-CN.png": `${folder}/light-banner-zh-cn.png`,
  "/zh-TW.png": `${folder}/light-banner-zh-tw.png`,
  "/en.png": `${folder}/light-banner-en.png`,
  "/current.png": "public/brand/share-cover-v2.png",
};
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IPinfo.dog 浅色横幅三语预览</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f5f4;color:#292524;font:14px/1.6 -apple-system,BlinkMacSystemFont,sans-serif}main{max-width:980px;margin:32px auto;padding:28px;background:white;border:1px solid #e7e5e4;border-radius:16px}h1{font-size:22px;margin:0}p{margin:8px 0 18px;color:#78716c}nav{display:flex;gap:8px;margin:18px 0}button{font:inherit;border:1px solid #d6d3d1;border-radius:7px;padding:6px 14px;background:white;color:#57534e;cursor:pointer}button[aria-pressed=true]{background:#292524;color:white;border-color:#292524}.card{width:min(600px,100%);border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;margin:0}.card img{display:block;width:100%;aspect-ratio:1.6;object-fit:cover}.card figcaption{padding:12px 18px;background:#fafaf9}.card small{display:block;color:#78716c}.squares{display:flex;gap:30px;flex-wrap:wrap;margin-top:24px}h2{font-size:14px;margin:0 0 10px}.square{width:120px;height:120px;object-fit:cover;border-radius:25px}.warning{font-size:13px;color:#92400e;border-top:1px solid #e7e5e4;padding-top:16px;margin:24px 0 0}@media(max-width:600px){main{margin:12px;padding:20px}h1{font-size:20px}.squares{gap:20px}button{padding:6px 10px}}
</style><main><h1>角色、站名与一句描述</h1><p>浅色横幅设计预览，线上与现有图标保持原版。</p><nav aria-label="预览语言"><button aria-pressed="true" data-locale="zh-CN">简体中文</button><button aria-pressed="false" data-locale="zh-TW">繁體中文</button><button aria-pressed="false" data-locale="en">English</button></nav><figure class="card"><img id="banner" src="/zh-CN.png" alt="IPinfo.dog，你的 IP，一目了然。"><figcaption><b>IPinfo.dog</b><small id="caption">你的 IP，一目了然。</small></figcaption></figure><section class="squares"><div><h2>现用方形分享 LOGO</h2><img class="square" src="/current.png" alt="目前线上居中纯LOGO"></div><div><h2>横幅直接方形裁切 · 角色被截</h2><img class="square" id="crop" src="/zh-CN.png" alt="实际中心裁切，角色被截，文字缩小，不是纯LOGO"></div></section><p class="warning">横幅样式待确认。Safari 曾将同一分享图用于方形缩略图，这版直接裁切会截掉部分角色并缩小文字；纯 LOGO 与横幅暂未接入不同原生位置，不能把两个独立素材当成已解决兼容。</p></main><script>
const copies={'zh-CN':'你的 IP，一目了然。','zh-TW':'你的 IP，一目瞭然。',en:'Your IP, at a glance.'};
document.querySelectorAll('[data-locale]').forEach(button=>button.addEventListener('click',()=>{const locale=button.dataset.locale;document.documentElement.lang=locale;document.querySelectorAll('[data-locale]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.getElementById('banner').src='/'+locale+'.png';document.getElementById('banner').alt='IPinfo.dog，'+copies[locale];document.getElementById('crop').src='/'+locale+'.png';document.getElementById('caption').textContent=copies[locale];}));
</script></html>`;
createServer(async (req, res) => {
  if (req.url === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html); return; }
  const file = routes[req.url ?? ""];
  if (!file) { res.writeHead(404).end(); return; }
  try { res.setHeader("Content-Type", "image/png"); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
}).listen(3101, "127.0.0.1", () => console.log("Brand design preview: http://127.0.0.1:3101"));
