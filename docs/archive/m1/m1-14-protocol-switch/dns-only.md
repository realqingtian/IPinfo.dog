# DNS-only 入口兼容

日期：2026-11-16。状态：入口适配、双协议直连受信TLS /转发头拒绝验证完成；备用回显Web随后独立发布并完成真机验收。

用户将主站 /API的A /AAAA均改为DNS-only。实查原网关加载自签回源证书，浏览器直连不受信，且原来源白名单只允许Cloudflare。此次按既有部署授权做必要兼容，不修改DNS /端口 /防火墙。

移除手动自签证书声明，由Caddy为两个公开域名自动申请和续期受信证书，沿用现有持久化卷。直连请求按传输来源取IP；兼容尚未过期的旧CDN连接时，仅信任既有Cloudflare网段，其他客户端的CF /X-Forwarded /私有头不能自报地址。保留私有入口token覆盖与后端验证、API路径分离、CORS及限流。

官方网段刷新在服务器收到403，未重复同条件下载，也没有扩展信任；保留原22个已核验网段，仅从拒绝直连白名单改为可信代理识别集合。新配置先校验，备份旧配置 /本地可信集合，因admin关闭重启网关一次；证书申请完成后，两个域名直连TLS校验和健康通过，Web容器、数据库状态、更新器与两个timer保持。

39项核心公网通过。请求签发过程中短时TLS尚未就绪日志保留；最终正常证书校验通过，不使用忽略证书错误作为验收。原始证书 /服务器 /配置及操作证据仅本地ops。配置依据：[Caddy自动HTTPS](https://caddyserver.com/docs/automatic-https)、[可信代理选项](https://caddyserver.com/docs/caddyfile/options#trusted-proxies)。

后续定向直连校验：分别强制IPv4 /IPv6解析到现有源站，使用正常TLS验证；连接地址为对应公共协议。伪造CF-Connecting-IP、X-Forwarded-For及私有入口地址 /token头后，返回地址保持该传输来源，不能覆盖。新版Web的58项公网与同台Android正式站点验收通过，见 [备用回显交付](echo-resilience.md)。本次只改网关适配，没有改Cloudflare DNS记录。
