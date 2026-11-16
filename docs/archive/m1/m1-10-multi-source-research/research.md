# 多源 IP 资料调研与接入建议

核查日期：2026-11-16。状态：调研建议，尚未选定新增供应商、未开发 / 未部署。只扩充现有“我的 IP / IP 查询”的资料；不恢复之前删除的诊断页面与全量竞品规划。免费及已有账号优先，付费 / 特殊授权另行确认。

## 结论

建议先把 **MaxMind（现有）＋DB-IP Lite＋IPinfo Lite** 做成可分别查看的定位 / ASN 对照，Cloudflare 访客地理信息只用于首页当前连接。需要机房、VPN、代理、Tor、移动网络等标签时，优先评估 **IPLocate API**；其免费账户有完整字段，但上线前要明确我们公开 IP 查询站的展示 / 聚合用途。注册、路由、RPKI 是另一路资料，技术上可用 RIR RDAP / RIPEstat，须分别落实公开展示条款。

不要为凑来源数量接满截图所有站点。价格页的“免费 / 商用”不等于可提供公开 IP 数据服务；同一供应商的多个库不算独立来源，供应商之间也可能共享上游。

## 竞品截图对应什么数据

依据：用户提供的三张截图及 [IPX 自述的数据源 / 评分说明](https://ipx.al/about)。截图代表用户当时看到的效果；本轮没有在真实浏览器重验整页，也没有探测竞品未公开的后台实现或付费账号。

| 资料 | 合适来源 | 展示口径 |
| --- | --- | --- |
| 国家 / 省市 / ASN / 网络组织 | MaxMind、DB-IP、IPinfo、其他定位 API | 多源各自一行；定位国家与注册国家分开 |
| 机房 / 家宽 / 移动 / VPN / 代理 / Tor / Relay | IP 情报服务、明确许可的名单 | 标签带来源；未命中、没查到、源失败分开 |
| 宣告前缀 / 起源 ASN / RPKI | 路由观测与 RPKI 验证服务 | 必须针对实际前缀＋起源 ASN；不能拿 ASN 所属国家代替位置 |
| 注册机构 / 注册对象日期 / 登记组织 | 对应 RIR 的 RDAP | 记录日期不等于当前使用者启用日期或首次 BGP 宣告日期 |
| 人类流量百分比 | Cloudflare Radar | 是指定时段、过滤条件下的 ASN 等聚合统计，不是该 IP 本身的人类流量 |
| 开放端口 / 漏洞关联 | Shodan InternetDB 等既有观测 | 标明第三方已有记录，不说成本站实时扫描；无记录不表示端口全关闭 |
| 多地延迟 | Globalping 等探针测量 | 是有探针、额度、时间与测量目标的独立测量能力，不是定位 API 的字段 |
| 反向解析 | PTR 查询 | 无 PTR 保留缺失；主机名不能证明地理位置或“家宽” |

IPX 还自述使用自有机房段 / geofeed / VPN 等库。不能仅接几家公开 API 就承诺得到同等标签、评分与覆盖；本次不复制其评分公式。它展示的日期 / 状态不构成我们对供应商授权或数据实时性的证明。

## 定位与 IP 情报候选

每项“支持”来自官方文档，不是本轮实际 API 成功率测试；免费规则可能变化，实施前重核账号套餐。在线查询都必须传明确目标 IP，不能让后端调用无参数的“我的 IP”接口而误查服务器地址。

| 来源 / 产品 | 可增加的资料 | 免费入口与限制 | 本项目判断 / 官方依据 |
| --- | --- | --- | --- |
| **MaxMind GeoLite（现有）** | 国家 / 省市 / ASN / 组织；City 还可提供时区、近似经纬度、邮编等可选字段 | 本地 City / Country / ASN 已接入，无每次在线查询费用；继续署名、更新 / 清理与 EULA | 保留主源，先盘点库内可选字段。三库属于一个供应商。[字段](https://dev.maxmind.com/geoip/docs/databases/city-and-country/)、[EULA](https://www.maxmind.com/en/geolite/eula) |
| **DB-IP Lite** | 国家 / 城市、ASN 的另一个供应商结果 | 免费 CSV / MMDB，IPv4 / IPv6，月度发布；Lite 覆盖和准确率低于完整产品 | **优先新增本地源**。Lite 为 CC BY 4.0，展示数据的网页须链接署名；付费产品条款不同，不能混用。[下载 / 许可](https://db-ip.com/db/lite.php)、[条款的免费数据例外](https://db-ip.com/tos.php) |
| **IPinfo Lite** | 国家 / 大洲、ASN / AS 名称 / 域名 | 认证 API 无日 / 月调用上限；需 token；也有可下载数据；**没有城市和 VPN 情报** | **优先新增**。官网允许产品使用，数据为 CC BY-SA 4.0；保留署名，衍生数据按许可处理，不擅自改变项目代码许可。[产品 / 许可](https://ipinfo.io/lite)、[API](https://ipinfo.io/developers/lite-api) |
| **Cloudflare 访客地理信息** | 当前连接的国家 / 城市 / 时区 / 近似经纬度等 | IP Geolocation 免费计划可用；城市等需启用相应 Managed Transform | **首页可补充**，它描述请求者，不能用来查任意输入 IP。未核实目前开关；本轮未修改。普通位置头不含 ASN，不声称已具备 Worker 的 request.cf 数据。[说明](https://developers.cloudflare.com/network/ip-geolocation/)、[字段](https://developers.cloudflare.com/rules/transform/managed-transforms/reference/) |
| **IPLocate API** | 定位 / ASN、公司、机房、VPN / proxy / Tor / relay、威胁等 | 免费 Key 1,000 次 / 天；免 Key 50 次 / 天。免费包含全部数据类型 | **标签补充优先评估**。API license 明确允许接收 / 存储 / 处理 / 展示；“内部用途”限制位于 paid database 小节，不能直接当作 API 禁令。条款末尾仍提到额外用途许可证，公开查询 / 转供 API 场景应确认；不是自动判定可任意转售。[额度](https://www.iplocate.io/docs/getting-started/quota-rate-limits/)、[字段范围](https://www.iplocate.io/docs/getting-started/plans-api-credits)、[API 与数据库分开的条款](https://www.iplocate.io/legal/terms) |
| **IPQuery API** | 位置 / ASN / ISP；移动、VPN、proxy、Tor、机房及供应商 risk_score | 官网免 Key，文档支持 IPv4 / IPv6；本轮未找到明确固定额度和公开聚合 / 再展示授权 | 候选，先确认限流、缓存和展示条款，不写“无限免费商用”。risk_score 是其策略分，非概率；网页标签有些不在 API 内。[API](https://ipquery.io/developers/api)、[字段](https://ipquery.io/developers/fields)、[来源](https://ipquery.io/sources) |
| **ipapi.is API** | 定位、ASN / 组织、机房 / VPN / Tor / proxy / abuse 等 | Key 免费 1,000 次 / 天；匿名仅 30 次 / 客户端 IP / UTC 日，且裁减字段 | **不按标准套餐直接接入公开查询站**：虽然免费页写可商用，当前条款 2.3 明确限制 IP 情报中介 / 公开 IP 资料服务及用于其他 IP 服务。应取得单独明确授权。[API](https://ipapi.is/developers.html)、[免费规则](https://ipapi.is/free-tier.html)、[当前条款](https://ipapi.is/terms.html) |
| **ipapi.is 免费 Geolocation CSV** | 另一份 IPv4 / IPv6 国家 / 城市 / 时区等地理资料；无 API 的风险标签 | 无账号的免费 CSV；覆盖少于完整库，源于 WHOIS，非全量高精度库 | 与上项 API **是不同许可产品**：官方明确 CC BY-SA 4.0，标准 API / 商业库限制不直接适用此免费库。可后续评估，但不优先拿 WHOIS 派生位置当作物理位置真值。[数据 / 许可与格式](https://ipapi.is/geolocation.html) |
| **IP.SB API** | 国家 / 城市 / ISP / ASN / PTR | 100 次 / 分钟 / IP，最多 5 次 / 秒；个人 / 评估免费，商业与生产列为 Enterprise | 生产接入先询价 / 授权；地理资料主要来自 MaxMind，不能把与当前库一致当成第二个独立投票。[API](https://ip.sb/api/)、[套餐](https://ip.sb/pricing/)、[上游说明](https://ip.sb/terms-of-use/) |
| **IP-API** | 国家 / 城市 / ISP / ASN、部分网络标签和语言输出 | 免费无 Key，45 次 / 分钟，仅非商业；免费端点 HTTP，HTTPS 属其付费能力 | 不作为默认生产免费源；经后端请求也不改变使用条款，不绕过浏览器混合内容限制。[API](https://www.ip-api.com/docs/api:json)、[条款 / 限流](https://ip-api.com/docs/legal) |
| **IP2Location.io API** | 国家 / 城市 / ASN 等；详细代理 / VPN 能力依套餐 | 免费 Key 50,000 次 / 月；免 Key 1,000 次 / 天；免费需显著署名，完整 VPN 不能由低阶 is_proxy=false 推断 | 候选，公开聚合服务应核对 API 转供 / 竞争性服务限制；不是拿到 Key 就能转售原始响应。[字段 / 额度](https://www.ip2location.io/pricing)、[API 条款](https://www.ip2location.io/terms-of-service) |
| **IP2Location / IP2Proxy LITE 下载库** | 本地地理 / 代理 / ASN，按各库字段 | 有免费库，但当前 LITE 协议限制 competing lookup services | **本项目不按普通 LITE 许可直接使用**，不要沿用旧文章的“加署名就可建 IP 查询站”结论。[LITE 协议第 5 节](https://www.ip2location.com/ip2location_lite_license_agreement.pdf) |
| **proxycheck.io** | 代理 / VPN / 风险等情报 | 注册 1,000 次 / 天；匿名 100 次 / 天 | 可作补充候选，条款允许增强自有服务，但不允许主要价值是提供其数据或完整转供。我们这种 IP 工具须确认具体边界。[API](https://proxycheck.io/api/)、[条款](https://proxycheck.io/terms/) |

IPinfo 免费产品选择 **Lite**，不沿用旧的 50,000 次 / 月 legacy 免费接口；本地库方案不等于把真实数据库打包进公开仓库或 Docker 镜像。

## 注册、路由与附加数据

| 来源 | 对应字段 | 成本 / 约束与建议 |
| --- | --- | --- |
| **RIR RDAP：ARIN / RIPE / APNIC / LACNIC / AFRINIC** | 登记网段、组织、登记国家、registration / last-changed 等事件 | 通过 [IANA bootstrap](https://data.iana.org/rdap/) 找权威 RIR，按对应服务条款和限流查询。登记数据不是定位，事件不是首次上网时间；必要时只取网络与组织字段，避免无关联系人资料。[ARIN RDAP](https://www.arin.net/resources/registry/whois/rdap/) |
| **RIPEstat** | BGP 前缀 / 多起源 ASN、路由与历史、RPKI 验证 | API 无总请求上限但单 IP 8 并发，规律性超 1,000 次 / 天需登记。**API 技术开放不等于无限聚合商用**：服务条款对重打包 / 商业用途设限制；RIS 数据又有单独的默认许可与署名条件，不能一概判免费可商用或全部禁止。实施前确认具体端点数据与服务用途。[API 规则](https://stat.ripe.net/docs/data-api/ripestat-data-api)、[前缀](https://stat.ripe.net/docs/data-api/api-endpoints/prefix-overview)、[RPKI](https://m.stat.ripe.net/docs/data-api/api-endpoints/rpki-validation.html)、[服务条款](https://www.ripe.net/about-us/legal/ripestat-service-terms-and-conditions/)、[RIS 商用条款](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/commercial-use/) |
| **Cloudflare Radar** | ASN 人类 / 自动化 HTTP 流量分布、网络画像 | 免费 API，需 Radar Read token；数据为 **CC BY-NC 4.0**，商业用途另核准。显示 ASN、时间窗口、流量过滤条件和置信度；不是单 IP 流量统计，也不能用作家宽证明。[许可](https://developers.cloudflare.com/radar/)、[字段口径](https://developers.cloudflare.com/radar/glossary/)、[认证](https://developers.cloudflare.com/radar/get-started/first-request/) |
| **Shodan InternetDB** | 已观测的 ports / hostnames / tags / CPE / vulns | 官方提供免 Key 查询；公开再展示授权 / 额度及 IPv6 覆盖本轮未完整确认。只读现有观测，不触发扫描；不把关联 CVE 直接写成已验证可利用漏洞。[OpenAPI](https://internetdb.shodan.io/openapi.json)、[官方使用说明](https://help.shodan.io/integrations/graylog-integration) |
| **Globalping** | 多地区探针到目标的 ping 等测量 | [官方](https://globalping.io/)是全球探针测量平台，另有额度和使用规则；本轮仅解释字段来源，不启动测量，不把该能力加入已确认范围 |

RPKI 的 valid 只表示特定前缀 / ASN 的 ROA 授权状态，不代表 IP 无恶意、无代理或所在地正确。各厂商“风险分”的尺度不同，不能简单平均成我们的健康分。

## 国内资料补充

- **ip2region**：官方项目提供 IPv4 / IPv6 XDB，字段为国家 / 省份 / 城市 / ISP / ISO code；中国信息中文，其他地区主要英文，适合中文资料补充。仓库软件为 Apache-2.0 OR MIT，但实现前仍应核对选用数据文件及来源声明，不将“查询框架许可”偷换成任意数据来源许可。[README](https://github.com/lionsoul2014/ip2region/blob/master/README_zh.md)、[软件许可](https://github.com/lionsoul2014/ip2region/blob/master/LICENSE.md)。不提供风险标签、RPKI 或完整 ASN 情报。
- **ZX / 纯真**：不能只记为一个库。其站点自述 IPv6 为 ZX 数据，IPv4 为纯真；官方 API 要求真实的软件名 / 版本 UA，不能伪装浏览器。额度、公开转展示和数据下载授权待明确，不抓页面或使用别人转存的数据库替代授权。[官方说明](https://ip.zxinc.org/)。
- **百度普通 IP 定位**：当前官方文档支持 IPv4 / IPv6，但 IPv6 需要申请权限，普通定位不支持海外场景；须 AK、核对实际账户配额 / 授权。不能沿用旧 2013 文档的“百万次 / 天”作为当前承诺，不能把百度坐标直接当 WGS84；不适合作全球主源。[现行文档](https://lbsyun.baidu.com/docs/webapi?title=locationip%2Fip-api)、[参数 / IPv6 权限](https://lbsyun.baidu.com/docs/webapi?title=locationip%2Fip-api-base)、[海外限制](https://lbsyun.baidu.com/faq/details?id=2322&title=2794)。
- **太平洋网页等**：截图能展示其结果，不代表它提供可稳定授权接入的公开 API；本轮未查到足够的官方开发者资料，不列为首批来源，不把网页接口抓取当成正式方案。

## 对我们两页的具体建议（尚未实施）

1. **信息卡丰富字段**：在现有地区 / 城市 / ASN / 组织上补省份、时区、注册信息、网络前缀等有来源的字段；时区等先用现有 MMDB 可选字段，避免为已有资料重复调用接口。经纬度若展示，应带精度半径和近似口径，不显示成家庭位置。
2. **多源对照表**：列“来源、定位地区、城市、ASN、资料日期 / 查询时间”。未知显示未提供；保留供应商差异。IPinfo Lite 城市应留空，Cloudflare 访客源在其他 IP 的手动查询中标为不适用，RIR 另放注册资料，不能混进定位投票。
3. **标签后补**：确认允许公开展示的 IPLocate API 等后，增加机房 / VPN / 代理 / Tor / 移动等来源标签。先呈现证据，不直接下“原生美国 / 绝对家宽 / 风险很干净”的确定结论。
4. **渐进返回**：本地资料先显示，外部来源独立加载 / 超时 / 重试；一个源额度耗尽不影响整页。需要 Key 的接口只由后端请求。缓存按来源、协议规范化 IP 和版本隔离，实际 TTL 依各家条款；没有建议通过多账号 / 多出口绕限流。
5. **保留三语与隐私边界**：国家名可按 ISO 本地化；城市缺中文回退英文，组织原名不改。在线供应商会收到目标 IP，需在使用说明中如实说明；本地库不增加这类外发。注册 / 路由 API 也限定固定权威来源，不允许访客自定义上游。

建议顺序是讨论后先确定基础三源，再确认一个标签供应商和网络资料来源。不是已接受的开发计划；没有重新建立全量竞品路线图，也没有为每项建立未来任务目录。

## 证据与未验证边界

- 已读项目当前 IP 契约 / normalizer，核对实际只对接 MaxMind；外部资料来自上列官方文档、定价、条款或供应商自述，区别于我们测得的事实。
- 所有额度 / 授权按核查日记录；并非法律意见或已取得供应商书面许可。API 与付费库 / 免费库的许可分别对待，特别是 IPLocate 与 ipapi.is。
- 没有注册账号、索取 Token、购买服务、发送咨询、下载数据库、调用真实目标 IP 查询 / Ping / 端口扫描；没有把用户截图里的 IP 发送给第三方。文档中的官方请求示例仅阅读，未执行。
- 尚未在香港实测延迟 / 成功率 / 字段完整度 / 供应商一致性，也未查用户已有账户套餐；调研不等于接入验收。免费字段随 IP 缺失属正常，不保证所有来源每个地址都有城市 / ASN。
- 本轮仅文档，应用仍保持清理版线上状态；不运行代码测试来冒充数据源验证。实际检查只覆盖文档链接与工作区范围。

## 2026-11-16 后续决定

用户最终选择第三方浏览器直连、唯一服务端资料源MaxMind，放弃GeoJS；IPinfo与本地DB-IP移除。IP2Location免费层无CORS未启用，当前实际来源与更正依据见[直连记录](expansion.md)。上文建议为历史调研，不能当当前启用清单。
