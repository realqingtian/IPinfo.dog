# 分享弹窗纯LOGO修正

日期：2026-11-14。状态：实现、本地 / Linux工程、双域名HTTP、像素与裁切预览通过，cover-v2已发布；新原生iOS分享弹窗待反馈。

用户提供三张新截图，明确分享弹窗应该使用LOGO：横封面v1在最近保存中布局正常，但Safari把同一OG图裁成分享弹窗的方形缩略图，造成角色靠边 / 缩小、站名截断；添加收藏仍使用正常LOGO。上一版只充分检查横卡，没有验证同张图的方形裁切，这是本轮要修正的实际回归。原图只保留在本地ops的evidence/ios-cover-sharing-regression。

## 修正方式

- 不假设网页能可靠地给Safari这两处分别强制指定图片，而是将OG分享图本身改成纯LOGO，图内去掉站名。标题仍由原五页三语元数据提供，不重复塞入位图。
- 1200×630 RGB画布，角色540×540居中，位于中心630×630裁切区内；同一资源兼顾方形分享弹窗与1.6 /1.91横卡。文件版本为share-cover-v2.png，保留v1历史资源供缓存页面引用，不重绘、裁改或覆盖品牌原图。
- 原始品牌、favicon、Apple / Android图标、manifest与根回退16项SHA不变，图标声明不变；这只能证明文件保持，不能当作系统缩略图不会改选OG的保证。
- 无新依赖、无UA分支、无新域名 / 端口 / 业务接口、无强刷用户数据；只改生成工具、OG图片地址与新增图像。

参考[Apple链接预览建议](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)：提供高清图标和预览图，避免在图中放易变得难读的字，文字用元数据。具体裁切基于用户截图与模拟，不把这篇Messages建议当作Safari所有界面的保证。

## 当前验证

- [像素与格式](cover-v2-asset-checks.json)：RGB无Alpha、1200×630、原图 / 16项保护文件不变；以RGB与背景差值大于12定义可见主体，实际范围在中心630方形及其内切圆内。明确阈值，极淡抗锯齿 / 噪点不宣称完全保留。
- [138项](cover-v2-unit.log)、[lint](cover-v2-lint.log)、[build](cover-v2-build.log)、[typecheck](cover-v2-typecheck.log)通过，依赖与锁文件未变。
- [本地31项](cover-v2-local-http.json)覆盖16资源与五页三语15组图标 / manifest / OG / Twitter字段，含HEAD内声明。
- [内置浏览器模拟](cover-v2-browser-preview.json)及[桌面](cover-v2-preview.jpg) / [390px](cover-v2-preview-mobile.jpg)对照旧横幅的方形裁切与新纯LOGO的方形 / 横卡：完整角色，无截断站名，全部图片加载、无横向溢出。网页预览不是原生iOS截图。

原生新分享弹窗 / 最近保存仍待用户反馈，主域名既有图标记录与Android条件边界保留。不反复删用户收藏、不清空历史，也不把HTTP成功当作原生视觉已恢复。

## 发布与收尾

| 范围 | 实际证据 |
| --- | --- |
| Linux | Docker内138项与工程构建通过；[禁网候选](cover-v2-linux-candidate.json)含真实三库 / 原页面边界和31项资源元数据检查通过 |
| 公网 | [主域名31项](cover-v2-main-http.json)、[api Safari风格31项](cover-v2-api-http.json)、[核心24项](cover-v2-m1-http.json)通过，封面字节SHA相同，OG / Twitter与三语字段 / HEAD声明正确 |
| 正式浏览器 | [记录](cover-v2-public-browser.json)确认新纯LOGO资源地址和原图标声明，[实际资源图](cover-v2-public-resource.jpg)已加载清晰完整；不能替代原生系统分享弹窗 |

发布m2-ux-02-cover-v2-ad48cfe30db0，[摘要](cover-v2-release-summary.json)记录源包与镜像。Web最终healthy / node / 根与数据只读，网关 / state摘要 / timer保持；首探测连接重置后ready，原始输出留ops。没有新增DNS / 端口或改动其他服务。

临时候选、上传源包、本地3100 /3101及本轮浏览器标签清理，用户旧标签保留。[归档核验](cover-v2-archive-checks.json)确认源包对应源码、16保护文件 / 图标声明与依赖保持、链接 / 机密排除。用户截图只在ops；进度与后续规范同步，本地提交不推送。原生效果和旧卡片刷新不做无证据承诺。
