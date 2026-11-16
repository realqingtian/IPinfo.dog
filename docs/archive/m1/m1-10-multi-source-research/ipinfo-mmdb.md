# IPinfo Lite 本地数据库恢复

任务：M1-10。日期：2026-11-16。状态：已发布，工程 /候选 /公网 /正式浏览器验收完成，用户新版视觉反馈待取得。

用户授权：接回IPinfo Lite MMDB，像MaxMind一样本地查询和定期更新，恢复多源对照与服务商logo；其他在线源继续浏览器直连，完成测试和部署并更新进度 /归档。本轮未授权GitHub推送，不自动推送。

方案：MaxMind主资料保持；IPinfo作为独立本地资料源，不调用其在线查询API。下载Key只给更新器，不挂Web或进入客户端。独立每日03:10 Asia/Taipei检查（错开MaxMind03:00）；候选类型 /版本 /IPv4与IPv6样本 /哈希验证通过后原子切换，失败保留有效旧库。72小时未确认提示，30天过期暂停该源，不影响其他资料。国家 /ASN /组织 /as_domain来自IPinfo，城市缺失显示—，不借其他源补齐。图标只用同IP /同ASN安全域名，浏览器固定DDG图片请求失败中性回退。

来源：[Lite数据库及许可](https://ipinfo.io/developers/ipinfo-lite-database)、[下载与官方CDN说明](https://ipinfo.io/developers/database-download)。免费商用且需CC BY-SA 4.0署名，保留来源链接、链接提示和独立许可文件；按用户要求不单独显示BY-SA文字。当前账号下载页已人工浏览核对到Lite Free入口；不把页面核对当作文件或运行验收。

验证结果：本地157项单元、lint /生产build /typecheck通过；官方SHA-256下载 /MMDB格式 /真实双协议查询与相同版本确认已完成。Google /Cloudflare /ByteVirt五个公共样本读取符合字段边界；真实IAB已恢复Google logo，四来源、320px无溢出、正文不含独立BY-SA文字。Linux同157项及工程通过；正常网络只读候选3+13+33共49项、受信连接样本 /无token拒绝与Caddy配置验证通过。已发布m1-10-ipinfo-c2adc7347eec，Web healthy；公网3+13+39共55项及静态许可文件一致性通过。原生真机与首次自然定时触发未验证；实际证据持续追加，运维资料仅留ops同任务目录。

发布前遇到服务器磁盘满：保留运行 /回滚镜像及所有数据库、证书和服务，先按已归档构建ID清理未使用中间产物，再清理超过一天的未使用构建缓存，释放约4.1GB。未执行容器 /卷 /全镜像prune；原始日志只在ops。

正式更新：服务器已验证首次官方SHA256获取、同版本仅确认和flock互斥退出75；systemd手动服务成功，独立timer active，下次2026-11-17 03:10 Asia/Taipei。Web只读MaxMind /IPinfo及入口token，不挂下载Key；Key只给更新器。原MaxMind定时 /state与Caddy配置 /启动时间保持，DB-IP仍停用。首次自然触发和真实新版本自然热更尚未发生，不能写已通过；热切换与失败保留由注入测试覆盖。

此前把需要Key等同不能浏览器直连的建议不准确：IPinfo官方支持CORS和域名限制；当前按用户明确选择使用本地MMDB，根Key不公开。[官方API](https://ipinfo.io/developers) / [Token限制](https://support.ipinfo.io/hc/en-us/articles/30792505654674-How-To-Secure-Your-API-Token)。

## 正式界面验收与交付

正式IAB两页320 /390 /768 /1440px均通过字号 /完整AS前缀 /矩形旗帜 /四来源完整性 /无横向溢出检查；简 /繁 /英320px和深浅主题通过。公共Google IPv4 /IPv6的本地IPinfo行ready，Google logo图片真实加载完成；城市留空，日期显示MMDB版本，在线源保留自身结果。页面正文不含独立BY-SA文字，来源外链指向包含许可的官方说明。

首页768px真实detecting到ready的卡片顶边113px、IP首行133px、摘要174.5px不变；IPv6显隐的地址 /卡片 /摘要矩形一致。未重复原生剪贴板或真机验收，既有完整值复制单元保持通过；首次自然调度和真实新版本自然切换仍待发生。

[正式桌面](ipinfo-local-desktop.jpg) · [正式手机](ipinfo-local-mobile.jpg)。截图只用公共Google样本，真实首页与服务器输出仅留本地ops。浏览器临时视口 /偏好恢复，正式结果页与本地预览保留。

源码白名单192文件与当前代码逐文件一致，实际Key扫描未进入源码包或客户端；数据库 /ops /根.env不提交。当前Web仅挂两家数据库与入口token，Key只挂更新器。磁盘清理后已保留运行 /更新器 /回滚镜像与数据，约4.2GB可用。代码与文档作本地提交，本轮不推送GitHub。
