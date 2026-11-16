# 国内外出口对照与 IP125 查询

2026-11-16。首页通过访客浏览器分别观测不同目的地的出口，独立查询页只发起指定地址的地理资料查询。两张表分别有 9 个出口观测服务和 7 个地理资料来源，人工核对外链单列。

| 来源 | 接入行为 |
| --- | --- |
| [IPIP.net](https://www.ipip.net/myip.html) | 每次首页加载或主动刷新向 myip.ipip.net/json 发一次 HTTPS GET，检查 ret 与 data.ip。A 和 AAAA 共用入口，两页签共享观测结果。另一协议页签注明此次实际连接协议。 |
| [MyIP.la](https://www.myip.la/) | IPIP.net 赞助的另一个服务，使用 v4 / v6.myip.la 专用域名。 |
| [DDNSPod](https://v2ex.com/t/1082022) 与 [MIR6](https://ip.mir6.com/) | 每族使用各自固定端点，只读取公共地址。DDNSPod 按服务名标识。 |
| [icanhazip](https://icanhazip.com/)、[IPLeak](https://ipleak.net/)、[WTFismyIP](https://wtfismyip.com/) | 每族独立回显。IPLeak 只读取 JSON 的 ip。 |
| ipify、ident.me | 保留原回显，继续与本站共同检测主卡地址。各来源完成即更新对照，原有入口全部未取得该族地址时，使用已经并发探测的备用结果。 |
| [IP125](https://ip125.com/api-docs/) | 首页和独立查询页直接向 api.ip125.com 查询指定 IPv4 或 IPv6，核验 query 与目标一致后显示国家、城市、ASN。 |
| [IP.me](https://ip.me/)、[IP.SB](https://ip.sb/pricing/) | 手动核对。前者实测网页入口返回 HTML、无可读 CORS，后者免费方案未开放生产用途。链接不附目标 IP。 |

所有新增自动请求由访客发出。回显 5 秒超时、响应体 4 KiB 上限，无凭据和重定向。指定地址查询沿用浏览器独立缓存及单源重试。IPW 的协议端点在本次测试网络未完成 TLS，3322 端点未通过证书校验，未列为自动来源。

## 发布验收

已部署 m1-14-echoes-bdba0fb3f7c1，Web healthy。本地及 Linux 各 177 项单元测试、lint、类型检查和生产构建通过。候选 52 项、公网 58 项检查通过。

内置浏览器本地与公网首页、独立查询页均检查了 320 / 390 / 768 / 1440px。正式站 IPIP.net 本轮走 IPv4，本地另一次走 IPv6，另一页签显示实际连接协议；九行 IPv4 地址遮挡通过。独立查询 223.5.5.5 的 IP125 行返回中国、Hangzhou、AS37963。未在中国大陆三网分别实测或复验 iPhone 真机。
