# 服务商图标实现与边界

日期：2026-11-16。

## 选择与数据

复用IPinfo Lite已取得的as_domain，只在来源记录的address和ASN均匹配当前主结果时显示；不从公司名、注册国家或其他IP推断域名。仅把通过ASCII主机名校验的域名交给固定图标服务；不接受URL /端口 /凭据 /路径 /数字IP /保留内部域。

图标来源为DuckDuckGo公开favicon服务，实测ByteVirt /Google均返回ICO并可被浏览器解码。官方说明favicon由其服务器提供：[DuckDuckGo favicon说明](https://duckduckgo.com/duckduckgo-help-pages/privacy/favicons)；其官方仓库历史记录给出公开ip3端点：[端点记录](https://github.com/duckduckgo/Android/issues/594)。该公开端点没有项目可依赖的覆盖度 /稳定性保证，失败只回退图标，不影响IP资料。

UI使用Bun官方CLI新增Avatar，遵循 [shadcn Avatar](https://ui.shadcn.com/docs/components/radix/avatar) 的Image /Fallback组合，保留图标原色，16px，不取代本站品牌图。

## 读取边界

GET /api/provider-icon?domain=... 只访问固定 https://icons.duckduckgo.com/ip3/<domain>.ico，不访问输入域名本身，不跟随重定向。只发送固定Accept，省略凭据 /referrer；不转发调用方头、查询IP或令牌。来源CORS仍只允许准确主站，CORP same-site，nosniff，失败204空响应，非法输入400，限流429。

3秒上限、64KiB、只收PNG /ICO并核对签名 /PNG尺寸或ICO目录边界，拒绝SVG /HTML；服务端4并发、相同域名请求合并、128项进程缓存，成功24小时 /失败5分钟。HTTP请求使用既有每分钟120次进程预算，缓存不混入IP资料，也不新增数据库或调度。重启会清空图标缓存。

## 界面与口径

移除SourceComparison展开区和IpResultCard底栏；数据源 /许可 /图标来源统一SourceFooter，两个页面只出现一处全站页脚。页脚保留一句定位 /在线查询处理说明，避免把版本哈希与逐字段工程信息放回产品界面。三语同步，无语言路由变化。

## 发布

源码白名单包181文件，SHA256 c8369df4c31131dc9d6b175a26c414726c203ccd6cf01d3f2734c3f50949911a；无ops /环境文件 /机密 /真实数据库。Linux构建134项和正常网络只读候选通过后替换Web。

正式镜像ID sha256:cff27ff44fb1bcd0a1971027b0dd69adf895bc5996819d9a8d55c929511eb5ea，healthy。Caddy只新增精确/api/provider-icon入口，保留Cloudflare来源允许列表、私有认证 /头覆盖 /同源边界；校验后重启一次。部署脚本备份入口并保留旧镜像 m1-11-951cc985296e，失败可一并回退。两个数据库state /更新器配置均保持，未改DNS、防火墙或其他服务。

公网58项与真实浏览器两页通过，检查摘要见checks.json；公网图标Google /ByteVirt均成功，浏览器0错误，390px无整页溢出。原生设备、用户新版视觉及IPv6-only未验收，不拿内置视口当真机。
