# 深灰品牌横幅与方形分享兼容

日期：2026-11-14。任务：M2-UX-02。状态：用户否决，已要求退回cover-v2；本轮尝试与原始验证作为历史保留，不是当前采用方案。

用户截图确认 cover-v2 的分享弹窗、添加收藏与 API 新收藏 / 历史小图标正常；最近保存的大预览仅缺少所需的品牌介绍布局。用户明确选择「角色＋站名横幅」，提供竞品品牌介绍卡片，并授权实现深灰底、品牌角色、站名与现有功能介绍。原始截图含个人浏览内容，仅留本地 ops，不公开上传。主域名旧记录仍显示旧图，不据此声称当前两个入口发布版本不同。

## 构图与兼容

- 1200×630 深灰 RGB PNG，主文案「看清你的网络出口」，站名 IPinfo.dog，功能为 IP 查询 / IPv6 / 分流检测 / WebRTC，不放分数、检测结果、用户地址或查询目标。
- 本设备实测 Safari 复用 OG 图到方形分享缩略图，因此将角色放在中央，文字分列两侧，中央 x=285..914 的 630×630 区域只保留角色。方形缩略图背景随分享图改为深灰；Apple / favicon / Android 图标原来的浅色背景和文件保持，不承诺系统选图完全不变。
- 1.6:1 横卡会进一步裁掉左右各约96像素，文案也须留在该范围内；同时检查1200×630原尺寸、1.6:1横卡及1:1圆角裁切。网页预览仅模拟，不能替代原生系统截图。
- 新资源 share-cover-v3.png；保留此前版本供旧页面引用。只更新 OG 资源地址，五页的三语标题 / 描述继承保持；该品牌图文字为固定简体中文，不宣称位图已有三语版本。
- 新增官方 Noto Sans SC 中文子集及 OFL 许可供本地生成，Latin 使用锁定 Next.js 附带的 Geist；字体不在页面中加载，无新依赖。整个过程不修改品牌原图，也不运行图标生成器。

Apple 的[链接预览说明](https://developer.apple.com/videos/play/tech-talks/205/)指出预览图可能替代图标；[TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)建议同时提供高清图标和预览图，避免依赖图片中的文字。这里遵从用户要品牌横幅的选择，通过裁切安全区兼容，未找到可保证分别控制 Safari 两个原生位置的网页接口，不添加 UA 分支或臆造元标签。

## 验证与发布

- [像素与格式](cover-v3-asset-checks.json)：1200×630 / RGB无Alpha，16项保护文件不变，依赖 / 锁文件与图标声明不变。中央630方形与独立生成的同背景纯LOGO参考逐像素相同；文字实际范围左120..238、右935..1088，均在1.6横卡96..1103范围内。
- [138项测试](cover-v3-unit.log)、[lint](cover-v3-lint.log)、[构建](cover-v3-build.log)、[类型](cover-v3-typecheck.log)通过；静态图无新增镜像单元测试。
- [本地31项HTTP](cover-v3-local-http.json)：16资源字节 / MIME、五页三语15组HEAD内图标 / manifest / OG / Twitter与标题描述检查通过。
- [内置浏览器](cover-v3-browser-preview.json)的[桌面](cover-v3-preview.jpg) / [390px](cover-v3-preview-mobile.jpg)预览无横向溢出、图片完整加载。1:1保持角色无文字，1.6横卡文字及角色完整；这仅为网页裁切模拟，不是iOS系统截图。
- 字体生成离线与确定性检查通过（禁止HTTP/HTTPS，只允许内嵌data资源）；首次禁止所有fetch误拦截了渲染器加载资源，调整检查口径后通过，未修改实际生成器绕过网络限制。原始运维输出留ops。

## 发布与收尾

- Linux Docker 内138项与工程通过，[禁网候选](cover-v3-linux-candidate.json)包含真实三库查询、五页原业务边界及31项图标 / 分享元数据检查通过。
- [主站31项](cover-v3-main-http.json)、[api域名Safari风格31项](cover-v3-api-http.json)、[核心24项](cover-v3-m1-http.json)公网检查全部通过。Safari风格UA只是HTTP模拟，不是iOS原生验收。
- [正式内置浏览器记录](cover-v3-public-browser.json)确认新版OG / Apple声明、36px导航图加载和真实查询结果；[上线资源截图](cover-v3-public-resource.jpg)、[查询页](cover-v3-public-query.jpg)独立保留。

发布 m2-ux-02-cover-v3-7cf7a105696d，见[版本摘要](cover-v3-release-summary.json)。Web healthy、node用户、根目录和数据只读；网关、数据库状态摘要和每日timer与本轮部署前一致。首次健康探测连接重置后ready，原始日志留ops；未改DNS / 端口或其他业务。

临时候选、上传源包、本地3100 /3101和本轮浏览器标签已清理，用户旧标签保留。原图 /16项保护文件、图标声明、依赖与锁文件未变。原计划收尾时用户否决，转为恢复旧版并归档该次尝试；本地文档提交、不推送。

## 用户否决与恢复

用户随后反馈「不好看」，明确要求退回提出竞品类似效果之前、执行者询问大预览样式时的版本，即浅色底居中纯LOGO cover-v2。已停止该横幅方向，恢复原生成器、OG路径、Docker排除规则和AGENTS /路线图的原设计基线；新增字体从活动项目移除。深灰衍生图仅作为[被否决的历史预览](rejected-banner.png)保留，不再放在public或被页面引用。

上面的测试 /发布记录仅说明该尝试曾执行且通过工程检查，不代表用户认可或当前上线状态。恢复到原cover-v2的公网与健康结果追加于下文；旧主域名记录与Android条件边界不因恢复改写。


### 恢复完成

原cover-v2镜像已重新启用且healthy，当前OG路径为share-cover-v2.png。[主站31项](rollback-main-http.json)及[api Safari风格31项](rollback-api-http.json)全部通过，资源SHA与旧版一致；[恢复摘要](rollback-summary.json)记录活动源文件与原提交逐字节相同，16项保护文件不变。网关 /数据库状态 /更新timer与本轮操作前相同。

恢复阶段没有重跑单元 /构建：使用原先已验收的源码与既有镜像，没有重新打包应用，新增验证针对实际恢复后的公网资源 /元数据与健康。没有执行新的iOS原生检查，不声称设备旧预览已即时刷新。深灰横幅未获用户认可，不继续该方向。
