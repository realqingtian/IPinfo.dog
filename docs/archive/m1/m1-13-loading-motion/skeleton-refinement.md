# 统一骨架加载

日期：2026-11-16。当前：已发布，工程 /候选 /公网 /当前浏览器验收完成；真机和用户新版视觉待反馈。

用户反馈“IPv4 · 检测中”点阵文案与骨架混用不协调。本次首次检测摘要统一为两行骨架，移除可见点阵和独立检测文字；辅助状态保留在读屏文本和aria-busy。刷新工具栏取消重复文字 /点阵，保留按钮Spinner、字段骨架与错误提示。无引用的LatticeLoader源码一并删除；React Bits FadeContent /GSAP及其许可保留。

本地142项单元、lint /build /typecheck通过，没有为这次样式变更增加镜像式测试；现有取消竞态、协议、遮挡、三语与核心业务测试保留。真实首页初始加载无点阵、摘要骨架显示且没有可见检测文字；390px深色查询仍有11个字段 /来源骨架、按钮busy、输入焦点保持，完成后三源就绪、骨架撤去。没有增加测试延迟或模拟请求。

- [桌面初始骨架](skeleton-desktop-initial.jpg)
- [手机深色查询加载](skeleton-mobile-dark-query.jpg)
- [单元](skeleton-unit.log)、[lint](skeleton-lint.log)、[构建](skeleton-build.log)、[类型](skeleton-typecheck.log)

同时修复 [协议切换列宽](../m1-14-protocol-switch/stable-columns.md) 和 [页脚](../m1-12-provider-icons/footer-identity.md)。正式环境证据仅在本地ops；不把浏览器视口当原生真机，不扩展为FPS或OS动态偏好验收。

## 正式交付

最终镜像 m1-13-skeleton-e17629ab0003 healthy；本地 /Linux各142单元及工程通过，正常网络候选7图标 +12来源 +33核心、认证协议样本通过，公网7+12+39共58项通过。网关未重启，数据库状态和更新器 /两个timer保持。

正式内置浏览器首页初始状态无点阵和可见检测文字，读屏文本保持；两族加载后切换五列表头坐标 /宽度完全一致，查询页三源就绪、骨架归零。390px页面无横向溢出、只有表内滑动，控制台0错误警告，页脚含版权行且无版本号 /GitHub。查看 [正式首页加载](skeleton-public-initial.jpg)、[正式查询与页脚](../m1-12-provider-icons/footer-public-identity.jpg)、[手机正式表格](../m1-14-protocol-switch/stable-columns-public-mobile.jpg)。

公开材料与客户端资源1249文件扫描未含本地token，ops /真实数据 /密钥仍忽略，品牌原图不变。原生真机、真实读屏朗读、OS减少动态效果切换及FPS未执行，不将DOM /视口回归冒充这些场景。源码与归档保存本地提交，未推送。
