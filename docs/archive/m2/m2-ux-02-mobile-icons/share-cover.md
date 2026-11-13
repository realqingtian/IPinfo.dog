# 横向分享封面

日期：2026-11-14。本文件保留v1横封面发布时记录。后续用户证实它在Safari分享弹窗中被方形截断，已由[居中纯LOGO方案](share-logo.md)替代；不能以本文件横卡测试通过覆盖该回归。

用户截图显示api最近保存的预览已经加载：采用v3的1024方图，进入横向图片区域后只剩放大的脸部；主域名仍是先前横幅。不能因此说两个域名当前源码不同，之前同路径字节对照仍有效；原始截图含个人信息，仅保存在本地ops的evidence/ios-cover-feedback。

## 改动

- 独立 `bun run brand:share` 生成1200×630 RGB PNG：左侧完整原角色，右侧大站名，沿用奶油色背景，不添加技术说明、广告slogan或新的角色形象。没有从截图恢复旧横幅，也没有修改获批原图。
- 新资源 public/brand/share-cover-v1.png，根Open Graph图片 / 尺寸 / MIME指向它；Twitter按框架规则同步继承，标题描述保持原五页三语。封面无访客出口、查询目标或个人信息。
- 原v3 Apple / favicon / Android图标、manifest、根回退均不改；源图与这些文件共16项SHA逐一相同。脚本单独生成封面，没有再运行brand:icons。
- 小图标文件和声明未变，不代表所有客户端一定继续用相同缩略图；iOS可能选择图标或分享图，实际分享面板也需保留新版本补验边界。

依据：[Open Graph图片结构字段](https://ogp.me/)和[Apple链接预览建议](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)。1200×630是本项目横向构图选择，并不是Apple承诺的唯一尺寸；Apple建议图像宽度至少900px、避免难读小字，这里只保留大站名，具体页面文字在元数据中提供。

## 当前验证

[资源检查](cover-asset-checks.json)确认1200×630 / RGB无Alpha、文件SHA和16项保护资产未变；[生成](cover-generation.log)、[138项单元](cover-unit.log)、[lint](cover-lint.log)、[构建](cover-build.log)、[类型](cover-typecheck.log)通过，无新增依赖或锁文件改动。

[本地31项HTTP](cover-local-http.json)包括16资源和五页三语15组图标 / manifest / OG / Twitter字段，且在HEAD内。实际内置浏览器在正常尺寸与390px检查[网页预览](cover-browser-preview.json)：1.91:1和用户截图近似1.6:1下完整角色与站名可见，无横向溢出；[桌面图](cover-preview.jpg)、[手机宽度图](cover-preview-mobile.jpg)只代表模拟裁切，不是iOS最近保存界面。

旧收藏 / 最近保存可能继续显示已存预览，本次不会清理用户浏览数据或要求反复删收藏。主域名旧小图标的设备记录问题与此次大封面调整分开，不宣称已经恢复；新横向封面的原生显示仍待用户反馈。

## 发布与验证收尾

| 环境 | 实际结果 |
| --- | --- |
| Linux | Docker内138项及工程构建通过；[禁网候选](cover-linux-candidate.json)检查真实三库 / 原页面边界和31项资源元数据通过 |
| 公网 | [主域名31项](cover-main-http.json)、[api入口Safari风格31项](cover-api-http.json)、[核心24项](cover-m1-http.json)通过。两边封面资源SHA相同，OG / Twitter尺寸、MIME、三语标题描述及原v3图标链接正确 |
| 正式内置浏览器 | [记录](cover-public-browser.json)确认HEAD内新封面字段、原图标链接与36px导航图；[正式资源截图](cover-public-resource.jpg)清晰完整。未访问用户原生Safari收藏数据 |

版本m2-ux-02-cover-b8228ff47c2b，[发布摘要](cover-release-summary.json)记录源包 / 镜像。最终Web healthy、node用户、根与数据只读；网关 / state摘要 / timer保持，未改DNS或端口。启动首探测连接重置后ready，原始构建与运行态留本地ops，不把它隐去。

临时候选容器、上传源包、本地3100 /3101预览与本轮浏览器标签均清理，用户原有标签保留。[归档核验](cover-archive-checks.json)确认当前源码与发布包一致、16项保护文件 / 小图标声明不变、相对链接与机密排除。原始用户照片只在ops，开发进度 / 规范同步，本地提交、不推送。

这次只明确提供横向封面，不保证Safari马上更新已保存的预览；模拟卡片不替代原生显示，某些客户端可能另用OG图作小缩略图，新版本原生分享面板同样待反馈。
