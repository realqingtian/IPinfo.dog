# M1-13 加载与骨架动效

日期：2026-11-16。状态：已实现并随 M1-14 发布；工程 / 公网 / 当前内置浏览器回归完成，真机及用户新版反馈待取得。

用户要求加载 / 骨架动效，提供 React Bits 参考，后续继续关注该方案。本轮使用 React Bits 的 LatticeLoader、FadeContent，现有 shadcn Skeleton 增加 Neutral 流光。最终仅新增 GSAP 3.15.1 作为实际引擎，准备阶段的 Motion 依赖已移除；保留上游 MIT + Commons Clause 文本。

保留品牌 / 两页 / 三语 / 输入焦点与取消竞态，不加虚假进度或请求延迟；修正上游计时器、Ref 和 SSR 可见回退，减少动态效果时显示静态反馈。见 [实现与证据](implementation.md)。

本地 / Linux 动效初版各 134 项与工程检查通过；新增协议任务后最终各 142 项及工程通过。最终发布 `m1-14-5cc5dbfe9ba2` healthy，正常网络候选与 58 项公网通过，详情见 [M1-14 验收](../m1-14-protocol-switch/README.md)。正式浏览器真实查询抓到 11 个骨架、输入焦点和提交 busy；完成后骨架归零、三源就绪，无控制台错误 / 警告。[公网手机加载截图](public-mobile-loading.jpg)。

运维证据与中间候选只留同编号本地 ops；中间候选没有提前发布。未做原生设备、OS 减少动态效果动态切换和帧率量化，不把样式 / HTTP 检查记作这些场景通过。没有阻塞；后续按用户反馈调整。进度唯一见 [PROGRESS](../../../PROGRESS.md)。
