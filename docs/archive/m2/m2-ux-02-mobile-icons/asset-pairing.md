# M2-UX-02：按场景搭配图标与分享横幅

日期：2026-11-14。状态：调研、实现、工程 / 浏览器 / 公网验收完成，已发布；新版原生 Safari 选图及缓存刷新待用户反馈。

用户提供七张 iOS 实测截图，明确要求按竞品搭配：收藏 / 添加收藏 / 历史小图标使用纯 LOGO；分享弹窗及最近保存大卡片使用品牌横幅。此要求替代此前全场景纯 LOGO 方案；用户截图同时显示竞品分享弹窗会裁切横幅，不再把该位置的完整文字当作发布条件。截图含私人浏览与网络资料，仅按原名 / SHA 存入本地 ops。

## 核对与实施边界

已直接读取 [IPFinal](https://ipfinal.com/) 和 [ipx.al](https://ipx.al/) 的初始 HTML：它们均分别声明 favicon / Apple touch icon 与独立 OG / Twitter 横幅，所检查的 HTML 没有区分 Safari 弹窗位置的选图声明。两家的 Apple 资源均为180×180、横幅均为1200×630，见[脱敏核对](pairing-research.json)；这不证明其全部服务端逻辑。原始 HTML、声明与资源核对保存在本地 ops 同任务目录。

[Apple 官方说明](https://developer.apple.com/videos/play/tech-talks/205/)指出图标和 OG 图片可同时声明，丰富链接可能选择图片代替图标，图片会用于多种大小。因而本次提供两类明确素材，按用户截图接受系统分享缩略图的裁切；不声称可以强制各原生位置独立取图，也不承诺旧缓存即时更新。

保留原始品牌、已验证的全部图标与 manifest。OG / Twitter 改为独立 1200×630 横幅：浅色底，角色在左，站名及已确认的一句描述在右；沿用简 / 繁 / 英，恢复首次 HTML 与客户端切换的语言一致性。用新的版本化路径，不覆盖历史资源；不增加 DNS、端口、外部服务或个人资料。

本地 138 项单元、lint、生产构建及类型检查通过；三语图片均为 RGB PNG，离线重复生成稳定，完整内容适配1.6横卡，16项保护文件、图标声明及依赖不变，见[资源检查](pairing-assets.json)。本次不以中心方形完整显示横幅为验收条件。

实际内置浏览器检查桌面 /390px模拟搭配，英文与繁体点击切换正常，四类资源均加载，390px无横向溢出。见[检查记录](pairing-preview-browser.json)、[桌面模拟](pairing-preview.jpg)、[手机宽度模拟](pairing-preview-mobile.jpg)。模拟明确展示分享小图裁切，不伪装为原生 Safari 截图。

## 发布与交付

Linux 构建通过 138 项及工程检查，禁网候选完成真实 MMDB 查询、三语页面和 44 项资源 / 元数据检查后，发布 `m2-ux-02-pairing-ad488c9f43d2`。源包 SHA256 `ad488c9f43d2414e358f3962b57a01d429da354b727967737a04490b0d423f01`，157 文件与本地源码逐一核对，不含 ops / docs / Git / 真实数据库；镜像 `sha256:55dd886079d35710d8659aefe8a4a3407fd45bd07a0b495b0909ff7b814af03f`。

[主站 44 项](pairing-public-main.json)、[现有 API 域名 Safari 风格客户端 44 项](pairing-public-api.json)、[核心 24 项](pairing-public-core.json)通过。五页三语首次 HEAD 均只声明一张当前 OG 横幅，Twitter 使用相同资源和大图卡片，Apple / 通用 / Android 图标保持原声明与字节。

正式内置浏览器打开[线上横幅](pairing-public-resource.jpg)，解码1200×630；查询页得到真实 Google LLC / AS15169 结果。简体 → 英文 → 繁体 → 简体切换时，OG / Twitter 横幅同步，纯 LOGO Apple 图标保持，未提交输入、URL、查询结果保留。见[正式浏览器记录](pairing-public-browser.json)。本轮未直接控制 iPhone Safari，不将这些检查记为新版原生选图通过；用户先前截图属于需求依据。

最终 Web healthy、node、根与数据只读，网关配置与数据库 state 摘要保持，既有每日更新 timer active；仅替换 Web，无 DNS / 端口 / 外部服务变更。部署首次探测连接重置后 ready，原始构建 / 候选 / 部署与运行态记录留本地 ops。候选、上传包、本地预览服务及任务浏览器标签清理，视口和语言偏好恢复，用户原有页面保留。

进度、路线图和中文 AGENTS 同步，本地提交、不推送。后续只依据本轮版本的真机反馈验收，不要求用户清空整个浏览数据，也不保证旧收藏 / 最近保存立即换图。
