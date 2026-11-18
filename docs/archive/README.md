# 开发任务归档

2026-11-18：[Git交付范围与核对](m2/m2-02-routing-detection/git-delivery.md)已整理，用户授权将此前本地提交与本批已发布改动提交并推送origin/main；真实数据与本地研究不公开。

2026-11-18最新：[移除分流手动停止与需求边界规则](m2/m2-02-routing-detection/remove-stop.md)已发布`m2-02-no-stop-44e8b2738179` healthy；规则已写入AGENTS，停止控件与手动接口已删除，工程与正式检测中 /结束检查通过。

2026-11-18最新：[分流文案与移动端控件](m2/m2-02-routing-detection/copy-and-mobile.md)已发布`m2-02-copy-ui-4c0b6a2c4a25` healthy，分流说明 /手机间距 /导航选中态 /协议选项合并交付；原生新版反馈待取得，不提交 /推送。

追加：[Safari历史图标差异](m1/m1-12-provider-icons/favicon-history.md)已完成当前服务端排查，原手机验证待取得；未修改或部署。

更新：2026-11-18。

当前：[M2-02分流检测与服务器发布](m2/m2-02-routing-detection/README.md)已发布`m2-02-routing-a3a8d289e3b1` healthy，209项单元 /工程、候选 /公网与正式32组布局回归通过；M2-01完整情报库暂缓，保留本地资料，不视为完成。

M2-01当前目标：用户已明确完整自建IP情报库，原轻量建议不再作为当前范围。完整能力与分期 /数据缺口已同步现有本地文档，未开始开发；下方方向变化保留为历史。

M2-01最新方向：重新比较小范围自建证据库与外部接入，继续限制维护负担。说明已并入原本地任务文档，尚未选定或开工；下方取舍记录保留为历史过程。

M2-01最新取舍：不推进过重的完整自建质量情报库，聚焦轻量实现；参考源准确性反馈与优先级调整已记入同一本地任务目录。未开始开发。

M2-01追加：用户指定One IP开源参考研究完成，候选与实施明细同步到同一本地任务目录；未新增已启用来源，不对外发布完整研究材料。

新增 **M2-01 IP质量检测调研与规划**：用户明确新增的研究范围，含免费替代；尚未开始功能开发。本地材料位于 `m2/m2-01-ip-quality-research/`，按用户“非必要不公开”要求Git忽略，不作为公开仓库附件。全局状态仍见PROGRESS；后续只公开必要评分口径，不恢复其他历史扩展。

最新：[精简公共来源清单](m1/m1-15-interface-redesign/source-parity-trim.md)已发布 **m1-15-source-trim-6aba94eab201** healthy，两页与骨架共同9项，已删除5个无指定IP查询能力的来源及占位；工程与两页手机定点检查通过，未提交 /未推送。下方为历史。

设计改版已按用户选定的[IPX风格与字体](m1/m1-15-interface-redesign/ipx-implementation.md)实现并部署；[设计QA](m1/m1-15-interface-redesign/design-qa.md)与公共截图、工程 /正式验收完成，保留本站品牌，不提交 /不推送。此前[设计资源筛选](m1/m1-15-interface-redesign/design-resource-references.md)作为探索记录。

当前开发进度只维护在 [PROGRESS](../PROGRESS.md)。当前产品只保留我的 IP / IP 查询；未来扩展路线图、已丢弃功能的开发归档已经删除。

## 归档规则

- 开发说明、决定、测试记录和可公开截图：`docs/archive/<阶段>/<任务编号小写>-<英文摘要>/`。
- 运维日志、服务器资料、部署证据和历史操作脚本：`ops/archive/` 对应任务目录，整个 ops Git 忽略。凭据仍单独放 ops/secrets。
- 每次任务开始登记任务编号 / 目标 / 授权 / 状态；状态变化和答复前主动更新 README、PROGRESS、必要证据，并读回核对链接。
- README 记录实际改动、测试方法 / 环境 / 结果 / 证据、未验证项、阻塞及下一步。实现、浏览器、部署和用户反馈分别记录，没执行的测试写未执行。
- 同任务复用目录；源代码、测试和正式工具仍留 src / tests / scripts / deploy，不搬进归档。不得用归档绕过机密忽略。
- 历史实际执行证据保留原结果；已明确删除的功能和规划不再作为未来工作要求。当前发布仅使用正常网络候选，不执行禁网检查。

最新：[全站界面与交互改版](m1/m1-15-interface-redesign/README.md)已完成IPX选定风格上线，追加[移除定位半径与同步骨架](m1/m1-15-interface-redesign/remove-radius.md)，追加[首页导航查询框](m1/m1-15-interface-redesign/header-search.md)，追加[查询文案与按钮比例](m1/m1-15-interface-redesign/search-proportions.md)，追加[查询导航卡片](m1/m1-15-interface-redesign/query-navigation-card.md)与[双协议提示](m1/m1-15-interface-redesign/protocol-placeholder.md)，追加[协议选项与切换交互](m1/m1-15-interface-redesign/protocol-selector.md)，追加[IPX真实协议选项](m1/m1-15-interface-redesign/protocol-selector-ipx.md)，追加[两页公共多源模块](m1/m1-15-interface-redesign/source-parity.md)，当前m1-15-source-parity-aa341848cbce healthy；未提交 /未推送。

## 任务索引

| 任务 | 记录 |
| --- | --- |
| M1-09 当前核心收缩 | [任务记录](m1/m1-09-core-simplification/README.md) |
| M1-10 多源 IP 资料 | [六源与手机列宽](m1/m1-10-multi-source-research/additional-direct.md)、[接入与验收](m1/m1-10-multi-source-research/README.md)，本地IPinfo恢复 /四源 /logo /独立更新已发布，见ipinfo-mmdb.md；浏览器直连与紧凑列表见expansion.md；旧三源为历史 |
| M1-14 协议切换与局部隐藏 | [国内外出口扩容](m1/m1-14-protocol-switch/expanded-echo.md)、 [任务记录](m1/m1-14-protocol-switch/README.md)，备用回显 /出口对照已发布，152项 /工程 /58公网及USB真机预发布 /正式回归通过，DNS-only入口适配；出口表精简 /稳定地址布局已发布并完成PC /手机视口，其他原生环境与新版反馈待取得 |
| M1-13 加载与骨架动效 | [任务记录](m1/m1-13-loading-motion/README.md)，加载位置 /矩形旗帜 /AS前缀修复已发布，152项 /58公网及正式两页四断点通过，OS动态 /原生真机与新版反馈待取得 |
| M1-12 服务商图标与页脚 | [任务记录](m1/m1-12-provider-icons/README.md)，已实现 /发布，单行紧凑页脚已发布，约37px /必要许可 /三语与正式桌面 /手机视口通过，原生与新版视觉待反馈 |
| M1-11 结果卡重排 | [国内外分组与独立查询交互](m1/m1-11-result-card-layout/grouped-comparison.md)、 [任务记录](m1/m1-11-result-card-layout/README.md)，手机三列与矩形旗帜已按IPX内置浏览器实测发布，157项 /49候选 /55公网 /正式两页四断点与IPv6通过，新版用户视觉 /真机待反馈 |
| M1-01–08 历史核心实现 | [初始化](m1/m1-01-runtime-and-contracts/README.md)、[界面](m1/m1-02-interface-and-preferences/README.md)、[资料](m1/m1-03-geoip-service/README.md)、[查询](m1/m1-04-manual-query/README.md)、[旧双栈实现](m1/m1-05-exit-detection/README.md)、[数据库更新](m1/m1-06-database-updates/README.md)、[综合验收](m1/m1-07-integrated-acceptance/README.md)、[历史发布](m1/m1-08-release-acceptance/README.md) |
| 当前批准品牌的历史资料 | [图标 / 横幅记录](m2/m2-ux-02-mobile-icons/README.md) |

历史页面、子域和测试数量只证明当时执行，不代表当前范围或现在仍在运行。用户真实 IP 截图与服务器输出只放本地 ops，不公开提交。

页脚最新调整见 [IPX风格页脚](m1/m1-12-provider-icons/ipx-footer.md)。

最新国家城市统一与官方在线来源见[本次记录](m1/m1-11-result-card-layout/country-city.md)。

多源链接与连续列表统一见[本次记录](m1/m1-11-result-card-layout/source-links.md)。

协议切换与实际观测页签归属见[本次记录](m1/m1-14-protocol-switch/protocol-affinity.md)。

双协议与查询页固定来源清单、能力限制及MIR6 /IPLeak目标查询见[本次记录](m1/m1-11-result-card-layout/source-alignment.md)。
