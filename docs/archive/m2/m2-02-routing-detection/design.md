# 分流检测口径与实现

日期：2026-11-13。以下为首次 34 项设计记录；用户随后要求移除 1Password，当前为 33 项，变更与验证见 [补充记录](removal.md)。

## 目标与依据

沿用路线图的 34 项 / 7 分类。通过 [IPFinal](https://ipfinal.com/) 的公开页面资源核对目标名称、域名与诊断路径，仅提取端点事实；原始页面 / 脚本留本地 ops，不复制其实现、视觉资产或原始脚本到项目 / Git。自身请求、队列、解析、分组和界面均独立实现。

32 项使用 Cloudflare /cdn-cgi/trace，另两项使用网易 CDN 的 cdn-user-ip 与字节测试资源的 x-request-ip / x-response-cinfo。这些是目标的公开诊断端点，不能推广为目标整站或账号访问能力。Binance 使用 www.binance.info，Discord 使用 gateway.discord.gg；域名可影响代理规则，页面明确显示实际主机，不能仅按品牌名推断路由。

官方 [Cloudflare /cdn-cgi 说明](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/)说明该命名空间由 Cloudflare 管理；实际是否返回内容、CORS 和响应头是否暴露仍逐项核验，不把托管说明当成所有站点永远可用的保证。浏览器遵守 [Fetch / CORS](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)，不会使用 no-cors 的不可读响应或服务器代测替代真实客户端地址。

命令行初查 33 项可读，1Password 原域名 /cdn-cgi/trace 为 404。核对其 [官方账号地址说明](https://support.1password.com/sign-in-troubleshooting/)后，仅对公开 my.1password.com 的同一路径作一次检查：200 但无 IP 字段 / 可读 CORS，不是有效替代。因此保留原目标并明确未确认，不伪装成成功、不追加其他第三方 IP 回显服务。

## 请求与解析

- /routing 页面仅渲染白名单；首次打开不自动探测、不预连第三方、不加载第三方图标 / 脚本。主动开始发出全部检测，单项按钮只测对应目标。
- 浏览器直接 GET trace 或 HEAD 指定资源；credentials=omit、mode=cors、referrerPolicy=no-referrer、cache=no-store、redirect=error。每次带独立 nonce，避免复用共享缓存中的访客字段。不带登录状态或应用凭据。
- 四并发、六秒上限；trace 文本最多 64KiB，既检查 Content-Length 也累计解压后的流字节；超限取消读取。只接受唯一 ip= 字段和严格公共地址，HTML / 重复字段 / 私网 / 格式错误不作结果。头模式只读取指定且浏览器可读的完整地址字段，不从无关文本猜 IP。
- 请求只来自静态配置，未提供任意 URL 输入或服务器转发 API。受控测试可由服务端环境把目标替换为已验证的 loopback HTTP origin，页面明确显示“受控测试数据”；生产环境未启用。

## 队列与结果

- 每项独立代次和 AbortController。取消 / 重新开始使旧代次失效；迟到结果不覆盖。重测复用全局四槽队列，旧 probe 未结束前仍占槽，防止连续重测突破上限。未启动的排队任务可取消，离页释放请求。
- 按标准化地址和 family 归组，仅纳入当前成功项；同协议有多个地址才提示多个出口。IPv4 / IPv6 一组各一个不称分流；失败不会以空值聚成一组。
- 分类只过滤目标列表，汇总仍包括全部已取得结果；语言切换保留分类 / 结果 / 隐藏状态与 URL。统计使用“已结束”以容纳已取消，不把已取消写成已取得。
- 每次重测先移除对应旧测量，其他成功结果保留。汇总是各项最近一次成功观测，不声称同步抓包；网络改变后建议全部重测。无测量不推断真实路径或代理状态。
- 地址隐藏仅控制文字，复制与查询链接仍携带完整值；结果不入最近查询。手动打开 /ip 链接沿用 M1 的 URL 恢复语义，不自动记录历史。

## 界面与验收方法

复用现有 shadcn Card / Badge / Button / DropdownMenu 和 CopyButton，不加依赖。CLI 4.23.0 查询并核对官方 [Card](https://ui.shadcn.com/docs/components/radix/card)、[Dropdown Menu](https://ui.shadcn.com/docs/components/radix/dropdown-menu)；Neutral / 三语 / 主题沿用，手机导航允许换行。/routing 加入 proxy matcher，SSR / 原地切换同步标题与描述，响应明确语言与私有禁止缓存。

命令行端点核验、受控浏览器、真实浏览器、禁网候选、发布 HTTP 分开记录。HTTP 200 本身不能证明成功取得出口。首次 lint 发现测试中不必要的 let，已修正，原件 lint-initial.log 保留；原测试行为不变。浏览器评价环境不开放 performance 资源条目，改用控制器测试和开始前零请求日志验证默认不发请求，未绕过工具限制注入网络脚本。
