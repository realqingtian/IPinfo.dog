# 加载动效实现与验证

日期：2026-11-16。

## 选型与实际改动

按用户关注采用 [React Bits](https://reactbits.dev/) 的 TypeScript / Tailwind 源码组件，通过项目现有官方 shadcn CLI 安装 LatticeLoader 与 FadeContent。FadeContent 使用 GSAP，版本精确锁定为 3.15.1；初步准备的 Motion 依赖已移除。保留上游完整 MIT + Commons Clause 文本于 public/third-party/react-bits-LICENSE.md；没有替项目自行选定开源许可证。

- 首次出口检测使用与结果结构一致的骨架卡；字段及多源行按各自真实请求加载，查询 / 刷新按钮提供进行中反馈。
- Skeleton 增加 Neutral 流光，来源行完成时淡入，结果使用 180ms 透明度过渡；不加虚假进度、请求延迟或装饰性位移动效。
- 保持输入表单 / 焦点 / 最后请求生效和独立来源重试；手机工具栏不挤入额外加载文字。
- 适配上游 render 时 Ref 写入、未显示计时器仍启动 interval、SSR 默认不可见等问题。禁用隐藏计时器，初始内容保持可见；卸载清理 GSAP，减少动态效果时停止循环 / 淡入并显示完整内容。

## 已执行验证

本地初版 134 项单元及 lint / build / typecheck 通过；Linux 初版同样通过。M1-14 合并后的最终实现增加协议 / 遮挡回归，最终工程与发布结果见 [M1-14](../m1-14-protocol-switch/README.md)。

内置浏览器对实际公共样本发起新查询，抓到 11 个骨架、1 个 LatticeLoader、提交 busy 及输入焦点保持；就绪后加载器 / 骨架撤去，三源就绪。快速连续提交以最后地址为准。390px 英文深色的加载和结果卡顶部相同，无页面横向溢出。截图为公开固定样本，不含访客出口。

- [真实加载截图](screenshots/local-loading.jpg)
- [结果截图](screenshots/local-ready.jpg)
- [手机加载截图](screenshots/mobile-dark-loading.jpg)

初版查询页 HTML 引用的 13 个脚本按文件 gzip 汇总，比旧线上版约增加 47.9KiB。它是脚本压缩体积比较，不是实测带宽、加载速度或 FPS；未作性能改善量化声明。代码 / CSS 已覆盖 prefers-reduced-motion，但未切换真实 OS 设置验证动态变化，也未进行原生手机或持续帧率测量。

服务器原始日志、构建和发布证据归同编号本地 ops。先前候选只含动效，不含后来协议切换；正式交付使用 M1-14 的最终合并版本，不能把中间候选当成已发布。

## 后续更正

用户反馈点阵 /独立检测文案与骨架不协调，当前按 [骨架调整](skeleton-refinement.md) 统一；LatticeLoader已不再使用且源码已删除。上方两组件说明和截图是初版的实际记录，保留作历史，不代表当前加载样式。
