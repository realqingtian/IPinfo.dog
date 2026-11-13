# M1-03 接口与运行约定

日期：2026-11-13。以下是实际实现参数，完整阶段范围仍见 ROADMAP。

## 查询

`GET /api/ip?ip=8.8.8.8`。只接受一个 ip 参数，拒绝重复目标、额外参数、域名、URL、CIDR、带 zone 或歧义 IPv4。IPv4-mapped IPv6 统一为 IPv4。没有出站查询或任意 URL 抓取。

成功 `200 {ok:true,data:IpInformation}`，字段类型见 src/lib/contracts/ip.ts：

- address / family 为规范化目标；datasetId 是完整三库哈希派生标识，queriedAt 为本次查询时间。
- City 定位国家优先，缺失才读取 Country 定位国家；注册国家单独选择，永不补定位。两库国家代码冲突放 conflicts，不静默掩盖。
- 每字段 fieldSources 指明使用哪一库，null 对应缺失；sources 包含三库构建时间与该地址是否有记录。不同库构建时间不要求一致。
- 国家 / 城市名保留已提供的简体、繁体和英文；缺的语言不自行生成。响应不按语言变化，组织原名保留。页面语言回退在展示层处理。
- 任何一库有记录即允许部分成功；全部返回 null 才是 NO_RECORD。注册信息单独存在也保留，定位字段仍为 null。不从 ASN 名称猜住宅、机房或零售 ISP。

| HTTP | code | retryable | 含义 |
| --- | --- | --- | --- |
| 400 | INVALID_IP | false | 目标或参数格式错误 |
| 422 | NON_PUBLIC_IP | false | 非公网 / 特殊地址；额外 scope 给出解析分类 |
| 404 | NO_RECORD | false | 三库都无记录 |
| 503 | DATA_UNAVAILABLE | true | 未配置、读取失败、损坏或读者异常；不包含原始异常 |
| 504 | TIMEOUT | true | 等待初始数据集超过上限 |
| 429 | RATE_LIMITED | true | 当前进程请求预算耗尽；带 Retry-After 秒数 |

## 固定资源边界

| 项目 | 当前参数 / 行为 |
| --- | --- |
| 资料缓存 | 进程内 LRU，最多 512 项，TTL 300 秒；按规范 IP 和完整 datasetId 隔离；不缓存错误 |
| 返回值 | 每次复制缓存资料并生成新的 queriedAt，调用方修改不污染缓存；原始多语言名称无需 locale 缓存键 |
| 数据等待 | 每请求最多等待 10 秒；超时不反复启动读者，未结束的初始加载仍共享。同步本地 Reader 查询不能用计时器中断，不宣称硬性 CPU 超时 |
| 失败回退 | 初始读库失败后 5 秒才再尝试；所有请求复用同一 pending，成功只保留一份完整内存快照 |
| 请求预算 | GET 查询在一个 Node 进程共享每 60 秒最多 120 次，错误输入也计数；不是用户级配额，多进程也不共享。健康检查不占该预算 |
| HTTP 缓存 | 所有查询成功 / 错误均 private、no-store；无 Access-Control-Allow-Origin，CORP same-origin；JSON nosniff |
| 客户端 IP | 手动查询只由 ip 参数指定，不从任意转发头改写目标；可信访客来源与每访客策略属于 M1-05，当前不冒充已完成 |

没有安装文件监听或更新调度。只有完整候选通过读取校验后才交给服务；同一请求三库取自捕获的一个快照。缓存已测试识别新的完整 datasetId，但正式整体换库、过期策略和并发更新管理归 M1-06，不把本轮初始加载恢复当作热更新验收。

## 健康检查

- `/api/health/live`：只检查进程能响应，200 `{status:"ok"}`。
- `/api/health`：资料就绪才返回 200 / ready；未配置或损坏返回 503 / not-configured 或 unavailable，status 为 degraded。不会泄露本地路径。
- 这是对 M1-01 “未配置仍为 200”行为的明确修正；Docker 健康检查继续使用资料就绪端点，正式部署必须挂载三库。

## 测试范围

单元夹具覆盖 NO_RECORD、超时和来源冲突；不把夹具结果当成供应商真实数据。真实库测试使用公共 DNS 地址，与本轮原始三库查询字段核对；已有官方 Python 对照另执行 39 次读取回归。本地生产构建 HTTP 检查包含缺配置 / 损坏时的状态分离、修复后恢复、严格参数和实际限流。
