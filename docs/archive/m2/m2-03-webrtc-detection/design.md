# WebRTC 检测口径

日期：2026-11-13。M2-03；DNS 观测为 M2-04。用户明确“暂不新增 DNS 和端口，先做 WebRTC”，不配置权威 DNS / 安全组 / NS。

## 资源与来源

使用 [Cloudflare 官方公开 STUN](https://developers.cloudflare.com/realtime/turn/)：stun:stun.cloudflare.com:3478，仅 STUN，不用收费 TURN、不建账号。官方 [FAQ](https://developers.cloudflare.com/realtime/turn/faq/)说明 STUN 免费。STUN 会看到连接来源地址，候选与 SDP 不上传 IPinfo.dog；隐私说明不代表对 STUN 隐藏来源。

原理参考 [MDN ICE 事件](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event)、[候选类型](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/type)及 [RFC 8828](https://www.rfc-editor.org/info/rfc8828/) 的地址处理边界。复用已安装的 shadcn Card / Badge / Button，无新依赖。CLI 查询使用项目锁定 4.23.0，默认缓存无写权限后改用 /tmp 专用缓存，未更改用户全局缓存权限。

## 请求和状态

页面初始不创建 PeerConnection，不请求 STUN 或双栈出口；手动全部开始或各卡独立重测。只创建本地 data channel 和 offer，不请求麦克风 / 摄像头、不设置远端描述、不交换 SDP、不做账号或媒体连接。固定 STUN，不接受任意地址配置。

采集独立 8 秒 / 64 个去重候选。只留地址、family、scope、候选类型和传输协议，不留 SDP、ICE 用户名 / 密码、端口和 relatedAddress。解析以标准属性为主，缺失时从有界 candidate 行读取固定字段；拒绝域名 / URL / 非法字面量，host 的合法 .local 名称显示 mDNS。公共与非公共依据共用严格 IP 解析器，映射 IPv4 标准化。

事件只更新当前代次。取消、超时、达到上限、正常结束、错误和离页都关闭 data channel / PeerConnection、解绑事件与计时器。取消保留已观测的 ICE 候选并标取消；HTTP 未完成项标取消，已完成项保留。独立重测只替换该项。

## 对照与界面

V4 / V6 HTTPS 出口分别独立取得。公共 host / srflx / prflx 只与同 family 的成功 HTTPS 出口比较；未有基准则未确认，relay 不视作本机出口，非公共或 mDNS 不进公网比较。不同只提示“可能另一条路径”，不是确定泄漏；相同 / 无候选都不等于安全。多网卡、UDP、扩展、浏览器政策均可能影响结果。

三语无前缀、切换保留结果 / 地址隐藏、主题沿用；V4 / V6 和候选同级 20px 完整换行。隐藏不影响完整复制，复制失败沿用真实反馈。结果不进手动查询历史、不持久化、不建立新业务 API。

## 修正与证据边界

初次 137 / 138 单测：dispose 后模拟迟到 ICE 进度还能更新已完成槽位。修正为离页递增全部代次，并只接受 running 的进度回调；138 项复跑通过。另修复 prefer-const 与 WebRTC createOffer 重载类型缩窄，保留 initial 日志。临时 Python 文案脚本无显式编码声明时拒绝执行，补 utf-8 声明后写入三语；缺文案类型错误留本地原件，不当业务测试结果。
