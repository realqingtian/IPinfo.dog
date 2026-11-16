# IPinfo.dog

我的 IP 与 IP 查询。Next.js + TypeScript + shadcn/ui，Bun 管理依赖，生产 Node。

- [我的 IP](https://ipinfo.dog/)：自动显示本次连接的公网 IP、位置与网络资料，支持刷新、复制和隐藏。
- [IP 查询](https://ipinfo.dog/ip)：查询公共 IPv4 / IPv6，分享结果链接，保留本浏览器最近十次成功手动查询，可清空。
- 简体 / 繁体 / 英文，无语言路由；浅色 / 深色 / 跟随设备；保留已确定的品牌资源。

`ipinfo.dog` 提供前端，`api.ipinfo.dog` 提供后端。首页显示 API 当前连接实际使用的 IPv4 或 IPv6，不承诺通过双栈域名同时发现两个地址。

## 开发与验证

使用 Bun 1.4.4、Node 24.20.0，具体依赖固定在 package.json / bun.lock。

```bash
bun install --frozen-lockfile
bun run dev
bun run test:unit
bun run lint
bun run build
bun run typecheck
```

默认访问正式 API。需要本地集成时，在构建 / 启动前显式设置 `NEXT_PUBLIC_API_BASE_URL` 和服务端 `IPINFO_WEB_ORIGIN`，指向本地测试地址；配置仅在本地 `.env.local`，不提交。真实 MMDB 目录通过 `GEOIP_DATABASE_DIR` 指定；数据和下载凭据不进入源码或镜像。

API 为 `/api/ip?ip=...`、`/api/connection`、`/api/data-status`，响应不缓存。Cloudflare 入口经来源校验后覆盖认证来源头，应用只向准确的前端 Origin 提供无凭据 CORS。

部署使用 deploy/Dockerfile / compose.yaml / Caddyfile：源码白名单上传、服务器构建、正常网络候选、替换与公网验收。MaxMind 在独立任务每天 03:00 更新，应用只读三库。整个 ops 只保留本地运维资料，不提交 / 上传。

[开发进度](docs/PROGRESS.md) · [任务归档](docs/archive/README.md) · [协作规则](AGENTS.md)

仓库公开，许可证尚未指定，不添加未经用户选择的许可声明。
