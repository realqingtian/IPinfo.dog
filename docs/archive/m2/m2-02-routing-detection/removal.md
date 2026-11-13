# 移除 1Password

日期：2026-11-13。用户要求丢弃无法确认的站点，并继续下一项，沿用 M2-02 任务目录。

从静态目标表移除 1Password，现为 33 项 / 7 类，办公工具 5 项；同步目录断言、页面 HTTP 检查、路线图和当前说明。原 34 项端点 / 浏览器 / 发布报告保留历史原件，不改写为 33 项证据。

状态：已实现并随 M2-03 的 m2-03-6a50bc1348ad 发布。移除后本地 [128 项测试](removal-unit-tests.log)、[lint](removal-lint.log)、[构建](removal-build.log)、[类型](removal-typecheck.log)通过；合并 WebRTC 后总计 138 项通过，见 [M2-03](../m2-03-webrtc-detection/README.md)。[本地](removal-local-http.json)及[公网](removal-public-http.json)各 13 项通过，明确检查三语 33 项且无 1Password。

正式内置浏览器重新加载后显示初始 0 / 33，DOM 33 个目标且无 1Password；[截图](evidence/2026-11-13-removal.jpg)。未重新对其余 33 个第三方目标全部发请求，不复用首次 34 项测量冒充新检测结果。未修改请求、分组逻辑、入口或数据库；本地提交不推送。
