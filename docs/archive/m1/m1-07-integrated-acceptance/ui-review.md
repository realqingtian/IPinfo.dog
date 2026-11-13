# 界面规范核对

日期：2026-11-13。核对当前两页、公共布局和偏好组件，采用[最新公开 Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)；不将通用建议强加为新的产品需求。

src/features/ip/components/query-screen.tsx:38 - 已修复主动提交错误后焦点未返回输入，浏览器实测 focused=ip-input。

src/features/ip/components/query-screen.tsx:48 - 已补 name 和 translate；原有标签、错误关联、粘贴 / 回车仍可用。

src/features/ip/components/home-screen.tsx:20 - 已补独立 polite 异步区域；两种协议失败 / 恢复分别检查。

src/components/providers/preferences.tsx:38 - 已同步语言切换后的页面描述，六个 SSR 描述与三语浏览器状态核对通过。

src/features/ip/components/ip-result-card.tsx - 标签 / 图标说明、长地址、键盘详情、完整复制通过；地址 / 标识不交给自动翻译改写。

src/components/layout/site-shell.tsx - 原生导航 / 跳转链接、品牌图片尺寸与装饰 alt、主题菜单可操作，原始素材保持。

实际按下 Tab 后焦点可见，Enter 打开 / 关闭详情，Escape 可关闭菜单；错误、加载和字段来源可感知。使用已有 shadcn 语义颜色与组件，不加新设计风格。用户已确认两页视觉。

未模拟系统主题实际切换、浏览器权限禁用或屏幕阅读器真人朗读；相应边界与注入测试见验收矩阵，不写成全设备 / 全辅助技术兼容证明。
