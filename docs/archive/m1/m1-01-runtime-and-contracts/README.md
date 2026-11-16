# M1-01：Bun 脚手架、依赖与 MMDB 兼容性

日期：2026-11-13。状态：已完成本任务实现、测试及基础版本部署验证；完整 M1 业务未完成。

## 目标与授权

用户要求 Bun 调用官方脚手架创建项目、固定依赖、验证 MMDB 读取兼容、做好测试并按任务归档，随后明确允许替换香港当前部署。Git 提交 / 推送未获授权。已把脚手架优先、测试 / 进度 / 归档收尾要求写入中文 AGENTS。

## 实际改动

- Bun 1.4.4 调用 create-next-app 16.4.6，使用 app-tw-empty、TypeScript、Tailwind、ESLint、App Router、src 与 @/* 别名；先在任务临时目录生成，再受控合并到非空项目，没有覆盖品牌、docs、ops 或 Git。
- Bun 调用 shadcn 4.23.0 CLI 初始化 radix-nova / Neutral，生成组件配置、语义主题和工具函数。无额外 UI 套件或旧原型恢复；正式双卡与三语 / 主题交互仍属 M1-02。
- 锁定直接依赖、bun.lock、Bun / Node 版本与生产镜像摘要。Next.js 16.4.6、React 19.3.1、next-intl 4.15.1、maxmind 5.0.9；TypeScript 保留官方脚手架的 5 系并固定 5.9.3，未盲目升级至新主版本。ESLint 使用经验证兼容的 10.14.0。
- 增加严格地址解析、TypeScript 资料 / 错误契约、三库内存 Reader 候选加载器和无敏感信息的健康检查；不等于完整查询 API 或更新切换管理器。
- 准备页保留原品牌、明确尚在准备，不展示假出口、假数据或未完成导航。构建不依赖在线字体；暂不索引准备页，正式上线在后续任务调整 robots / metadata。
- 正式项目 Dockerfile / Compose / Caddy 配置位于 deploy，兼容性脚本位于 scripts；凭据、真实 MMDB 和整个 ops 不进入 Git 或镜像上下文。

## 验证结果

| 范围 | 实际结果 | 证据 |
| --- | --- | --- |
| 官方初始化 | CNA 和 shadcn CLI 成功，生成来源可追溯 | [生成记录](scaffold.log)、[生成清单](generated-files.json)、[shadcn](shadcn.log)、[初始化配置](shadcn-info.json) |
| 依赖 / 复现 | 固定直接版本；Bun 冻结锁文件安装通过，未使用 npm / pnpm 回退 | [版本](versions.json)、[依赖树](dependency-tree.txt)、[冻结安装](frozen-install.log) |
| 单元与异常 | 34 项通过、0 跳过，覆盖严格输入、特殊地址、映射地址、规范化、缺文件 / 损坏候选 | [测试输出](unit-tests.log) |
| 本地 Node 真库 | 三库 39 次查询与同批官方 Python 结果一致，3 次非法输入拒绝，3 个文件哈希一致；候选失败保留旧读者，删除源副本后旧读者仍可读 | [结果](mmdb-node.json) |
| 三语依赖组合 | next-intl + React 服务端渲染三种 locale 与生成工具函数导入成功；不是完整页面翻译验收 | [组合检查](dependency-smoke.json) |
| 工程检查 | Lint、类型检查、生产构建均通过；Linux 镜像内再次冻结安装、34 项测试、Lint / 构建 / 类型检查全部通过 | [Lint](lint.log)、[类型](typecheck.log)、[本地构建](build.log)；原始 Linux 日志仅本地 ops |
| Linux Node 真库 | Node 24.20.0、禁网验证容器：24 次公共样本查询与 Python 一致，3 次非法输入及三库哈希校验通过；生命周期检查通过 | [Linux 摘要](linux-verification.json)；完整记录仅本地 ops |
| 健康与失败 | 配置真库 200 / ready；配置缺库 503 / unavailable；禁止共享缓存，无路径、异常栈或机密回传 | [健康检查](health-tests.json) |
| 部署与恢复 | 新基础版本已替换旧应用；重启后主站与 API 域 GET/HEAD 健康正常、品牌图字节一致；旧 Web/API 停止并禁自动重启，确认指向旧目录的项目定时任务已停用 | [公网检查](public-health.json)、[部署摘要](deployment-verification.json)；服务器细节仅本地 ops |
| 真实浏览器 | Codex 内置浏览器实际看到公网准备页与品牌图，无浏览器证书警告 | [公网截图](evidence/2026-11-13-public-preparation-page.png) |

## 兼容性发现与处理

- 官方 CNA 需要写自身偏好目录，初次遇文件系统限制；通过授权后运行。另补齐其要求的临时父目录；保留 [路径预检输出](scaffold-path-check.log)，没有因脚手架问题改为手工拼装应用。
- 读取器本身对非法字符串可能返回 null，初次断言发现后改为项目入口显式解析 / 拒绝，再完整跑通；原始失败输出保留本地 ops，不把它称为库原生拒绝。
- 香港 Docker 缺 Buildx，首次 --progress 参数不支持；改用其已有普通构建器并通过，不升级 Docker 或修改其他系统服务。
- 公网浏览器与 curl 正常；已对照确认：Python-urllib/3.9 默认 User-Agent 在 curl / urllib 均为 403，使用明确的 IPinfoRuntimeCheck/1.0 标识两者均为 200 / ready。未修改或放宽边缘访问控制；这是现有入口的客户端标识限制，不是读取器兼容失败。监测脚本应明确标识自身，完整证据仅本地 ops。

收尾另已通过 [归档检查](archive-checks.json)：链接、47 组范围 / 16 组验收 / 8 个任务保留，整个 ops 与数据忽略、已知机密排除、单锁文件和品牌原图一致；本地临时测试服务已停止。

## 尚未实施

首页自动出口、独立 IP 查询页、三语消息与切换、主题跟随、资料合并服务、公开查询 / 出口 API、最近记录、正式每日更新及完整 M1 业务验收。当前准备页不是 M1 成品视觉确认。没有注册监控、提交 / 推送 Git 或恢复旧原型。

## 下一步

按 M1-02 制作公共布局、首页双卡与独立查询页结构、三语及主题；M1-03 接共用资料服务。范围和标准见 [当前范围](../../../PROGRESS.md)，实际状态见 [进度](../../../PROGRESS.md)，接口与生命周期见 [契约](contracts.md)。

本地运维资料在 ops/archive/m1/m1-01-runtime-and-contracts/，整个 ops 继续 Git 忽略，公开文档不复制服务器清单、密钥或私人日志。
