# 开发任务归档

更新：2026-11-16。

当前开发进度只维护在 [PROGRESS](../PROGRESS.md)。当前产品只保留我的 IP / IP 查询；未来扩展路线图、已丢弃功能的开发归档已经删除。

## 归档规则

- 开发说明、决定、测试记录和可公开截图：`docs/archive/<阶段>/<任务编号小写>-<英文摘要>/`。
- 运维日志、服务器资料、部署证据和历史操作脚本：`ops/archive/` 对应任务目录，整个 ops Git 忽略。凭据仍单独放 ops/secrets。
- 每次任务开始登记任务编号 / 目标 / 授权 / 状态；状态变化和答复前主动更新 README、PROGRESS、必要证据，并读回核对链接。
- README 记录实际改动、测试方法 / 环境 / 结果 / 证据、未验证项、阻塞及下一步。实现、浏览器、部署和用户反馈分别记录，没执行的测试写未执行。
- 同任务复用目录；源代码、测试和正式工具仍留 src / tests / scripts / deploy，不搬进归档。不得用归档绕过机密忽略。
- 历史实际执行证据保留原结果；已明确删除的功能和规划不再作为未来工作要求。当前发布仅使用正常网络候选，不执行禁网检查。

## 任务索引

| 任务 | 记录 |
| --- | --- |
| M1-09 当前核心收缩 | [任务记录](m1/m1-09-core-simplification/README.md) |
| M1-10 多源 IP 资料 | [接入与验收](m1/m1-10-multi-source-research/README.md)，三源表格 / 旗帜已上线，其他来源按条件落实 |
| M1-11 结果卡重排 | [任务记录](m1/m1-11-result-card-layout/README.md)，对照 IPX 整卡，PC / 移动端实施中 |
| M1-01–08 历史核心实现 | [初始化](m1/m1-01-runtime-and-contracts/README.md)、[界面](m1/m1-02-interface-and-preferences/README.md)、[资料](m1/m1-03-geoip-service/README.md)、[查询](m1/m1-04-manual-query/README.md)、[旧双栈实现](m1/m1-05-exit-detection/README.md)、[数据库更新](m1/m1-06-database-updates/README.md)、[综合验收](m1/m1-07-integrated-acceptance/README.md)、[历史发布](m1/m1-08-release-acceptance/README.md) |
| 当前批准品牌的历史资料 | [图标 / 横幅记录](m2/m2-ux-02-mobile-icons/README.md) |

历史页面、子域和测试数量只证明当时执行，不代表当前范围或现在仍在运行。用户真实 IP 截图与服务器输出只放本地 ops，不公开提交。
