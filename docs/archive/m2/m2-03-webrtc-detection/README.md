# M2-03：WebRTC 候选与出口对照

日期：2026-11-13。状态：实现、测试、香港部署与正式浏览器验证完成；新增页面用户视觉反馈待取得。

用户在移除 1Password 后要求继续下一项，并明确“暂不新增 DNS 和端口，先做 WebRTC”。本项沿用 Bun / shadcn、中性主题和三语、香港 Web 替换与本地提交授权，不推送；DNS 泄漏观测 M2-04 保持待资源配置，不新增无效 DNS 功能。

## 实际改动

/webrtc 手动开始、独立 ICE / V4 / V6 重测与取消；固定 Cloudflare 公开 STUN，8 秒 / 64 个候选上限，关闭 / 解绑与迟到隔离。host / srflx / prflx / relay、mDNS / 公共 / 非公共分类，只与同协议已确认 HTTPS 出口对照。完整复制、地址隐藏、三语、主题及导航已接入，不保存历史、不上传候选或原始 SDP、不申请媒体权限。详见 [实现口径](design.md)。

同批发布的 [M2-02 移除记录](../m2-02-routing-detection/removal.md)将分流目标变为 33 项，原 34 项证据保留历史。

## 验证与证据

| 环境 / 方法 | 实际结果 |
| --- | --- |
| 单元 | [138 项全部通过](unit-tests.log)，新增解析 / 分类 / 对照、固定 STUN、资源清理 / 上限 / 超时 / 取消、迟到 / 离页与独立失败；首次 dispose 回调问题已修复，[初次输出](unit-tests-initial.log)保留 |
| 工程 | [lint](lint-final.log)、[构建](build.log)、[类型](typecheck-final.log)通过；未新增依赖 / 锁文件。Linux 构建同样执行全部 138 项与工程检查，原件只在本地 ops |
| 本地内置浏览器 | [记录](browser-checks.json)：真实 2 个 mDNS host + 1 个 IPv4 srflx；取消保留 2 个已观察候选，ICE 独立重测后 3 个 / HTTP 取消状态不变；三语保持状态，四种宽度无溢出，20px 地址、隐藏后完整复制、可见 Tab 焦点；浅 / 深 / system 选项验证 |
| 本地边界 | localhost 不在已有生产 CORS 白名单，HTTPS 两项未确认，未改白名单或冒充成功；正式域名另验。无媒体权限弹窗，控制台无 warn / error |
| 禁网候选 | [Linux 检查](linux-candidate.json)：33 项分流与 WebRTC 三语 SSR、语言 / 私有缓存、初始无候选；真库 / 原查询回归、无任意目标代理通过 |
| 公网 HTTP | [WebRTC 12 项](public-http.json)、[分流 13 项](../m2-02-routing-detection/removal-public-http.json)、[M1 24 项](m1-regression.json)、[IPv6 18 项](ipv6-regression.json)通过；第一次 M1 检查未设置公网 base 而请求容器 localhost，补正确环境后重跑，原错误留 ops |
| 正式浏览器 | [记录](public-browser.json)：手动开始，实际 STUN 收集结束 / 3 候选；HTTPS V4 / V6 均取得，公共 IPv4 候选与其同 family 出口一致，mDNS 不比较；无错误控制台，截图地址隐藏 |

截图：[正式页面](evidence/2026-11-13-public-webrtc.jpg)、[本地深色](evidence/2026-11-13-local-dark.jpg)、[本地手机](evidence/2026-11-13-local-mobile.jpg)。真实地址原始记录仅在本地 ops，不提交。

## 部署与收尾

版本 m2-03-6a50bc1348ad，摘要与镜像见 [发布记录](release-summary.json)。Web healthy、非 root、根与真库只读，未挂载下载 Key。原 Caddy / MMDB 状态摘要与更新 timer 未变；未增 DNS / 端口 / 服务 / 外部账号。首次启动有一次连接重置，健康就绪后再验通过，不隐去启动输出。临时候选容器和本轮上传文件已清理，本地预览已停止；正式结果标签保留。

PROGRESS / ROADMAP / AGENTS 与任务归档同步，开发证据和运维原件分开；本地提交，不推送。[收尾检查](archive-checks.json)核对发布源码逐字一致、品牌原图不变、真实密钥未进入公开文件 / 浏览器产物，运维和数据库仍受 Git 忽略。

## 未验证与下一步

未覆盖全部 VPN / 扩展 / 浏览器及网络拓扑，未观察到真实 IPv6 srflx；unsupported / 超时 / relay / 各错误受控分支仅单元验证，未用伪造浏览器页面冒充实测。未模拟 OS 动态主题改变。相同出口不等于全部流量受保护，无候选不等于没有泄漏。新页用户视觉反馈待取得。

DNS M2-04 依据用户选择暂不实施；后续可独立推进 M2 环境信息，在新任务先核对范围。
