# M2-UX-02：移动端收藏与网站图标

当前方案已按用户确认恢复：浅色底、居中纯 LOGO，不带站名和描述。生成图与历史纯 LOGO 版逐字节一致，138 项 / 工程、禁网候选、主站 44＋API 44 / 核心 24 项及浏览器通过，已上线；页面三语 / 主题保留，原生缓存刷新未验。见[恢复记录](rollback.md)。下方为历史，不再采用文字横幅。

历史微调（已撤回）：此前将右侧站名与描述整体右移 12px，v5 三语资源曾发布。原图 / 图标保持，裁切与像素平移、138 项和工程、禁网候选及主站 44＋API 44 / 核心 24 项、正式浏览器通过。见[间距调整记录](spacing.md)。

最新实施：用户选择的左角色 /右渐变文字整组安全构图已发布，三语资源与客户端切换同步完成。最终工程 /浏览器 /主站44＋api44 /24核心通过，新版原生效果待反馈，见[当前交付](compatibility-release.md)。此前预览与撤回记录只作历史。

此前预览记录：用户选择奶白底、角色＋站名，确认描述「你的 IP，一目了然。」，已完成简 /繁 /英与深灰→铜橙渐变站名预览，本地检查通过；方形会裁角色，视觉及兼容未验收，不改线上 /图标。详见[浅色横幅预览](light-banner-preview.md)。

此前恢复结果：用户否决深灰品牌横幅，已要求恢复询问大预览方向时的浅色底居中纯LOGO cover-v2。本地与线上cover-v2均已恢复，双域名62项复核及健康通过；本轮尝试保留历史，当前结果见[记录](brand-banner.md)。用户此前已确认cover-v2在API入口的小图正常；主域名旧记录与其他设备边界保留。

上一轮记录（2026-11-14）：用户确认v1文字横封面在分享弹窗被截，现已发布无文字居中LOGO分享图cover-v2，兼顾方 / 横裁切，原图 / 小图标文件和声明保持。工程与双域名检查通过，新原生效果待反馈；此前用户反馈和主域名旧记录边界保留，不能标全场景通过。见[纯LOGO修正](share-logo.md)、[v1历史交付](share-cover.md)及[iOS跟进](ios-follow-up.md)。

用户随后删除重加v2仍一样，新增三张截图；不能只按旧收藏处理。v3现使用RGB无Alpha PNG、传统ICO、明确分享图；见[iOS反馈跟进](ios-follow-up.md)和[v3验收与发布](v3-acceptance.md)。下文保留v2初版记录，工程通过不等同原生视觉通过。

用户提供 iPhone Safari 收藏 / 添加收藏截图，要求图标占满并按场景匹配尺寸，随后要求同步检查 Android。范围为 Apple touch icon、通用 favicon 与 Android 主屏幕资源，不改导航布局，不重绘或覆盖 assets/brand/logo.png，不增加离线缓存 / Service Worker。沿用 Web 发布及本地提交授权，不推送。

修改前源码仅 metadata.icons.icon 指向透明品牌原图，没有 apple-touch-icon 声明。公网 HEAD / GET 部分路径曾返回403，不能据此单独判断源站文件状态；源码 public 当时没有对应文件。现提供方形实色背景、无预设圆角的专用图标和明确链接，原图字节保持不变，通过 Next ImageResponse 原生排版生成各尺寸。

## v2初版改动

- Apple 180 / 167 / 152；通用32 / 48 / 192 / 512；根路径 Apple PNG 与双帧 favicon.ico 回退。
- Android 192 / 512 独立 maskable 图标，中央安全区保护角色轮廓。普通版本不复用这一留白，避免所有场景都被缩小。
- 根 layout 显式声明尺寸与版本化地址；site-v2.webmanifest 只提供品牌 / 图标和 browser 打开方式。网页内36px品牌图沿用原资源，三语 / 主题 / 功能保持。
- 新增 `bun run brand:icons`；无新依赖，原图与 bun.lock 不变。[方案与官方依据](design.md)说明尺寸、安全区与设备缓存边界。

## v2初版验证与证据

| 范围 | 结果 |
| --- | --- |
| 工程 | [138项测试](unit.log)、[lint](lint.log)、[构建](build.log)、[类型](typecheck.log)全部通过；未为低风险静态资源新增镜像单元测试 |
| 图像 / 二进制 | [检查](asset-checks.json)：9张专用PNG尺寸正确、全部不透明 / 四角铺满；ICO32/48帧与PNG一致，Apple根回退一致；maskable可见主体及采样余量在安全区，原品牌SHA不变 |
| 本地 HTTP | [12资源 + 五页三语15组](local-http.json)：状态、MIME、字节SHA、Apple / 通用 / manifest链接正确 |
| 网页预览 | [记录](browser-preview.json)：390px无横向溢出、图像全部加载；圆形 / 圆角方形与最小安全区目视无重要轮廓缺失。见[桌面预览](icon-preview.png)和[手机宽度预览](icon-preview-mobile.png)，仅为网页模拟 |
| Linux候选 | [禁网验证](linux-candidate.json)：138项与工程构建、三语SSR、真实三库样本、原页面边界及27项图标检查通过 |
| 公网 | [图标27项](public-http.json)与[M1核心24项](m1-http.json)通过；下载文件与本地字节摘要完全一致 |
| 正式浏览器 | [记录](public-browser.json)：查询页链接与尺寸正确、原36px导航图正常；实际打开180px Apple和512px Android资源，图像清晰。无warn/error；不据此声称原生Safari或Android桌面已验 |

生成过程初次 Node 导入 next/og 缺 .js 扩展名失败，改用 next/og.js 后成功；[初始输出](generation-initial.log)、[Apple / 通用生成](generation.log)及[含Android最终生成](generation-with-android.log)保留。Linux候选初次因执行早于镜像构建完成而失败，未替换正式服务；确认镜像成功后重跑通过，原输出只留本地ops。

## v2初版发布与收尾

版本 m2-ux-02-b30198e87842，[发布摘要](release-summary.json)记录源包与镜像摘要。Web healthy / node用户 / 根与数据只读；网关、数据库状态和每日timer保持；没有改DNS、端口、数据更新机制。初次健康探测连接重置，随后ready并最终healthy。原始构建、候选、部署、运行态及脚本记录留本地ops同任务目录。

临时候选、源包、本地3100 / 3101预览及本轮浏览器标签已清理，用户已有标签保留。[收尾核验](archive-checks.json)确认源包与当前源码一致、相对链接有效、原图不变及机密排除。进度、路线图、AGENTS和归档索引同步；本地提交，不推送。

## 未验证与下一步

尚未在真实iPhone Safari收藏 / 添加主屏幕、Android Chrome / 各品牌桌面安装快捷方式中验证；不同桌面、图标主题和旧收藏缓存仍可能影响显示。图标v2不能强制刷新设备历史缓存，必要时仅删除该收藏 / 快捷方式再添加，不要求清空全部浏览数据。未重复遍历第三方分流、STUN或特殊网络拓扑；本轮不改这些功能。以用户真机反馈继续微调，不能把网页裁切模拟写成原生验收。
