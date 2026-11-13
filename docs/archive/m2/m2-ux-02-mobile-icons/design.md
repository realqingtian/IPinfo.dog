# 移动端网站图标方案

日期：2026-11-14。

## 场景与依据

用户截图是 Safari 收藏 / 添加收藏界面的图标，不是网页内导航 Logo。此前只有透明品牌 PNG 的普通 icon 链接，没有 Apple touch icon 或 Android manifest。由此判断专用资源缺失是可修正的问题；截图不足以确定 iOS 缓存与系统套底各占多少影响，不能保证改网页就强制刷新所有旧收藏。

| 场景 | 资源尺寸 | 处理 |
| --- | --- | --- |
| iPhone Retina 收藏 / Web Clip | 180 × 180 | 显式 apple-touch-icon |
| iPad Retina / 其他常见 iPad | 167 × 167 / 152 × 152 | 按尺寸分别声明 |
| 浏览器标签 / 收藏 | 32 × 32 / 48 × 48 | PNG 与双帧 ICO 回退 |
| Android 普通高清图标 | 192 × 192 / 512 × 512 | manifest purpose=any |
| Android 自适应主屏幕图标 | 192 × 192 / 512 × 512 | 单独 purpose=maskable，不复用普通版本 |

Apple 尺寸参考是[已归档的 Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)，对应网站 Web Clip；不是把原生应用 1024px 交付要求套在网站上。[当前 Apple HIG](https://developer.apple.com/design/human-interface-guidelines/app-icons)用于方形、完整背景、由系统裁切等原则参考。Android 尺寸见 [Google manifest 指南](https://web.dev/articles/add-manifest)，裁切安全区与分离 any / maskable 见 [Google maskable 指南](https://web.dev/articles/maskable-icon)；字段定义见 [MDN icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons)。研究日期不等于来源文档最后发布日期，系统实际选择仍须真机确认。

## 品牌与构图

- 原始 assets/brand/logo.png 保持字节不变；导航 Logo 的布局与引用不改。
- 衍生图标使用 Next ImageResponse 原生排版：全幅奶油色 #f4eee7 背景，与角色毛色协调；无透明角、无嵌套方框、无预设圆角或额外阴影。普通 / Apple 版本原图按整个画布等比排布，不额外缩小主体。
- maskable 单独按 68% 画布排布，背景仍铺满。原图可见主体（alpha ≥16/255）及重采样余量在半径 40% 的中央安全圆内；原图极低透明边缘不作为角色必要轮廓。圆形 / 圆角方形 / 最小安全区经过网页预览。这个版本不宣称角色填满每种形状，也不把必要安全区误当成普通图标留白。
- 新文件带 v2，减少与旧普通 PNG 地址缓存冲突；保留根路径 apple-touch-icon.png 和 favicon.ico 回退。
- site-v2.webmanifest 只提供品牌、图标、根路径与 browser 显示方式；无 Service Worker、离线能力、弹窗安装或新账号功能。Android 桌面最终是否使用 maskable、是否进一步归一化取决于浏览器和桌面实现。

## 后续维护

`bun run brand:icons` 重新生成，脚本校验已批准原图 SHA-256。调整衍生资源时同步版本化文件、manifest、layout 元数据与验证记录，不能只换一张文件却遗漏其他入口。图标生成不在请求时进行；PNG / ICO 随版本发布，不改业务 API / 国际化。

旧收藏可能继续使用设备缓存，必要时删除该收藏后重新添加。不能保证仅刷新页面能更新 Safari / Android 已存储图标；不要求用户清空全部浏览记录。没有实际设备验收时明确保留待验。
