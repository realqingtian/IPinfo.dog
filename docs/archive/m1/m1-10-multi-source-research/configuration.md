# IPinfo Lite 配置准备

日期：2026-11-16。属于 M1-10，沿用用户的多源接入授权；本次具体请求为规范根目录 `.env` 中的 Key 命名。

## 实际变更

- 将 `IPINFO_API_KEY` 改为 `IPINFO_LITE_TOKEN`。原名称符合环境变量语法；新名称明确区分供应商、Lite 产品与 token，避免与本站私有入口 token 混淆。
- 保留用户创建的 `.env` 文件与 Key 原值；文件权限改为 0600。没有复制 Key 到公开示例、文档或代码。
- `.env.example` 增加空的 `IPINFO_LITE_TOKEN=`；AGENTS 同步本地开发配置例外与生产运行时凭据边界。
- 沿用现有 `.gitignore` 与 Docker 构建白名单；根目录 `.env` 不进入 Git 或镜像构建上下文。`NEXT_PUBLIC_` 只适合公开配置，不用于凭据。

本地 Next.js / Bun 可读取根目录 `.env`；普通 Node 脚本可显式使用 `--env-file=.env`。这只是配置约定，当前应用尚未增加 IPinfo 适配器，不声称重命名后页面就已经展示第二来源。

## 验证

- 重命名前后在内存比较值摘要一致，未输出 Key 或摘要。
- `git check-ignore .env` 命中；`git ls-files --error-unmatch .env` 按预期失败，证明当前未跟踪。文件权限 0600。
- 本地 Node 通过新变量加载凭据，使用官方 HTTPS Lite 端点、Bearer 认证头分别查询固定 Google IPv4 / IPv6 样本；两次均 HTTP 200，响应目标匹配，国家代码及 ASN 字段存在。
- 不使用 `me` 端点，不把用户截图地址或当前访客 IP 作为样本。未记录认证头、原始响应或 Key；实际检查日志仅存本地 ops 对应任务目录。
- 官方依据：[认证方式](https://ipinfo.io/developers)、[Lite 端点与字段](https://ipinfo.io/developers/lite-api)。Lite 没有城市字段，不能据此填造城市或风险标签。

## 边界与下一步

本次未修改页面、业务 API、服务器配置或部署；未运行应用单元 / 构建 / 浏览器验收，这些不能用凭据测试代替。尚未验证香港运行环境、生产运行时凭据挂载与前端多源展示。后续继续实现两页多源链路，保留本地主源并隔离外部来源失败；有账号或授权条件的来源按调研逐项落实。
