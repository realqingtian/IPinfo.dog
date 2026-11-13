# IPinfo.dog

IP 查询与网络出口检测。Next.js + TypeScript + shadcn/ui，Bun 管理依赖，Node 运行服务端。

当前已接入独立 IP 查询页与三库 API，支持三语 / 主题、结果链接与最近十次成功手动查询。首页已接入真实 IPv4 / IPv6 独立出口检测，基础地址先显示、资料随后补齐；数据库定时更新按 M1-06 接入，完整 M1 尚未验收。

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

生产构建见 deploy/Dockerfile，使用 Node。服务器连接与实际发布记录只留本地 ops。

## 文档入口

- [开发进度](docs/PROGRESS.md)
- [范围与验收](docs/ROADMAP.md)
- [归档规则](docs/archive/README.md)
- [M1-01](docs/archive/m1/m1-01-runtime-and-contracts/README.md)
- [M1-02](docs/archive/m1/m1-02-interface-and-preferences/README.md)
- [M1-03](docs/archive/m1/m1-03-geoip-service/README.md)
- [M1-04](docs/archive/m1/m1-04-manual-query/README.md)
- [M1-05](docs/archive/m1/m1-05-exit-detection/README.md)

仓库拟开源，许可证尚未选定，未添加授权许可声明。
