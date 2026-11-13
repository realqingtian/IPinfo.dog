# M1-05 探测接口与入口约定

日期：2026-11-13。接口仅反映本次 HTTPS 连接出口，不等于完整 IPv6 就绪、泄漏或代理检测。

## 请求与响应

- `https://v4.ipinfo.dog/api/exit`：DNS-only，仅 A 记录；`https://v6.ipinfo.dog/api/exit`：DNS-only，仅 AAAA。均直连 HTTPS 443，证书必须由浏览器信任，不使用 8443。
- GET 返回 `{ "ok": true, "data": { "address": "8.8.8.8", "family": "ipv4", "detectedAt": "2026-11-13T00:00:00.000Z" } }`，上例为说明数据；只返回基础 IP，不读取 MMDB。HEAD 同状态、无正文。
- 不接受查询参数或任意目标。浏览器 `credentials: omit`、`cache: no-store`、`mode: cors`、`referrerPolicy: no-referrer`；每种协议独立 5 秒截止。成功后再调用同源 `/api/ip` 补资料，沿用该接口的 12 秒客户端截止。
- 未检测到只说明本次失败 / 超时及可能的网络或扩展因素，不直接断言永久不支持 IPv6。MMDB 不可用保留已取得的地址并可单独重试资料。刷新清空旧结果，迟到响应不能覆盖本次目标；隐藏偏好在刷新时保留。
- 错误码：`ACCESS_DENIED` 403、`PROBE_UNAVAILABLE` 503、`INVALID_REQUEST` 400、`METHOD_NOT_ALLOWED` 405、`RATE_LIMITED` 429。429 带 Retry-After。Next 路由仅导出 GET / HEAD / OPTIONS，其他方法由框架拒绝。

## 可信入口与隔离

- 主站继续原 Cloudflare 来源限制，主站 `/api/exit` 直接 404；直连两个子域只暴露 `/api/exit`，其他路径 404。应用端口只绑定回环。
- Caddy 对应用消费的 `X-IPinfo-Token`、`X-IPinfo-Address`、`X-IPinfo-Family` 逐个覆盖：共享随机凭据、真实连接 `{remote_host}`、固定协议。应用先以等时比较验证凭据，再校验公网地址与协议；不读取 X-Forwarded-For / CF-Connecting-IP 识别出口。
- 私有 Caddy 片段 `/certs/exit-proxy.caddy` 仅含 `header_up X-IPinfo-Token <随机凭据>`。应用通过 Compose secret 只读挂载同一凭据，由 `IPINFO_EXIT_TOKEN_FILE` 读取。仓库仅保留模板；凭据不放环境明文、Git、镜像或浏览器产物。轮换后重启应用与入口。
- CORS 仅允许精确 `https://ipinfo.dog`，不启用 Allow-Credentials；无 Origin 的 CLI 可用。OPTIONS 仅允许不带额外请求头的 GET 预检；其他 Origin（含 null / 域名后缀伪装）403 且不返回 ACAO。
- 全部应用响应设置 private / no-store / no-transform 和 CDN no-store、Vary Origin、CORP same-site。每地址每分钟 30 次、最多 2048 个地址桶；应用进程全局预算每分钟 600 次。此策略非跨进程共享限流，扩容时重新核验。
- `IPINFO_IPV4_PROBE_URL` / `IPINFO_IPV6_PROBE_URL` 只接受服务端配置；用于本地受控验收时可指定回环 HTTP，路径必须 `/api/exit`，禁止凭据 / 查询 / 片段。生产保持默认域名，不从访客输入生成 URL。

## 首轮公网更正

初版在探测 upstream 同时写入新头并使用 `header_up -X-IPinfo-*`。Caddy 的删除操作会删除刚设置的可信头，语法验证通过但合法请求仍 403。已去掉探测块通配删除，逐个覆盖这三个应用实际消费的头；主站仍删除该前缀。更正后两个协议各执行正常、伪造头、允许 Origin、拒绝 Origin、非法目标五类请求，全部符合预期。原失败输出保留在本地 ops；未把首次部署记成一次成功。

参照 [Caddy reverse_proxy header_up](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers) 和 [头设置 / 删除顺序](https://caddyserver.com/docs/caddyfile/directives/header)。实际修正以公网复测为准。
