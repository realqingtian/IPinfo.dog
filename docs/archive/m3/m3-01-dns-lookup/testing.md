# M3-01 验证记录

日期：2026-11-14。本地、正常网络候选与发布结果分别记录。

## 本地工程与真实数据源

- [157 项单元测试](unit.log)全部通过，新增 12 项覆盖 IDN / 服务标签 / 输入边界、参数白名单、八类型固定端点、Question / 答案校验、TTL 0 / AD false、CNAME 链 / TXT 控制字符、DNS 状态与 HTTP 故障、字节上限 / 超时 / 并发释放、限流及重测 / 取消 / 离页迟到隔离。
- [Lint](lint.log)、[构建](build.log)、[TypeScript](typecheck.log)通过；无新依赖，Bun 锁文件不变。
- [直连服务真实源 27 组](source-smoke.json)：三家各 8 类型返回答案；另各一次随机不存在子域返回 NXDOMAIN。仅用公开固定样本，不记录访客查询。
- [本地页面 / API 39 组](local-http.json)：三语初始页、8 组非法参数、24 组八类型真实源、3 组 NXDOMAIN、IDN 归一化。返回 IDN 的 DNS 错误同样是有效解析响应，不冒称已取得 A 记录。
- 初版 HTTP 检查错误假设“例子.中国”只能成功或不存在；实际 Google 返回 SERVFAIL / RCODE 2，独立官方端点复核也为 SERVFAIL。已将 IDN 用例调整为校验 ASCII 目标与有效 DNS 状态，保留失败语义，不改成应用请求错误。首次页面元数据漏写品牌后缀，已补齐，并在最终构建完成 [3 组元数据检查](metadata.json)，查询目标不进入标题 / 分享描述。

## 实际内置浏览器

- 默认空白，无自动公共解析；Enter 查询 example.com A，三家均返回记录、TTL 和耗时。菜单切换 HTTPS 后查 cloudflare.com，三家完成，字符串按来源保留格式差异。
- 单独重试 Google 后取消，Google 显示已取消，AliDNS / Cloudflare 已完成结果保持；再次返回该结果链接可重新完成三源。无效 URL 输入被就地拒绝，焦点回输入框，原结果清除。
- 简 / 繁 / 英切换保留查询网址、输入、类型和结果，客户端标题包含品牌；说明默认折叠。浅 / 深 / 跟随设备均可选择，未测试真实 OS 动态切换。
- 320px 英文深色、390px 手机、768px / 1440px 结果均无横向溢出。截图：[窄屏](screenshots/local-mobile-dark.jpg)、[桌面](screenshots/local-desktop.jpg)。仅为视口模拟，不等于原生手机测试。
- 原有浏览器标签页未动，本轮标签 / 视口 / 偏好及预览服务已清理或恢复。没有新开外部 Chrome / Playwright 浏览器。

## 当前边界

原生 iOS / Android、新页用户视觉反馈和所有第三方故障组合未验证。公共解析器未来可能变更、限流或不可达；本轮可用不代表长期保证。DNS M2-04 的实际递归解析器观测仍未实施。

## 正常网络候选与公网

Linux 镜像同样通过 157 项 / Lint / 构建 / TypeScript。候选采用默认网络，执行 39 组 DNS 检查（含八类型三源与 NXDOMAIN / IDN），并回归真实 MMDB、旧页、品牌资源与环境页；[报告](candidate.json)为四份原始 JSON 的无损汇总，不包含访客值。未进行禁网运行。

替换 Web 后，主域 39 / API 域 14 组通过；旧核心 24 / IPv6 18 / 分流 13 / WebRTC 12 / 环境 12 均通过。实际正式内置浏览器从结果链接加载 example.com TXT，三家共 6 条记录、TTL 与耗时可见；英文切换保留 6 条记录和 URL，标题 / 英文横幅同步，恢复原语言后关闭本轮标签。

服务 healthy、User=node、Readonly=true；托管 state 哈希 / Caddy / 每日 timer 保持。切换瞬间首次健康请求 empty reply，重试后 ready 且最终 healthy，原始输出留在 ops。不新增端口或 DNS。候选容器、服务器上传包与本地预览已清理；未重新触发数据更新，也未推送 Git。
