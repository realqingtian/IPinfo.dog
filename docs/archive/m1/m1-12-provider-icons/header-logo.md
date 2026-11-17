# 导航品牌Logo加载优化

2026-11-17。用户反馈左上角品牌Logo加载慢，并明确要求保证清晰度。正式DOM确认图片显示36×36px，但naturalWidth /Height为1254，priority预加载已启用；源码使用unoptimized直传原始PNG，1542828字节。用户截图的半幅加载与大PNG传输相符，但不把截图推断当作所有网络耗时结论。

从批准原图生成144×144透明无损WebP，19624字节，减少98.7%，覆盖36px显示的4倍像素密度；完整画布等比缩小，不裁切 /重绘角色或改变配色。生成工具先校验原图SHA，再逐像素核对解码后透明度与所有可见RGB与缩放结果一致，预算32KiB。静态导入保持Next内容哈希地址与已有首屏预加载，无运行时图片转换 /新依赖 /外部图床。

补查正式响应发现旧Logo同时返回private /no-store与public /immutable，存在冲突，不能仅凭Next默认配置断言有效缓存。入口仅对/_next/static/media/header-logo.*.webp的200 /304响应延迟覆盖Cache-Control为public, max-age=31536000, immutable；HTML /API及不存在资源仍no-store，CDN策略不扩大。[Caddy官方响应头说明](https://caddyserver.com/docs/caddyfile/directives/header)是延迟设置规则依据。正常网络隔离候选反代已实测新Logo19624字节、304缓存及三种动态 /错误响应边界通过。

assets/brand/logo.png与现有favicon /Apple /Android /分享图保持；仅导航引用新派生文件。重生成工具scripts/brand/build-header-logo.ts，不运行既有全部品牌重生成。正式交付：**m1-12-logo-448ae02464bc** healthy。本地 /Linux各201项单元和lint /build /typecheck通过，56项既有正常网络候选及独立Logo缓存反代检查通过；62项公网回归通过，额外确认正式Logo19624字节 /SHA一致、无冲突Cache-Control、条件请求304，以及HTML /API仍no-store。HTTP Link响应头提供首屏预加载；不能只根据DOM是否存在link标签判断丢失。Node fetch的一次条件请求返回200，另用不附加缓存控制的原始HTTPS条件请求确认304，分别留存原始证据。

内置浏览器本地导航四断点及正式首页双协议 /公共查询320 /390 /768 /1440px共12组审查通过：naturalWidth /Height144、显示36×36、完整解码，字号 /容器无横向溢出；390px深浅主题Logo截图正常，临时主题 /视口恢复。静态生成的144px图另放大检查轮廓与细节；像素一致性仅指无损编码相对缩放结果，不声称缩小后的像素数与1254px原图相同。没有新增原生真机 /实测4倍屏或弱网限速结果，不承诺任何网络的固定加载毫秒数。

200个源码白名单文件与封包逐字节一致；1318项公开文件 /静态产物私密值扫描0匹配，47个品牌保护文件哈希不变。发布替换Web，并在备份 /验证后重启现有Caddy一次以应用精确Logo缓存例外（admin关闭）；入口信任配置、Caddy镜像、证书挂载、两库状态和更新配置保持，两个timer active。Web继续只读两库 /入口token，无下载Key。保留本版与上一版m1-14-remove-01a46c91592f及Caddy旧配置回退；29个构建ID定点清理18项无标签产物、退休Web与上传包，根盘21GB可用。任务预览3011已停，既有3000未操作。

状态：实现、工程、本地 /正式浏览器及发布完成，进度 /规范 /归档已读回。本轮本地提交，不自动推送GitHub。真实出口 /服务器和原始证据仅本地ops。
