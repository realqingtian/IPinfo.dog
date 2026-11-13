# M1-06 更新与读取约定

日期：2026-11-13。产品规则沿用路线图 C01 / A14，未更改每天检查一次的选择。

后续 M1-07 综合验收已修复同内容坏目录恢复：状态新增可选物理 folder / 代次，与内容 ID 分开；新目录完整发布后原子换指针，旧状态继续兼容。配置仅接受完整三库与账号 / 密钥项。最新实现细则见 [修复与兼容](../m1-07-integrated-acceptance/repair.md)，下文保留最初设计上下文，不将首次实现冒充已经覆盖该修复。

## 一次检查的事务边界

官方 geoipupdate 8.0.0 及公共 CA 包从固定摘要的官方镜像取得，独立 Node 更新镜像运行；Web 镜像没有下载凭据挂载。宿主 flock 覆盖更新容器全生命周期，systemd oneshot 不重叠启动，Persistent timer 在错过执行后补一次；每天 03:00 Asia/Taipei，明确保留调度时区。

数据根包含 `state.json` 和 `releases/<三库内容哈希>/`。更新器在 `.candidate-*` 暂存目录中预填当前三份文件，让官方工具检查版本、跳过未变文件；首次迁移可使用根目录原有三库预填。只有官方工具正常退出，三库类型 / IPv6 / 构建时间和六次真实样本读取全过，且每库构建时间未倒退，才发布。三库不要求同日构建；可选定位字段仍允许缺失。

候选完整移动到不可变 release，`state.json` 写临时文件、fsync 后原子 rename，再同步目录。状态一次包含完整版本、最近检查与最近成功确认时间。无变化只推进确认时间，不切换版本。失败不延长确认时间、不替换有效版本；错误日志只用固定码，不记录下载凭据、供应商正文或目标私人地址。

只有持有宿主锁的受控入口可以执行更新 CLI。遗留容器仅在名字与专用标签均匹配且已经取得同一锁时移除；其他容器不清理。暂存与未使用旧哈希目录在后续执行清理，不按任意路径删除。

## 读者、缓存与文件生命周期

托管模式 `GEOIP_MANAGED=1` 每次取数据集前读取小型状态文件。三库一次加载为完整内存读者，校验内容 ID 后才激活；同一版本并发加载共用 Promise。切换期间再读指针，遇退休版本最多重取一次；失败保留以前已确认的内存快照、短暂退避后再尝试。

单次查询捕获完整快照，三个字段来源读取同步执行，不混用两版本。资料缓存按完整 ID 清空 / 隔离。MMDB 使用 Buffer，readFile 已关闭文件描述符；已捕获请求不依赖旧磁盘文件，清理后仍能完成。首次加载与清理竞态不能激活不再指向的版本。迁移遗留的根目录平铺三库待 Web 切换并验收后定点删除。

72 小时未成功确认提示 warning，仍可使用有效资料；30 天则拒绝资料读取，包括旧缓存与重启后恢复，基础出口 /api/exit 不依赖此路径。状态文件或新版本加载异常也立即提示 warning，但不能延长旧版本有效期。没有有效快照时 unavailable；系统时钟出现不可信未来确认时间时拒绝将其视为有效。

## 页面与健康

`/api/data-status` 只公开 current / warning / expired / unavailable / unmanaged 与最后成功检查时间，不公开磁盘路径、账号或密钥。响应 private / no-store、同源策略。两页共用已有 shadcn Alert，异常提示同步简 / 繁 / 英；每分钟检查一次，网络错误不伪造更新状态。恢复后重新加载页面可立即读到新状态。

`/api/health` 同时反映资料可用与更新状态；warning 且资料可用仍 200，expired / unavailable 503。`/api/health/live` 仍仅表示进程存活。资料过期不停止 Web，也不阻止首页取得基础地址。

## 验证口径与参考

固定夹具验证阈值与竞态；`GEOIP_DATABASE_DIR=<三库目录> node scripts/geoip/check.ts` 在临时副本执行真实读取、候选失败、版本切换、并发、文件清理、过期 / 重启 / 恢复。仅测试副本的 ASN build_epoch 前进一秒，用来制造可识别版本，不修改源文件、不发布模拟库。它不是官方新版本下载证明。

[官方更新指南](https://dev.maxmind.com/geoip/updating-databases/)、[官方镜像与配置](https://maxmind.github.io/geoipupdate/doc/docker/)、[8.0.0 发布](https://github.com/maxmind/geoipupdate/releases/tag/v8.0.0)、[systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html)。实际部署与验收结果见任务 README，原始运维证据只留本地 ops。
