# DNS 查询约定

日期：2026-11-14。

页面 `/dns` 首次为空；主动查询后链接为 `/dns?name=example.com&type=A`，打开结果链接或前进 / 后退会查询对应目标。三语共享 URL，切换语言保留输入、类型、目标和结果；不记录最近历史。

接口 `GET /api/dns?name=example.com&type=A&resolver=google`。三个参数必须各一个，不接受其他参数。类型只允许 A / AAAA / CNAME / MX / TXT / NS / CAA / HTTPS；解析器只允许 alidns / cloudflare / google，不接受端点 URL。域名支持 IDNA、服务标签与末尾点归一化；拒绝网址、IP、单标签、保留私有后缀和不符合长度 / 标签规则的输入。

成功传输返回 `{ok:true,data}`，其中 data 包含规范 ASCII name、type、resolver、status、records、elapsedMs，可选 rcode / authenticated。每条记录包含 name、数字 type、ttl 与来源原样 data；转义不可见控制字符，前端以 React 文本展示，未知答案类型显示 TYPEn。CNAME 链可与目标类型同时返回，不擅自改写 TXT / HTTPS 字符串或判断三源文本相等。

| 结果 | 意义 |
| --- | --- |
| ok / empty | RCODE 0，有答案 / 无所查询记录 |
| nxdomain / servfail / refused / dns-error | RCODE 3 / 2 / 5 / 其他 DNS 错误；不同于传输故障 |
| timeout / unavailable / invalid-response | 请求超时、HTTP / 网络不可用、无法校验的响应 |
| limited / cancelled | 资源预算不足或请求取消 |

输入错误 HTTP 400；全局请求预算 HTTP 429 + Retry-After；意外服务错误 HTTP 503。上游故障作为独立来源结果返回，不让其他来源丢失。所有响应 private, no-store，不开放跨源 CORS。预算为单进程 90 次 / 60 秒、最多 8 个上游并行；界面每次 3 个请求。没有按访客提供的转发头认定身份。

上游固定 HTTPS JSON 端点，每次 5 秒、解压后流读取最多 128KiB、64 条答案、每条 data 最多 8192 字符。校验 MIME、状态、Question 的域名 / 类型与答案字段，拒绝截断响应。客户端另有 7 秒上限，取消 / 重试 / 换目标 / 离页由 AbortController 和代次保护隔离迟到结果。

不访问解析得到的 IP 或 CNAME，不跟随 HTTP 重定向，不转发访客 Cookie / 授权 / 地址；Google 明确使用 ECS `0.0.0.0/0`，不发送访客网段。解析器仍能看到查询域名和服务器出口。无额外应用缓存 / 查询持久化；TTL 是递归器返回值，耗时是服务器侧完整 HTTPS 往返，不能表示用户 DNS 延迟。

固定公共服务并不保证实际节点在特定国家或地区。返回差异不判定污染；这项不是 M2-04 的用户 DNS 解析器 / 泄漏观测，不要求新增委派或端口。
