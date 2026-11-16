# 国家与城市统一展示

2026-11-17。状态：已发布，正式浏览器与工程检查通过；用户新版视觉 /原生真机待反馈。

用户要求对照表统一展示国家、城市，并指定优先采用来源返回的字段，缺失时用本站MaxMind补齐。MyIP.la按用户要求移除，保留IPIP.net。

当前首页含七个指定地址资料来源和九个当前连接来源，合并为同一张多源对照表，不展示类型分栏或内外标记。表格结果栏统一为国家与城市，原始出口地址及差异状态保留于行提示与读屏说明，隐藏开关同步遮挡。仅回显地址的来源，由浏览器向本站API发出本地MMDB查询。相同地址合并查询，复用已有主卡结果；离开页面、出口变化会取消过期请求，失败可重试。独立IP查询不探测访客出口。

IPIP.net从location数组读取国家与城市；IPLeak读取country_code、country_name、city_name，保留服务返回的地理差异。缺字段时按字段补齐；已有字段始终优先，缺失城市不会用组织或省份猜测。成功但缺字段的地理来源可复用同地址主卡资料，失败来源仍显示原错误。补齐来源写入行提示。[IPIP.net官方说明](https://www.ipip.net/myip.html)、[IPLeak官方接口](https://ipleak.net/)

本地IPinfo Lite继续保留。新增IPinfo.io官方在线行，浏览器向https://ipinfo.io/<IP>/json发出无凭据CORS请求，校验返回IP，读取country、city、org。该旧版公共接口免Key，官方公布同一公网地址共享每天1000次额度。请求包含明确目标IP，首页与独立查询的结果均对应所查地址；被限额时只影响本行，可独立重试。[官方免认证说明](https://support.ipinfo.io/hc/en-us/articles/30792479436562-What-Is-the-Difference-Between-Using-the-Authenticated-Free-Plan-and-the-Public-API-With-No-Account)

本地单元覆盖同地址去重、主卡复用、取消与迟到回包、重试、来源原始国家城市、部分缺字段、MyIP.la请求移除和IPinfo.io直连边界。内置浏览器已实际读取IPIP.net与IPLeak的地理字段，现有八个出口在本地返回国家城市，四断点溢出检查通过。该段为较早本地阶段，最终正式结果见文末。

本地191项单元、lint、生产构建与类型检查通过。内置浏览器实际跨站取得IPinfo.io的指定IPv4和IPv6结果，均有国家城市与AS15169。首页八个出口均取得位置，MyIP.la已无DOM行。本地首页和独立IPv6查询在320 /390 /768 /1440px无横向溢出。

## ASN 保留

用户再次确认ASN仍需保留，窄屏空间不足时才隐藏。桌面保留ASN独立列及完整AS前缀；手机读屏和行提示保留ASN。IPLeak的as_number优先使用，缺ASN时可复用同地址主卡或合并本地补查，原有国家城市不被覆盖。即使国家城市齐全，缺ASN仍只为缺字段补查；原始三个字段齐全时不发起补查。成功的地理查询缺ASN时同样复用主卡ASN，并在行提示标明补齐。

## 国内替代源、连续列表与失败修复（较早阶段）

用户同意百度不可直连时换国内常用服务。实测百度旧启服接口ResourceNotFound，搜索开放数据接口没有CORS；改用测速网Speedtest.cn的固定HTTPS接口，仍由浏览器直连，移除IP125。测速网返回的IPv4末段脱敏，只接受与请求地址前三段一致的明确脱敏格式；该结果不用于识别访客完整地址。GoogleDNS等服务名称不当作国家。该源当时IPv6查询返回空内容，显示未提供并保留重试，不能声称本源提供IPv6资料。

当时国内、海外的可见独立行已删除，来源名前用小型「内/外」标记，繁体为「陸/海」，英文CN/Intl，完整含义放标记提示和读屏文本。只使用一个「多源对照」栏目和一组表头。

用户真机截图中IPIP.net白旗对应国家名「中国」未正确规范为CN。已补充显式别名，避免不同浏览器CLDR把CN显示为「中国大陆」时无法匹配。内置浏览器确认IPIP.net产生cn标记，所引用本地中国旗SVG返回200及image/svg+xml。

新增普通回显来源逐行重试，只请求该来源并保留其他结果与主卡。IPIP.net仍以一次双栈观测共享给两个页签，单独重试可重新观测，另一协议保持真实连接提示。补查失败也提供重试。单元覆盖旧回包不能覆盖重试、取消后不重试其他来源。城市补齐受同国家约束，国家冲突时不拼接另一国家的城市。

该阶段本地196项单元测试、lint、类型检查和生产构建通过；四断点下无可见容器横向溢出，未产生独立分组行。

## IP138 与来源身份核实追加

用户否定测速网，最终指定IP138，并要求取消来源名前的内/外标记。测速网已移除，不恢复IP125；IP138采用其官网实际嵌入的固定HTTPS页面 https://2026.ip138.com/ ，实测返回CORS `*`。浏览器只读取地址锚点和国家/省/城市文本，不运行HTML、不加载其中脚本或图片。一次双栈连接共享给两个页签，仅实际协议展示结果；另一协议明确说明连接类型。原始国家城市优先，缺ASN等字段仍合并本地补查；独立目标查询不调用此当前连接页。IP138付费查询API需要Token或签名，未使用文档示例Token，也未模拟绕过认证。固定年份入口需跟随官网变更维护。[官网](https://www.ip138.com/)、[API文档](https://user.ip138.com/ip/doc/)

IPLocation.net确认是Brand Media运营的网站，自有文档声明当前`/v2/ip-country`免Key，当前代码确实直接使用它的官方API。与IP2Location不同，不把该行称为IP2Location。IP2Location.io免费/免Key层没有CORS，官方说明需Starter或更高套餐才有跨域响应，因此不使用服务器代理或冒充直连接入。[IPLocation运营信息](https://www.iplocation.net/about-us)、[所用官方端点](https://api.iplocation.net/docs/v2/ip-country)、[IP2Location的CORS说明](https://blog.ip2location.com/knowledge-base/understanding-cors-what-is-it-used-for/)

新浪旧HTTPS接口本次TLS失败，腾讯新闻和淘宝当前IP入口本次403；淘宝旧指定IP查询返回数据但没有CORS。腾讯位置服务有正式IPv4/IPv6与JSONP接口，需Key且按Key共享额度；阿里云地理库需保密AK签名且官方标明停止新购。这些均未作为免Key直连来源加入。[腾讯文档](https://lbs.qq.com/service/webService/webServiceGuide/position/webServiceIp)、[阿里云文档](https://help.aliyun.com/zh/document_detail/204203.html)

本轮移除内/外可见标记和独立分组行。IP138本地浏览器实测取得中国/广州及CN矩形旗帜。193项单元、lint、生产构建和类型检查通过；数量变化包含删除测速网专属测试、加入IP138的地址身份/协议/页面解析/失败/取消测试。正式发布结果见文末。

## CleanIP 与 WhatIsMyIPAddress 候选

用户另外指定评估 cleanip.io 与 whatismyipaddress.com。WhatIsMyIPAddress 官方API页明确原回显API于2021-11-10停止、无地理API且不允许脚本读取首页/详情，所以不接入自动对照，也不恢复手动链接。[官方API页](https://whatismyipaddress.com/api)

CleanIP官方MCP说明支持免Key基本位置/ASN/ISP，完整评分需Key；其API与订阅额度不是任意访客免费无限使用。公开MCP的接口测试结果见下段，未从网页私有接口或服务器代理绕过。官网2026-11-17读取的定价已与较早搜索摘要不同，按实际官方页面记录，不引用旧的50次/天额度。[MCP说明](https://cleanip.io/en-US/mcp)、[当前定价](https://cleanip.io/en-US/pricing)

CleanIP公开MCP本次OPTIONS预检和初始化POST均返回403（Cloudflare 1010），无Allow-Origin响应，尚无可用的浏览器跨站证据。因此两个新候选均未纳入上线清单；不以网页可打开或非浏览器200作为接入通过。

## 最终发布与验收

最终已上线 `m1-11-ip138-8306e38648bd`，Web healthy。公网七个资料来源和九个当前连接来源实际完成，IP138 /IPIP.net /DDNSPod /MIR6的CN旗帜正常；中国旗本地SVG公网200、image/svg+xml。IP138本次使用IPv4，在IPv6页签如实显示“本次经IPv4连接”，不填入另一协议地址。

本地与Linux各193项单元测试、lint、生产构建、typecheck通过；正常网络候选54项（另测受信双协议入口和未授权拒绝）、公网60项通过。正式首页与独立查询320 /390 /768 /1440px均无可见横向溢出，栏目14px/600、正文13px/400、表头12px/500；无内外标记或独立分组行，桌面完整AS值，手机保留读屏元数据。独立指定IPv4 /IPv6七源全部返回，且不发送访客回显；IPv6主卡显示/隐藏矩形一致。各源网络失败与单独重试、旧回包隔离有单元覆盖，本次正式各回显成功，不冒充强制失败真机验收。

[正式手机固定公共样本](screenshots/country-city-mobile.jpg)。真实首页原始证据仅在本地ops。当前版本和最近一个回退镜像保留，Web构建残留与被替代候选已按精确ID /目录清理，根盘可用21GB；网关、两库、每日更新配置 /状态保持。最终源码包199文件，测试文件随后仅规范末尾空行，无行为改动。

本轮未复验USB /iOS原生浏览器，也未取得用户对新版的最终视觉接受。代码与文档本地提交，不推送GitHub。IP2Location.io的Starter及更高套餐可以官方支持浏览器CORS，免费层不可由本站前端单方面启用；没有购买套餐、使用他人密钥或添加服务器代理。[套餐](https://www.ip2location.io/pricing)
