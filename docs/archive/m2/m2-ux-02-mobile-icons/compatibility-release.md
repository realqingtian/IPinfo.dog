# 分享图兼容、三语接入与发布

任务：M2-UX-02。日期：2026-11-14。状态：最终实现、工程 /浏览器 /公网检查通过并已发布；原生iOS效果与旧记录更新待用户反馈，不将网页模拟写成原生验收。

## 最新选择与授权

用户要求解决裁切后再发布，随后否决文字分放横卡两侧的方案；在上下组合的取舍确认中回复「还是放右边的文字能接受」。本轮据此保留左角色、右渐变站名及描述，把整组收进中央安全区，并已说明方形会同时显示品牌文字。发布授权沿用用户明确的「解决了再发布」，不再采用两侧分放或上下堆叠。

奶白底、批准的原始角色、深灰→暖铜橙站名渐变保持。简体「你的 IP，一目了然。」、繁体「你的 IP，一目瞭然。」、英文「Your IP, at a glance.」共三张固定资源，不包含访客地址、查询目标或其他用户数据。

## 平台限制与实际修正

用户此前截图已经证明同一OG图会被本设备用于方形分享弹窗。[Apple说明](https://developer.apple.com/videos/play/tech-talks/205/)亦指出预览图可能代替图标，并在多个尺寸呈现；[Open Graph数组规则](https://ogp.me/#array)规定冲突时优先前一张，未定义按Safari不同界面分别选图的开关。[TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)建议同UA元数据一致、提供高清图标，避免依赖图片中的文字。

因此没有用多个OG图的顺序、UA识别或修改favicon去冒充可靠的原生位置分流。实际方案为同图安全构图：400px完整角色在左，52px渐变站名及24px描述在右，整组全部位于1200×630画布中央630×630内；横卡和方形都显示完整组合。方形不再保持纯角色，这一变化已向用户说明，不能只用“图标文件不变”掩盖实际选图差别。

独立[像素检查](compatible-asset-checks.json)验证：所有非背景像素均在中央方形内；以与背景差值大于12定义可见像素，三语主体还位于315px半径圆内。阈值明确记录，不宣称极淡抗锯齿在任意系统蒙版下均可见。原图、favicon、Apple /Android图标等16保护文件保持；旧cover-v2资源保留供缓存页面引用。

## 实现与国际化

- `scripts/brand/cover-renderer.ts`集中品牌原图校验、字体及构图；预览与正式生成共用，不手工维护两套不同图片。生产 `bun run brand:share` 先检查三张候选的方形 /圆形安全区，再写入public/brand/share-cover-v4-*.png。
- 根layout用现有next-intl请求语言生成对应OG资源；无新增页面语言路由 /参数 /子域。手动Cookie优先、浏览器匹配及英文回退沿用现有规则，静态图片本身由不同资源路径区分。
- 根据[Next.js官方配置](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots)关闭元数据流式输出，使三语分享图、标题与描述在首份HTML的HEAD中可供预览器读取；不靠客户端执行JS后补元数据。页面原有私有 /no-store边界继续验证。
- 字体子集加入Docker构建白名单并附OFL，字体不在页面加载；依赖与bun.lock不变，未改变查询、探测或数据更新业务。

## 当前验证

- [138项](compatible-unit.log)、[lint](compatible-lint.log)、[构建](compatible-build.log)、[类型](compatible-typecheck.log)通过。
- [资源检查](compatible-asset-checks.json)：三张1200×630 RGB、离线确定性生成、方形 /圆形安全区、16保护文件及原图标声明 /依赖保持。
- [本地44项HTTP](compatible-local-http.json)：19资源、五页三语15组HEAD内元数据、4语言偏好 /回退、6并发语言隔离通过。
- [内置浏览器](compatible-browser-checks.json)、[桌面](compatible-preview.jpg)与[390px](compatible-preview-mobile.jpg)：三语切换、完整组合及方形裁切、图像加载与无横向溢出通过。只是网页模拟；新版原生iOS选图 /既有记录刷新待用户反馈。

## 中间方案与更正

两侧方案的中心纯LOGO像素一致检查见[pure-square记录](pure-square-banner-crop-checks.json)，但被用户否决，不能记为采用。上下组合的[三语裁切](stacked-banner-final-checks.json)与[浏览器](stacked-banner-browser-checks.json)仅为备选，用户最终仍选择右侧文字。原始图和记录保留，当前只发布compact-row。

开发过程中Satori对显式undefined样式报错；已用条件属性移除undefined并重新生成，失败原始输出只在本地ops保留。本轮cover-v4-*为中间两侧实现的本地工程记录，随后已撤回；最终结果以compatible-*为准，不混记为当前发布验收。

## 发布与未验证项

没有把HTTP或网页裁切当作真实Safari验收；不承诺旧卡片立即刷新，不清理用户浏览数据或反复要求删除收藏。最终结果见文末，初轮发布与语言漏项的失败记录保留。

## 浏览器发现的语言同步漏项与补修

首轮资源 /SSR检查通过后，正式浏览器切换语言时发现：可见文案已经变化，但OG /Twitter图片仍指向初始语言，[原始失败记录](compatible-public-before-client-sync.json)保留。原因是既有PreferencesProvider只更新本地语言、Cookie、标题和普通description，并不刷新服务端元数据；不能把SSR正确扩大为单页语言切换也正确。

现新增共享shareImageForLocale，供服务端和客户端使用同一资源规则；既有语言副作用同步OG /Twitter标题、描述和图片。保留原本无重载的切换方式，避免丢失输入或查询结果；服务端首份HEAD仍独立提供本地化元数据，并非只有客户端补写。

[本地浏览器补验](compatible-local-client-sync.json)确认三语图片更新，未提交的1.1.1.1输入保留、URL仍为8.8.8.8目标；已恢复原语言偏好。该本地服务未挂载真实数据库，查询资料不可用不当作真实业务验收，正式业务仍在最终公网验证。

修正后[138项](compatible-final-unit.log)、[lint](compatible-final-lint.log)、[构建](compatible-final-build.log)、[类型](compatible-final-typecheck.log)与[本地44项](compatible-final-local-http.json)重新通过。最终Linux构建 /候选及再次发布使用compatible-final-*材料；前一轮版本及检查作为历史保留，不覆盖失败证据。

## 最终发布与收尾

版本m2-ux-02-compatible-a6dc37e63b09，见[发布摘要](compatible-release-summary.json)。Linux内138项与工程通过，[禁网候选](compatible-final-linux-candidate.json)含真实MMDB /既有页面边界及44项资源 /语言检查通过；[主站44项](compatible-final-main-http.json)、[api Safari风格44项](compatible-final-api-http.json)、[核心24项](compatible-final-m1-http.json)全部通过。

[正式浏览器](compatible-final-public-browser.json)重新验证三语OG /Twitter图片随切换即时更新、URL与未提交输入 /既有查询结果保持；恢复原简体偏好和输入。见[正式查询页](compatible-final-public-query.jpg)及[实际上线图片](compatible-public-resource.jpg)。这不是原生iOS分享弹窗，不把客户端DOM更新当作已保存的Safari卡片必然即时重建。

最终Web healthy、node、根目录与数据只读。网关未改；最终发布前后state摘要保持。本轮期间既有03:00更新任务自然触发，systemd记录Result=success /退出0，state相应变化发生在最终发布前；不能把本轮开始到结束的state写成完全不变，也不据此声称下载了新版库。部署首探测连接重置后ready，原始日志留ops。

候选、上传源包、本地3100 /3101及本轮浏览器标签清理，用户旧标签保持。按[收尾核验](compatible-archive-checks.json)检查最终源包、资源 /保护文件、文档链接与机密排除；进度和规范同步，本地提交不推送。原生iOS新图、旧记录刷新与Android条件边界仍按真实反馈继续验证。
