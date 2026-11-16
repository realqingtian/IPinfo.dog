# 手机城市列与新增浏览器直连来源

2026-11-16。首页和独立查询页共用六行。MaxMind、IPinfo Lite 使用本地库，IPQuery、FreeIPAPI、ipdata、IPLocation.net 使用访客浏览器。

| 新增来源 | 请求 | 返回字段 |
| --- | --- | --- |
| ipdata | 向 ipdata.free 发出单地址 GET | 国家、ASN、组织，可选城市。来源链接标明 GeoIP 并指向 ipdata.co。 |
| IPLocation.net | 向 api.iplocation.net/v2/ip-country POST 单个 IPv4 或 IPv6 表单字段 | 国家和 ISP。城市与 ASN 留空。响应内的成功码与查询地址均须匹配。 |

两个接口均支持匿名 HTTPS CORS。请求省略凭据与 referrer，拒绝重定向。每个来源独立限时、缓存和重试。ipdata 按请求方公网地址计量，同一 NAT 的访客可能共享额度；IPLocation.net 的无密钥国家接口未找到固定日额度承诺。[ipdata 免费接口](https://ipdata.co/free) · [IPLocation.net 官方接口](https://api.iplocation.net/docs/v2)

竞品出现的 IP.SB 免费层限定个人与评估用途，ipapi.is 公布的标准条款限制对外提供逐条数据，这次都未启用。[IP.SB 套餐](https://ip.sb/pricing/) · [ipapi.is 使用条款](https://ipapi.is/terms.html)

手机来源 / 地区 / 城市列从 44 / 23 / 33 调整为 29 / 21 / 50。正文 13px，4:3 旗帜。390px 视口中表宽约 334px，地区起点左移约 50px，城市列从约 110px 加宽至 167px。保留自然换行与桌面完整五列。

本地 167 项单元、lint、typecheck 通过。内置浏览器 IPv4 查询在 320 / 390 / 768 / 1440px 完成字号、来源数和横向溢出检查。IPv4、IPv6 固定公共样本均取得两个新增来源的数据。用户提供的是上版真机反馈。

已上线 m1-10-six-5cd5e46611b5，Web healthy。候选 51 项、公网 57 项、本地和 Linux 各 167 项单元及工程检查通过。正式两页 320 / 390 / 768 / 1440px 无横向溢出。两个新增来源在正式查询页均返回公共 IPv4 与 IPv6 结果。本轮使用内置浏览器，未在 iPhone 真机复验。 [正式手机截图](six-mobile.jpg)
