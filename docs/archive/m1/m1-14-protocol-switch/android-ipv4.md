# Android 真机 IPv4 排查

日期：2026-11-16。状态：已复现并定位失败链路；只排查，尚未修复或部署。

用户反馈USB连接真机无法正常检测IPv4，要求ADB定位。本轮在前台Chrome的既有IPinfo.dog标签验证，没有访问其他浏览器标签、安装APK、清空资料或修改手机网络 /代理 /DNS。真实设备信息、出口、请求原始数据与截图仅留本地ops。

## 实际证据

1. 初始页面确实显示“未检测到IPv4地址”，IPv6结果已加载。
2. 通过ADB建立仅本机可用的临时DevTools转发，在真实手机Chrome中捕获一次IPv4重试：自有 `/api/connection` HTTP200，正常返回IPv6；随后浏览器请求 `https://api.ipify.org/?format=json`，约72ms即出现 `net::ERR_CONNECTION_REFUSED`，未收到HTTP响应。
3. 同页、同机、相同无凭据 /无Referer /CORS请求设置再次对照：ipify约103ms报Failed to fetch，网络事件仍为ERR_CONNECTION_REFUSED；[ident.me官方IPv4专用入口](https://api.ident.me/) HTTP200，约764ms返回经项目parseIp确认的公共IPv4，Access-Control-Allow-Origin为*。
4. ADB shell的单次域名探测能解析ipify为公网服务地址；这只作辅助DNS观测，不能代替Chrome的实际请求或证明浏览器使用相同解析路径。ICMP未收到响应，不据此判断HTTPS故障原因。

因此这不是“整台手机没有IPv4”。自有连接本次走IPv6，IPv4补充依赖单一ipify端点；该端点在当前设备网络路径连接被拒绝，导致没有其他可用路径时显示失败。失败发生在取得HTTP响应之前，没有证据将问题归为MMDB、多源资料、页面布局或HTTP业务错误。

不能仅凭ERR_CONNECTION_REFUSED断定拒绝来自手机、代理、路由器、运营商或远端服务，也不能推断ipify全网故障。本结论限本轮同机 /同页 /当前网络；不外推所有Android环境。

## 后续与边界

建议在保留协议校验 /公共地址校验 /超时 /取消机制的前提下，为IPv4回显增加少量独立备用服务，主端点不可达时自动回退；不能用服务器自身IPv4冒充访客地址。当前没有修改产品源码、服务器或手机配置，不把对照服务成功记作网站已经修复。

ADB临时页面调试连接与本轮转发清理，既有Chrome页面 /USB调试 /网络设置保留。此前内置浏览器及390px视口通过仍不能替代本次真机结论。进度唯一见 [PROGRESS](../../../PROGRESS.md)。

## 双栈与优先IPv6的澄清

用户补充WiFi具备双栈。核对 [ipify官方端点](https://www.ipify.org/)：站点使用api.ipify.org做IPv4专用回显，api6.ipify.org做IPv6专用回显；api64才是按连接支持IPv4 /IPv6的通用入口。本次没有请求api64。自有双栈API本次返回IPv6是正常连接结果；随后IPv4专用回显实际连接被拒绝，不是收到IPv6后被前端丢弃。相同Chrome下另一IPv4专用回显成功，所以当前不能归因于WiFi只支持IPv6。仅凭现有证据仍不能确定连接拒绝源头。

后续状态更正（2026-11-16）：本页“未修复”是诊断阶段。用户随后授权备用回显；实现与同机正式验证已完成发布，IPv4 ipify仍不可达但ident.me自动恢复，见 [修复与验收](echo-resilience.md)。不据此确定原拒绝发生的网络层。
