# M3-01 DNS 查询

日期：2026-11-14。状态：已实现、验证并上线，新页用户视觉 / 原生设备反馈待取得。用户要求继续下一步，沿用已授权的功能开发、测试后 Web 发布和本地提交范围，不自动推送。

目标：`/dns` 查询 8 种 DNS 记录，AliDNS / Cloudflare / Google 固定三源、独立状态和重试、取消、TTL / 服务器耗时与结果链接；三语 / 主题沿用。默认不查询，不保存历史。国际化域名使用 ASCII 名查询，返回值以纯文本展示。对照不同公共解析器服务，不宣称节点实际位于某地区，不把结果差异判为污染或用户 DNS 泄漏。

数据源依据：[Google JSON API](https://developers.google.com/speed/public-dns/docs/doh/json)、[Cloudflare JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/)、[AliDNS 接入文档](https://help.aliyun.com/en/dns/httpdns-access-configuration)。AliDNS 当前匿名端点需以实测为准，账号型 HTTPDNS 文档不能视为匿名服务长期承诺；固定端点本轮已获得 HTTPS 类型返回，正式环境还需实测。

只向固定 HTTPS 解析端点发出指定域名 / 类型，不转发访客地址、Cookie、授权头或访客 ECS；不访问解析答案地址，不提供任意目标代理。每源有独立超时与响应上限、并发 / 全局资源预算，失败不影响其他结果。DNS M2-04 仍按用户要求暂缓，无新 DNS / 入站端口。

## 实际交付

页面 / API、共享域名 / 类型契约、三源服务、取消 / 重试 / 导航控制器、三语与元数据同步已完成。接口与预算细节见 [契约](api.md)，默认内容只保留简短用途与必要的查询发送说明，其余解释按需展开。

| 验证 | 结果 / 证据 |
| --- | --- |
| 工程 | 157 项单元、Lint / 构建 / TypeScript 通过，12 项新测试；无新依赖，见 [测试记录](testing.md) |
| 真实来源 | [27 组服务直查](source-smoke.json)、[39 组本地页面 / API](local-http.json)、[3 组最终标题元数据](metadata.json)通过；IDN 返回真实 SERVFAIL，未假报取得记录 |
| 正常网络候选 | [候选报告](candidate.json)：真实双栈 MMDB / 旧页、51 品牌资源与元数据、12 环境页和 39 DNS 组通过；Linux 内同样 157 项 / 工程通过，没有禁网步骤 |
| 公网 | [主站 39 组](public-http.json)、[API 域名 14 组](api-http.json)、[核心 24 项](m1-regression.json)、[IPv6 18 项](ipv6-regression.json)、[分流 13 项](routing-regression.json)、[WebRTC 12 项](webrtc-regression.json)、[环境页 12 组](environment-regression.json)通过 |
| 浏览器 | 本地三语 / 主题 / 4 尺寸 / 键盘 / 取消 / 单项重测 / 链接返回通过；正式 TXT 查询三家共 6 条记录、英文切换保留结果 / URL，标题与 v7 分享图同步。见 [正式截图](screenshots/public-dns.jpg) |

已发布 `m3-01-045cb4df0b38`，服务 healthy、非 root 与只读根文件系统；当前网关、数据库状态、timer 保持。源包 184 个白名单文件，原品牌与锁文件未变。运维原始日志、清单 / 哈希与操作脚本仅在 `ops/archive/m3/m3-01-dns-lookup/`，不提交；候选容器、临时上传包、预览服务与本轮浏览器标签均清理。代码本地提交，不自动推送。

边界：原生设备、新页视觉反馈、多引擎与所有网络故障组合待验；公共来源可用性不保证长期不变。M2-04 仍按用户选择暂缓，M3 其他 ASN / 注册资料 / IP 计算器等按路线图分项推进，不把本项发布写为整个 M3 完成。
