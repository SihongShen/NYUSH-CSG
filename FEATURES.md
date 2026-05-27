# FEATURES.md — NYUSH-CSG 前端功能规约

> 描述每个页面长什么样、用户能做什么、怎么跟后端交互。
> 配套 [API_CONTRACT.md](API_CONTRACT.md)（接口契约）+ [ARCHITECTURE.md](ARCHITECTURE.md)（路由 / 文件位置）。
>
> 每个 H2 是一个页面。子标题统一为：
> **入口** / **主要 UI** / **字段 / 校验**（如有表单）/ **关键交互** / **调用的 API** / **空·错·加载状态** / **待决问题**

---

## 1. `/login` — 登录 / 注册

**入口**：未登录访问任何路由会被 [middleware](src/middleware.ts) 重定向到这里。

**主要 UI**：单卡片居中，shadcn `Tabs` 切换"登录 / 注册"。NetID 输入框右侧固定显示 `@nyu.edu`。

**字段 / 校验**（见 [src/lib/auth/validate.ts](src/lib/auth/validate.ts)）：
- NetID：`^[a-zA-Z][a-zA-Z0-9]{1,14}$`
- 密码：≥ 8 位
- 注册需"确认密码"匹配

**关键交互**：
- 登录成功 → `router.replace('/')` → middleware 放行进首页
- 注册成功 → 留在 `/login`，提示"请去邮箱完成验证"，**不**自动登录（Supabase 邮箱验证流程）

**调用的 API**：
- 登录：前端 `supabase.auth.signInWithPassword()`（不走 `/api`）
- 注册：`POST /api/auth/register`
- 邮箱回调：`GET /api/auth/callback`

**空·错·加载状态**：
- 表单校验失败：字段下方红字
- 登录失败：`Alert` 显示"邮箱或密码错误"
- 提交中：按钮 disabled + 文字变"登录中…"

**待决问题**：
- [ ] 注册成功后要不要把 NetID 自动填到登录 tab？
- [ ] 找回密码（`reset-password` 路由目前只是占位重定向，MVP 是否要做？）

---

## 2. `/` — 课程筛选浏览（主页）

**入口**：登录后的默认落地页。Navbar logo 点击也回这里。

**主要 UI**：
- 顶部 Navbar（详见末尾 [跨页面通用约定](#跨页面通用约定)）
- 左栏：筛选面板（窄屏折叠成顶部抽屉）
- 右侧主区：搜索框 + 课程卡片列表

**搜索**：
- 单个输入框，模糊匹配 `code` OR `name_en`（ILIKE 在后端做）
- 输入触发 300ms debounce 后调 API

**筛选**（多选 checkbox，**同维度 OR、跨维度 AND**）：
- **Category**：☐ Core ☐ Major Requirement ☐ Elective
- **Department**：☐ CS ☐ IMA ☐ ECON …（从已有课程动态生成 distinct 列表，前端缓存）

筛选状态同步到 URL query（如 `/?q=CSCI&category=Core,Major&department=CS`），方便分享 / 浏览器后退。

**课程卡片显示**：
- 大字：`code`
- 副标题：`name_en`
- Badge：category / department
- 角标：评价数（若 = 0 显示 "暂无评价"）
- 点击 → `/courses/[id]`

**关键交互**：
- 没搜出结果且当前有筛选 → 提示"调整筛选试试"
- 没搜出结果且无筛选 → 提示"没找到这门课，[申请添加]"（链接到申请新课流程，MVP 决定后填）

**调用的 API**：
- `GET /api/courses?q=&category=&department=&limit=20&offset=0`
- 滚动到底翻页（offset 累加；或简单先 "加载更多" 按钮，看实现成本）

**空·错·加载状态**：
- 加载中：骨架屏卡片
- 无结果：见"关键交互"
- 网络错：顶部 toast + 主区"加载失败，重试"按钮

**待决问题**：
- [ ] Department 列表硬编码（CS / IMA / ECON / …）还是动态 distinct？硬编码简单但加新系要发版
- [ ] "申请新课"功能 MVP 是否实现？API 端已有 `POST /api/courses` 但前端入口待定
- [ ] 课程卡片上的"评价数"是否需要后端 join，还是单独 endpoint 异步加载？
- [ ] 默认排序：评价数 desc？code 字母序？

---

## 3. `/courses/[id]` — 课程详情 + 评价

**入口**：从 `/` 点课程卡片跳过来。

**主要 UI**（从上到下三段）：

1. **课程信息区**：返回按钮、`code` 大标题、`name_en`、category / department / core_type badge、教授列表、平均评分 + 评价总数
2. **评价列表区**：见下方"排序"
3. **写评价区**：见下方"写评价"

**评价列表排序**：
- 第 1 条：**当前用户自己的评价**（如果有，置顶）。包括 `is_visible=false` 软删的，标"已删除（仅自己可见）"+ [恢复] 按钮
- 之后：其他人按 `created_at DESC`

自己评价右上角有 [编辑] [删除]，其他人没有。

**写评价区**：
- 用户**未写过该课程** → 页面底部大按钮 "写评价" → 点击 inline 展开表单
- 用户**已写过** → 写评价区不显示（要修改去置顶那条点 [编辑]）

**评价表单字段 / 校验**（写和编辑共用，编辑预填）：
- **教授** dropdown，单选：来源该课程关联的教授列表
- **学期** dropdown，单选：前端生成最近 4 学期（如 `2026 Spring` / `2025 Fall` / `2025 Spring` / `2024 Fall`）
- **校区** dropdown，单选：14 个 NYU site（参考 `lib/constants/sites.ts`，待建）
- **rating / difficulty / workload**：1–5 星点击，均必填
- **评价内容**：tab 切中文 / 英文，**至少一个非空**

**关键交互**：
- 写评价 inline 表单：提交成功 → 表单收起 + 新评价插入到列表置顶位置 + toast 成功
- 编辑：点 [编辑] → 该评价行原地变表单 → 保存 → 变回只读
- 删除：点 [删除] → 二次确认 dialog → 调 PATCH `is_visible=false` → 评价标灰但仍在置顶位置
- 恢复：软删后点 [恢复] → 调 PATCH `is_visible=true`
- 提交失败（如 409 同学期重复）→ Alert 提示"你已经写过这个学期这位教授的评价"

**调用的 API**：
- `GET /api/courses/[id]` 加载课程信息
- `GET /api/reviews?course_id=[id]` 加载评价（后端按 visible OR own 过滤）
- `POST /api/reviews` 写
- `PATCH /api/reviews/[id]` 改 / 软删 / 恢复
- 作者 anonymous_id 由后端 `get_anonymous_id()` 函数 join 进结果（不需要前端单独查）

**空·错·加载状态**：
- 课程 404：渲染"课程不存在"+ "回首页"按钮
- 评价为空且自己也没写：显示"暂无评价，[写下第一条]"
- 加载中：评价列表骨架屏 3 条

**待决问题**：
- [ ] semester dropdown 包含多少个学期？最近 4 个够吗？要不要支持往前查？
- [ ] 评价内容输入字数下限 / 上限？避免一行字水评价
- [ ] 评价的中英两栏要 tab 切换还是同时显示两个输入框？

---

## 4. `/profile` — 我的评价

**入口**：Navbar 右侧 [我的评价] 链接。

**主要 UI**：
- 顶部信息卡：显示 "你的匿名 ID：**abc12345**" + 复制按钮（方便用户跟朋友说自己是哪条评价）
- 下方：当前用户**所有**评价（含软删的）列表

**每条评价显示**：
- 课程 code + name（点击跳 `/courses/[id]` 并自动滚到自己评价）
- 教授 / 学期 / 校区
- ★ rating / 难度 / 工作量
- 评价内容前 200 字 + "…"
- 右上角：[编辑] / [删除]
- 已软删：整条标灰 + "已删除（仅自己可见）"标签 + [恢复] 按钮

**关键交互**：
- 点 [编辑] → 跳到 `/courses/[id]?focus=review` → 该页面自动滚到自己评价 + 展开编辑表单
- 删除 / 恢复：同 `/courses/[id]` 行为

**调用的 API**：
- `GET /api/reviews?user_id=<self>` 拿所有自己评价（包括 is_visible=false，由 RLS 允许）

**空·错·加载状态**：
- 没写过任何评价：显示"你还没写过评价，[去看看课程]"按钮
- 加载中：骨架屏 3 条
- 错误：toast + 重试按钮

**待决问题**：
- [ ] anonymous_id 能不能让用户主动重置一个？（默认不能）
- [ ] 评价是否分组：已发布 / 已删除分两栏？还是混在一起标灰区分？

---

## 跨页面通用约定

### Navbar（除 `/login` 外都显示）
- 左：logo "NYUSH 课程评价"，点击回 `/`
- 右：[我的评价] · [中 / EN 语言切换] · [退出登录]
- 移动端：右侧三按钮收进汉堡菜单

### Toast 提示
- 用 shadcn `<Sonner>` 或类似
- 成功：绿色 ✓ + 简短文案（3 秒）
- 错误：红色 ✗ + 错误原因（5 秒）

### Loading 状态
- 列表加载用 [shadcn Skeleton](src/components/ui/) 骨架屏（未来安装）
- 按钮提交中：`disabled` + 文字改 "处理中…"

### 错误页
- 404：写自定义 `not-found.tsx`，"页面不存在 · [回首页]"
- 500：写 `error.tsx`，"出错了，请稍后重试"

### i18n
- 所有文案走 `useTranslations`，禁止硬编码中英
- 默认 zh；messages/en.json 同步键，英文文案后期慢慢翻

### URL 状态同步
- 筛选页 `/` 的搜索关键词 + 筛选条件写入 URL query，刷新 / 后退保持状态
- `/courses/[id]?focus=review` 用 query 触发自动滚动 + 展开编辑

### 未登录处理
- middleware 已统一拦截，没登录的请求一律 302 到 `/login`
- 前端**不**做"未登录则显示登录按钮"这种 fallback UI（middleware 是唯一守卫）

---

## 状态总览（实现进度）

| 功能 | 文档 | 实现 |
|------|------|------|
| 1. `/login` | ✅ | ✅ |
| 2. `/` 筛选浏览 | ✅ | ⏳ 仅占位 |
| 3. `/courses/[id]` | ✅ | ⏳ 仅占位 |
| 4. `/profile` | ✅ | ⏳ 仅占位 |
