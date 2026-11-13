# M2-01 检测口径与入口

日期：2026-11-13。

## 页面与请求

- /ipv6 首次进入并行发出三项 HTTPS 探测：既有 v4 / v6 /api/exit，以及同源 /api/connection。没有语言路由、地理资料依赖或诊断历史。
- 三项分别维护状态 / 请求代次。全部重测替换全部，单项重试不影响邻项；取消只取消未完成项，保留已完成结果。离页取消，迟到结果不能覆盖。
- 重用 fetchExit 的 5 秒上限、omit credentials、no-store、no-referrer；主站观测也严格核对公共地址与响应 family，一项失败不阻塞其他项。
- performance.now 测完整 fetch / JSON 的耗时，毫秒四舍五入；不作 ICMP RTT、独立 TCP 握手或协议速度排名。复用连接与页面调度都会影响数值。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)。
- 双出口成功只表示已知端点观测到两类出口。IPv4 或 IPv6 单项失败仅标未确认，不能区分无协议、DNS / TLS / CORS、扩展拦截或代理路由。NAT64 和代理下不能由端点结果证明原生接口支持。

## 可信主站观测

- 主站现有 Cloudflare 来源允许清单保持。仅 /api/connection 的 Caddy 转发注入既有私有 token，逐项覆盖 X-IPinfo-Address 与 X-IPinfo-Family=connection；原主站其余请求仍去除全部 X-IPinfo-*。应用只允许连接模式对应标记，不在既有直连探测开放自动 family。
- 地址取可信入口收到的 CF-Connecting-IP，不直接从访客 X-Forwarded-For 或应用公开请求解析。实际 protocol 由标准化地址推导。这里观测的是浏览器 / 代理到主站边缘的本次出口，不是 Cloudflare 到源站的回源协议。
- Cloudflare Pseudo IPv4 的 Overwrite Headers 模式可能把该字段改成保留范围。当前选择失败关闭 / 未确认，不自动信任可能由客户端提供的 CF-Connecting-IPv6，更不修改用户 Cloudflare 设置。缺失、保留或非法地址拒绝。官方说明见 [Cloudflare 请求头](https://developers.cloudflare.com/fundamentals/reference/http-headers/)。
- token 长度 / 等时比对、来源策略、公共地址、无参数、GET / HEAD、每地址每分钟 30 与全局每分钟 600 预算沿用既有实现；连接实例单独预算，最多 2048 地址桶，无下载 Key。陌生 Origin 无 CORS，全部 no-store。不开放任意请求目标或服务器代理请求。
- 运行环境仅可覆盖固定路径的测试端点；HTTP 仅允许 localhost / 127.0.0.1。生产连接地址固定同源 /api/connection，不从 URL 或表单接收目标。

## 界面

复用既有 shadcn Card / Badge / Button、CopyButton，Neutral / 三语 / 主题保持；两张直接出口卡与一张主站连接卡，手机纵排，IP 同 20px，完整换行 / 复制。导航与首页提供已实现入口。shadcn 4.23.0 CLI docs 已核对，官方 [Card](https://ui.shadcn.com/docs/components/radix/card)、[Button](https://ui.shadcn.com/docs/components/radix/button)、[Badge](https://ui.shadcn.com/docs/components/radix/badge)；无依赖或框架版本变化。

初次 Bun CLI 因默认缓存写权限失败，改为 /tmp 任务缓存后成功，不改全局配置。初次构建发现测试异构对象数组的类型推断不满足 Record，已显式声明并重跑，原输出保留 build-initial.log。


## 发布前复核更正

- 新 /ipv6 页须加入既有 proxy matcher，才能与旧页面一致返回 Content-Language 和明确的私有禁止缓存响应头；发现后补齐并重新构建 / 发布。
- 公网检查初稿错误要求携带伪造 CF 头的请求必须 200，实际边缘返回 403，拒绝本身符合防伪要求。
- 第二版错误把相邻请求地址固定为同一值，实际 Node 自动连接曾在 IPv4 / IPv6 间切换；已留原始诊断，最终按各协议的直连实际出口分别核对，不放宽成“任意成功即通过”。应用来源逻辑未因此修改。
- 宿主机没有 node，检查改在现有应用镜像的 Node 24 运行，不安装宿主依赖。真实 IPv4-only 容器使用生产 controller 模块，明确不是浏览器。
- 最终发布前浏览器已完成主体页面验收；随后只修正响应头 matcher 与测试工具，最终版本以 HTTP 重验，界面源文件逐字节保持。用户尚未对新增检测页作视觉确认，不借用 M1 的确认。
