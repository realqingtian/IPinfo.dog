# IPinfo.dog

IP 查询与网络出口检测。Next.js + TypeScript + shadcn/ui，Bun 管理依赖，Node 运行服务端。

M1 工程已交付并上线：独立 IP 查询、首页真实双栈出口、三语 / 主题、结果链接与本地最近十次查询，以及每日三库检查 / 整体切换 / 异常恢复。用户已确认两页视觉；已验证范围与条件补验见 [验收矩阵](docs/archive/m1/m1-07-integrated-acceptance/acceptance.md)。

M2-01 已新增 `/ipv6` 就绪检测：独立 IPv4 / IPv6 出口、主站连接协议与 HTTPS 请求耗时，支持取消和单项 / 全部重测；观测范围与验收见 [任务记录](docs/archive/m2/m2-01-ipv6-readiness/README.md)。

M2-02 已新增 `/routing` 分流检测：33 个固定目标、主动检测、分类、按协议归组出口和独立重测 / 取消。第三方诊断源可能不可读，已按用户要求移除无法确认的 1Password，其他目标仍独立处理失败；见 [任务记录](docs/archive/m2/m2-02-routing-detection/README.md)。

## 开发与检查

Bun 1.4.4、Node 24.20.0，具体依赖均已固定，保留一份 bun.lock。

```bash
bun install --frozen-lockfile
bun run dev
bun run test:unit
bun run lint
bun run build
bun run typecheck
```

服务端查询入口为 `GET /api/ip?ip=...`，页面为 `/ip?ip=...`。接口字段、错误码、缓存与请求预算见 [M1-03 约定](docs/archive/m1/m1-03-geoip-service/api.md)。

真实库验证：`GEOIP_DATABASE_DIR=<目录> bun run test:mmdb <官方 Python 对照 JSON>`。需要合法取得的三份真实 MMDB；缺文件不会被跳过并计为通过。数据库、凭据及整个 ops 不提交或进入构建上下文。

共用服务验证：`GEOIP_DATABASE_DIR=<目录> bun run test:geoip`，核对六个公共 IPv4 / IPv6 目标的三库资料、归一化来源与响应。

自动探测端点与可信入口配置见 [M1-05 约定](docs/archive/m1/m1-05-exit-detection/api.md)；生产需要 DNS-only 双栈子域、可信 HTTPS 证书及独立只读入口凭据。

更新器 / 托管目录初始化与定时器见 [M1-06 约定](docs/archive/m1/m1-06-database-updates/design.md)。先在应用目录外准备三库、只读下载配置并完成首次检查，再以托管模式启动生产 Compose；Web 不挂载 MaxMind 凭据。本地可继续使用平铺三库与非托管模式验证读取。

生产构建见 deploy/Dockerfile，使用 Node。服务器连接与实际发布记录只留本地 ops。

WebRTC 检测位于 `/webrtc`，主动采集 ICE 候选并与同协议 HTTPS 出口对照，不请求媒体权限；实现和验证见 [M2-03](docs/archive/m2/m2-03-webrtc-detection/README.md)。

## 文档入口

- [开发进度](docs/PROGRESS.md)
- [范围与验收](docs/ROADMAP.md)
- [归档规则](docs/archive/README.md)
- [M1-01](docs/archive/m1/m1-01-runtime-and-contracts/README.md)
- [M1-02](docs/archive/m1/m1-02-interface-and-preferences/README.md)
- [M1-03](docs/archive/m1/m1-03-geoip-service/README.md)
- [M1-04](docs/archive/m1/m1-04-manual-query/README.md)
- [M1-05](docs/archive/m1/m1-05-exit-detection/README.md)
- [M1-06](docs/archive/m1/m1-06-database-updates/README.md)
- [M1-07 综合与视觉](docs/archive/m1/m1-07-integrated-acceptance/README.md)
- [M1-08 发布验收](docs/archive/m1/m1-08-release-acceptance/README.md)
- [M2-01 IPv6 就绪检测](docs/archive/m2/m2-01-ipv6-readiness/README.md)
- [M2-02 分流检测](docs/archive/m2/m2-02-routing-detection/README.md)
- [M2-03 WebRTC 检测](docs/archive/m2/m2-03-webrtc-detection/README.md)

仓库拟开源，许可证尚未选定，未添加授权许可声明。
