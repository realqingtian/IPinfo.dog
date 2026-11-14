# M2-05：浏览器环境信息

日期：2026-11-14。阶段：M2。状态：已实现、测试并部署；新增页面视觉与原生设备反馈待取得。

用户要求继续下一阶段，依照路线图先补齐M2环境信息，再推进M3网络资料。DNS M2-04仍按既有决定不新增资源。本次可沿用已有测试后Web发布授权；保留品牌 /页面基线，不自动推送后续功能代码。

范围：独立/environment，主动采集浏览器 /语言 /时区、屏幕 /触控 /低熵设备提示及Canvas /WebGL。结果只存在当前页面内存，不上传 /持久化；不申请摄像头 /麦克风 /定位权限。图形API受限或字段隐藏应各自显示不可用，不推断实际硬件、代理或欺诈。

服务端仅返回本次页面请求中UA、Accept-Language与低熵UA提示白名单，不包含IP、Cookie或授权头。UA /语言与客户端结果只作相同 /不同 /未确认观察，语言区域差异不视为网络异常。页面私有no-store，不新增API、DNS、端口或外部依赖。

采用现有shadcn Neutral组件、三语与主题。参考[Card](https://ui.shadcn.com/docs/components/radix/card)、[Button](https://ui.shadcn.com/docs/components/radix/button)；[设备内存](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)可能被浏览器粗化，[WebGL细节](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info)可能被隐私设置限制，不将缺失误报失败。

验收：字段异常隔离、有效的0 /false、头白名单 /长度限制、对照语义、异步取消 /重测 /离页隔离；工程、三语 /主题 /尺寸 /键盘与实际浏览器；发布时独立候选 /真库 /旧业务回归，公网与原生条件边界分别记录。实际结果后续追加，不用计划冒充完成。

## 实际交付

- 独立 `/environment`、导航及客户端语言元数据分支；三组 23 个字段、单独 UA、请求对照和折叠说明。结果只保留当前页面，重新检测、清空、离页不会被旧结果覆盖。
- 145 项测试、ESLint、TypeScript、生产构建通过；内置浏览器完成三语、主题、键盘与四种宽度，见 [测试记录](testing.md)。未引入新依赖，品牌原图、favicon 与已确认横幅均未变更。
- 香港 Linux 构建与禁网候选通过，真实 MMDB 双栈查询 / 旧页 SSR 和 51 项品牌资源元数据检查通过；已发布 `m2-05-26ae4689930b`，健康检查为 healthy。入口、托管数据库状态与每日更新任务保持。
- 新页公网 [主站 12 组](public-http.json) / [API 域名 12 组](api-http.json)，[核心 24 项](m1-regression.json)、[IPv6 18 项](ipv6-regression.json)、[分流 13 项](routing-regression.json)、[WebRTC 12 项](webrtc-regression.json)通过。正式内置浏览器实测检测 / 清空 / 切换语言、标题与分享图同步；见 [正式页面](screenshots/public-idle.jpg)。
- 首次服务器包带入 macOS 附加文件，Lint 失败，未发布；改为禁用附加元数据并严格比对包成员后，重新完整构建通过。失败原始日志保留本地 ops，不能将重试前结果写为通过。

运维原始日志、源码包清单 / 哈希、部署与清理证据在 `ops/archive/m2/m2-05-browser-environment/`（仅本地，Git 忽略）。候选容器、失败版本目录与上传临时包已清理；没有改动既有 DNS / 端口 / 网关 / 更新调度。当前任务本地提交，不自动推送；上一轮 push 授权不延伸为未来功能自动推送。

下一步：M2-04 继续按用户选择等待 DNS 资源；M3 从独立 DNS 查询工具开始分项实现，普通查询与真实 DNS 泄漏观测保持区分。原生 iOS / Android、多引擎及隐私扩展条件待补验，不影响当前已验证范围。

后续发布检查已按用户要求取消禁网运行，使用正常网络候选；上述禁网结果仅为此前实际执行记录。规则、脚本和验证边界见 [调整记录](testing.md#发布检查调整)，本次不改应用、不重新部署。
