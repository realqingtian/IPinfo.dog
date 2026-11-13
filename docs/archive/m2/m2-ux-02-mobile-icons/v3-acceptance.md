# v3兼容修正版验收

日期：2026-11-14。工程状态：已发布并通过当前测试。用户后续v3截图显示分享图标改善，但收藏外框与历史默认图标仍在，不能记全场景通过；最新分场景结论见[iOS跟进](ios-follow-up.md)。下文保留发布时的验证记录，不用工程通过覆盖反馈，也不要求重复删收藏。

| 范围 | 实际证据 |
| --- | --- |
| 工程 | [138项](v3-unit.log)、[lint](v3-lint.log)、[build](v3-build.log)、[typecheck](v3-typecheck.log)通过 |
| 编码 | [生成](v3-generation.log)、[11张RGB PNG / ICO检查](v3-asset-checks.json)：无Alpha、四角铺满、尺寸正确；原图SHA不变，旧尺寸RGB逐像素一致，ICO帧 / 像素 / 遮罩正确 |
| Linux | [禁网候选](v3-linux-candidate.json)通过；Docker内同样138项与工程构建成功，三库样本和原页面边界通过 |
| 本地HTTP | [30项](v3-local-http.json)：15资源与五页三语15组图标 / manifest / 分享元数据，声明在HEAD内 |
| 公网HTTP | [普通30项](v3-public-http.json)、[Safari风格UA30项](v3-safari-http.json)、[M1核心24项](v3-m1-http.json)通过；资源SHA与本地一致。Safari风格请求不等于原生Safari选图 |
| 实际内置浏览器 | [元数据](v3-public-browser.json)位于HEAD，标题描述正确，导航图仍36px；1024px分享图实际解码，见[资源截图](v3-share-browser.jpg)，不是iOS分享面板截图 |

版本m2-ux-02-v3-f0060c28a774，[发布摘要](v3-release-summary.json)保留源包与镜像SHA。Web最终healthy、node用户、根与数据只读；网关 / state摘要 / timer前后相同。启动首次连接重置，随后ready，原始输出留本地ops；没有改DNS、安全组或其他服务。

候选容器、上传源包、本地3100预览和本轮浏览器标签清理，用户已有标签保留。[收尾核验](v3-archive-checks.json)检查源包与源码一致、链接、原图及公开范围。开发进度 / 规范同步，本地提交不推送；原始手机截图只在ops。

v2的旧专用资源保留供缓存页面引用，共享根回退更新为v3。PNG重新编码后视觉像素相同，目的是去除未使用Alpha；传统ICO与明确分享图分别改善兼容和取图确定性，不作为已证明的唯一病因。尚未获得v3原生iOS收藏 / 分享 / 历史截图，Android原生桌面也待确认；不宣称留白已解决，不把资源浏览器截图当作原生验收。
