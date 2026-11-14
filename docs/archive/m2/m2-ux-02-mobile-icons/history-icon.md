# M2-UX-02：历史记录小图标

日期：2026-11-14。状态：原奶白配色圆角版已实现、测试及发布；新图标原生历史显示待用户反馈。

## 方案确认与提交收尾

用户比较透明底后明确「按你的建议就不动了」，确认保留现有奶白圆角favicon，不改为去底透明角色。这是设计选择确认，尚无新增原生历史选图验收证据。

随后用户要求提交代码。本轮核对功能实现已在本地提交 `db0e585`，开始时工作区干净；补充本次方案确认与进度 / 中文AGENTS记录后提交收尾。仅更新文档，不重跑应用测试、不重新部署、不推送远程；整个ops继续忽略，凭据及私人截图不参与提交。

用户确认v7横幅「现在很清晰」，随后要求历史记录小 LOGO 采用竞品格式。该反馈只作为用户原生横幅确认；新图标仍需单独验证。原始截图含私人浏览与网络信息，只按原名 / SHA 存入本地 ops。

## 诊断与方案

此前 favicon 为直角奶白底RGB图；直接读取 [ipx.al favicon](https://ipx.al/favicon.svg) 确认其采用圆角底承托中心标志。初始曾提出深灰底方案，但已按用户更正撤回；当前只参考圆角格式，保留自己的配色与角色，不复用竞品图形。

用户随后明确：「别丢失我们自己的配色和风格，只是要圆角」。据此保留原奶白底 #f4eee7、原角色大小和位置，仅把favicon四角透明化；不采用深色底或内缩角色。新增16 /32 /48 /96 /192 /512px PNG及16 /32 /48 /96多帧ICO，ICO同步alpha与AND遮罩。Apple touch icon和PWA继续使用原资源，已确认横幅和品牌原图不改。新资源用v4地址，旧版本保留；根favicon.ico回退同步更新。

更正：最初扩大理解为深灰底 /88%角色并生成候选，用户指出后已撤回该设计。该尝试没有部署；原始构建记录仅保留在本地ops，不能把其测试报告当作当前奶白圆角方案通过。

图标选择由浏览器决定，同一favicon也可用于标签页等位置，不能宣称只改变某一个原生列表；旧历史项可能保留旧缓存，不强制清理用户数据。[Apple网页图标说明](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)、[favicon说明](https://developer.mozilla.org/en-US/docs/Glossary/Favicon)作为声明用途参考，不能代替本轮真机验收。

## 当前奶白圆角版验证

最终资源见[检查报告](history-final-assets.json)：奶白底 #f4eee7、角色原尺寸；与旧版相同尺寸PNG逐像素比较，所有保留的不透明像素RGB完全一致，可见角色像素没有被圆角移除（差值阈值12）。96px为新增尺寸，没有旧同尺寸图作比较。15项历史保护资源与已确认三语v7横幅保持，只有根favicon.ico回退按范围更新。

六张PNG离线重复生成稳定，ICO四帧的RGBA像素与对应PNG逐像素一致，AND遮罩匹配全透明像素。检查最初把16px圆角的6/255抗锯齿覆盖误判为不透明错误，已将角点阈值校正为≤8并完整重跑；原失败记录只保留在本地ops，不把深灰方案或失败输出记为通过。

内置浏览器检查16 /24 /32 /48px、浅 / 深周围背景、桌面与390px视口，素材加载、透明圆角和布局正常，色彩与角色大小维持原样。见[记录](history-preview-browser.json)、[桌面预览](history-preview.jpg)、[手机宽度预览](history-preview-mobile.jpg)；这些均为网页模拟，不是原生历史实测。

## 发布与交付

最终奶白版通过138项单元、lint、生产构建及类型检查；Linux构建同样通过，禁网候选完成真实MMDB、三语页面与51项资源 / 元数据检查后，只替换Web。发布 `m2-ux-02-history-8d04013bf21f`，源SHA256 `8d04013bf21f16c6ad27919c75476fbf008ffd0a9b33ec2e008f27eff8090f0b`，168文件逐一与本地源码核对，不含ops / docs / Git /真实数据库；镜像 `sha256:05f9ffad9c1d4d372d6f88f71deb7c6cc7f86559008d0e8fa7be96cfe003b7ce`。

[主站51项](history-public-main.json)、[现有API域名Safari风格客户端51项](history-public-api.json)、[核心24项](history-public-core.json)通过，涵盖新PNG /ICO字节、五页三语favicon声明、原Apple /manifest /横幅及偏好 /隔离。正式内置浏览器实际打开奶白圆角图，API入口真实查询正常，页面引用新favicon-v4，Apple仍为v3，分享仍为已确认的v7；见[浏览器记录](history-public-browser.json)及[线上资源截图](history-public-resource.jpg)。本轮没有控制iPhone Safari历史列表，不把资源 /元数据或网页模拟当作原生选图通过。

最终healthy /node /根与数据只读，网关配置与数据库state摘要保持，既有每日timer active；未改DNS、端口或更新机制。部署首探测连接重置后ready，原日志留本地ops。未发布的深灰候选镜像、构建目录及上传包已清理；当前候选、上传包、本地预览及任务标签清理，视口恢复，用户原有页面保留。进度、路线图及中文AGENTS已明确只加圆角，本地提交、不推送。
