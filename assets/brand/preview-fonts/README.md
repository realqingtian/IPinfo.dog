# 浅色横幅预览字体

仅供 `scripts/brand/preview-share.ts` 生成设计预览，不在网页加载，也不进入当前 Docker 构建白名单。

- Noto Sans SC 500：Google Fonts 官方子集，v41，字符为 `你的一目了然瞭。，`，许可见 [OFL-SC.txt](OFL-SC.txt)。
- Noto Sans TC 500：Google Fonts 官方子集，v40，字符为 `你的一目瞭然。，`，许可见 [OFL-TC.txt](OFL-TC.txt)。繁体单独用 TC 字形，避免直接沿用简体字形。
- 英文 / 站名使用当前锁定 Next.js 包附带的 Geist-Regular.ttf，不增加字体依赖。

取得日期：2026-11-14。官方来源：[Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)、[Noto Sans TC](https://fonts.google.com/noto/specimen/Noto+Sans+TC)；字形子集由 Google Fonts 的 `text` 参数提供，新增文案时需补齐字符，不依赖生成时联网补字。
