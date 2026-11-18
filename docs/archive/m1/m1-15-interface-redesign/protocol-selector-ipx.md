# IPX协议选项实测与对齐

2026-11-17。用户要求实际参考IPX的IPv4 /IPv6选项。按Product Design实站审查先截图 /读DOM，复用M1-15任务，不扩大成全站审查。

1. IPX首页桌面：实际.sw控件约89.05×19px，11px /600，按钮padding1px 9px、15px高；容器1px细线 /1px内距 /980px胶囊圆角，透明底；选中背景是共享::before底片，transform 380ms cubic-bezier(.3,.8,.2,1)，文字300ms。
2. IPX首页390px：同样尺寸 /文字层级，并非本站此前106px×44px的大分段块。[真实手机控件截图](references/ipx-protocol-mobile-actual.jpg)，[桌面截图](references/ipx-protocol-light-actual.jpg)，[测量与CSS规则](references/ipx-protocol-actual-metrics.json)。截图仅保留工具栏，避开访客地址。实际来源[IPX首页](https://ipx.al/)；查询页Web /JSON不是IPv4 /IPv6控件，没有混用两者样式。

本站按真实.sw实现胶囊共享底片 /11px字体 /380ms滑动，不再自主设计大圆角矩形底槽。唯一有意差别是按钮最小宽44px、整体92px宽（源站按钮42.52px）；视觉仍19px高，命中通过上下14.5px扩展至44px。桌面工具栏32px /手机44px保持，不推移卡片。Radix单选 /方向键 /空格与减少动态效果支持保留；不复制IPX整卡.swf入场，本站已加载报告不再淡入。

只读审查同步验证共享底片尺寸 /颜色与44px触达，不把透明按钮背景误判无选中态。此前业务 /来源 /导航验证沿用，只做本控件截图与切换的定点复核。已实现 /发布并完成必要定点验收，不提交 /不推送。

## 实现、验收与交付

已上线 **m1-15-ipx-switch-6feab0b900af** healthy。对上一版的运行材料仅globals.css和只读审查工具两文件变化；业务 /来源 /导航逻辑不变。203个源码白名单文件与最终封包逐一一致，不含ops /私密环境 /数据库。

本地仅补生产构建与审查脚本语法检查，不重复业务全套；服务器既有Docker工程阶段201单元 /lint /构建 /typecheck通过，3项精简候选（健康 /查询页 /主资料样本）通过。正式390px对两种协议各切换一次，控件92×19px、每项44px点击区域、11px /600，报告ready、审查无violations，无可见横向溢出。没有重跑四断点矩阵 /62项公网 /FPS或原生真机。

[IPX控件](references/ipx-protocol-mobile-actual.jpg)与[本站正式控件](references/ipx-protocol-public-match.jpg)在同一390px视口、浅色 /IPv6状态下共同读图：11px小字、细胶囊、共享底片一致；本站3px宽度差为44px触达保留。[本站最终界面](references/ipx-protocol-public-context.jpg)含导航上下文。截图只含控件 /工具栏，没有真实访客地址，原始含data-sw的DOM资料仅留本地ops；公开指标已去除该字段。

参考站与本地任务标签已关闭，已有用户标签保留；临时视口 /主题恢复，本地预览已停。规范 /进度 /运维记录已更新。Caddy /两库 /timer保持，Web只保留本版与上一版m1-15-interaction-5eb7098c4c1d；未提交 /未推送。用户最终视觉与流畅度反馈待取得。
