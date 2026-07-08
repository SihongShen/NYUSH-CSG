# NYUSH-CSG

动代码之前，按顺序读：

1. **[AGENT_CONTEXT.md](AGENT_CONTEXT.md)** — 编码模式速查（文件放哪、禁止事项、Supabase 客户端用法、表速查、校验规则）
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — 架构决策的唯一权威来源

改接口先对 [API_CONTRACT.md](API_CONTRACT.md)，改页面行为先对 [FEATURES.md](FEATURES.md)；改完代码同步更新对应文档。

提交前必须通过：`npm run typecheck && npm test`。数据库变更一律走 `supabase/migrations/`（本地应用要手动 `supabase migration up`）。
