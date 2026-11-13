# IPinfo.dog

IP 查询与网络出口检测。Next.js + TypeScript + shadcn/ui，Bun 管理依赖，Node 运行服务端。

当前交付 M1-01 基础与读取器验证、M1-02 两页示例界面和三语 / 主题。首页与独立查询页明确展示示例，真实查询、出口检测、历史和自动更新按后续任务接入；目前不是完整查询工具。

## 开发与检查

Bun 1.4.4、Node 24.20.0，具体依赖均已固定，保留一份 bun.lock。

```bash
bun install --frozen-lockfile
bun run dev
bun run test:unit
bun run lint
bun run build
bun run typecheck
```

真实库验证：`GEOIP_DATABASE_DIR=<目录> bun run test:mmdb <官方 Python 对照 JSON>`。需要合法取得的三份真实 MMDB；缺文件不会被跳过并计为通过。数据库、凭据及整个 ops 不提交或进入构建上下文。

生产构建见 deploy/Dockerfile，使用 Node。服务器连接与实际发布记录只留本地 ops。

## 文档入口

- [开发进度](docs/PROGRESS.md)
- [范围与验收](docs/ROADMAP.md)
- [归档规则](docs/archive/README.md)
- [M1-01](docs/archive/m1/m1-01-runtime-and-contracts/README.md)
- [M1-02](docs/archive/m1/m1-02-interface-and-preferences/README.md)

仓库拟开源，许可证尚未选定，未添加授权许可声明。
