# FEATURES.md — NYUSH-CSG 前端功能规约

> 描述每个页面长什么样、用户能做什么、怎么跟后端交互。
> 配套 [API_CONTRACT.md](API_CONTRACT.md)（接口契约）+ [ARCHITECTURE.md](ARCHITECTURE.md)（路由 / 文件位置）。
>
> 每个 H2 是一个页面。子标题统一为：
> **入口** / **主要 UI** / **字段 / 校验**（如有表单）/ **关键交互** / **调用的 API** / **空·错·加载状态** / **待决问题**

---

## 1. `/login` — 登录（Google OAuth）

**入口**：未登录访问任何路由会被 [middleware](src/middleware.ts) 重定向到这里。

**主要 UI**：单卡片居中，一个带 Google logo 的「使用 NYU 谷歌账号登录」按钮（outline 样式，logo 为内联 SVG）+ "仅限 @nyu.edu 账号登录"提示。
无注册 tab、无密码字段——登录即注册（首次登录自动建用户）。

**关键交互**：
- 点按钮 → `supabase.auth.signInWithOAuth({ provider: 'google' })`（带 `hd=nyu.edu`）→ 整页跳转 Google 授权
- 授权成功 → Google → Supabase → `GET /api/auth/callback` → 重定向到 `/`
- 回调失败 → 跳回 `/login?error=auth`（授权失败）或 `/login?error=domain`（非 NYU 账号），`LoginForm` 读 query 显示对应 `Alert`
- `/register` 是旧链接兼容重定向，会跳到 `/login`（OAuth 无密码，reset-password 已删除）

**域名限制**：`hd` 参数只是 UX 提示；强制校验在服务端 `hook_before_user_created`（拒绝非 @nyu.edu），callback 应用层再校验一次兜底。

**调用的 API**：
- 登录：前端 `supabase.auth.signInWithOAuth()`（不走 `/api`）
- OAuth 回调：`GET /api/auth/callback`

**空·错·加载状态**：
- 发起跳转失败 / 回调报错：`Alert` 显示"登录失败，请重试"或"仅限 @nyu.edu 账号登录"
- 跳转中：按钮 disabled + 文字变"跳转中…"

---

## 2. `/` — 课程筛选浏览（主页）

**入口**：登录后的默认落地页。Navbar logo 点击也回这里。

**主要 UI**：
- 顶部 Navbar（详见末尾 [跨页面通用约定](#跨页面通用约定)）
- 左栏：筛选面板（窄屏折叠成顶部抽屉）
- 右侧主区：搜索框 + 课程卡片列表

**搜索**（Navbar 内的全局搜索框）：
- 模糊匹配 `code` / `name_en` / 关联教授名（ILIKE 在后端做）
- 回车提交，只更新 URL 的 `q`，**保留已勾选的筛选条件**；输入框内容跟随 URL（前进/后退/点 logo 自动同步）

**筛选**（多选 checkbox，**同维度 OR、跨维度 AND**；Major 筛选时 required ∪ elective 一起匹配）：
- **Major**（主修，required + elective 合并匹配）
- **Minor**
- **Core**（GPS / PoH / WAI 等子类）
- **General Elective**（单个开关）
- 校区由 Navbar 的 CampusProvider 全局切换（16 个 NYU site，学位校区在前 study-away 在后），不在筛选面板里

筛选状态同步到 URL query（如 `/?q=CSCI&major=CS,DS&core=GPS`），方便分享 / 浏览器后退。

**课程卡片显示**：
- 大字：`code`
- 副标题：`name_en`
- Badge：major / minor / core_type / GE 分类
- 角标：真实评价数，**按等同课组合并计数**（= 0 显示 "暂无评价"）
- 点击 → `/courses/[id]`

**关键交互**：
- 无结果：EmptyState 提示调整筛选 / 换关键词；「添加课程」按钮常驻页面顶部（弹窗提交，校区跟随 Navbar）

**调用的 API**：
- `GET /api/courses?q=&campus=&major=&minor=&core=&ge=&limit=20&offset=0`
- `q` 同时匹配课程编号 / 名称 / 教授名；items 附带 `review_count`
- **默认排序：评价数降序**（等同课组合并计数），同数按课号字母序
- 分页：列表底部「加载更多（还有 N 门）」按钮，offset 累加追加；已加载条数写入 URL 的 `?n=`（replace），从详情页返回时按 n 恢复深度（上限 100）；筛选条件变化重置到第一页并清掉 n

**空·错·加载状态**：
- 加载中：骨架屏卡片
- 无结果：见"关键交互"
- 网络错：主区 EmptyState 显示"加载失败"（刷新页面重试）

---

## 3. `/courses/[id]` — 课程详情 + 评价

**入口**：从 `/` 点课程卡片跳过来。

**主要 UI**（从上到下三段）：

1. **课程信息区**：返回按钮、`code` 大标题、`name_en`、major / minor / core_type / GE badge、教授列表、评价总数（无量化评分）、等同课链接（如 NY 的同一门课，点击跳其详情）
   - **等同课评价聚合**：评价列表自动包含等同课组内其他校区课程的评价，靠每条评价的 site 标识区分来源
2. **评价列表区**：见下方"排序"
3. **写评价区**：见下方"写评价"

**评价列表排序 / 筛选**：
- 第 1 条：**当前用户自己的评价**（如果有，置顶）。包括 `is_visible=false` 软删的，标"已删除（仅自己可见）"+ [恢复] 按钮
- 之后：其他人按 `created_at DESC`（可切最早 / 学期升降序）
- **按教授筛选**：选项从已加载的评价推导（不是课程关联教授表），等同课聚合进来的评价也能筛到；≥2 个教授才显示筛选器

自己评价右上角有 [编辑] [删除]，其他人没有。

**写评价区**：
- 用户**未写过该课程** → 页面底部大按钮 "写评价" → 点击 inline 展开表单
- 用户**已写过** → 写评价区不显示（要修改去置顶那条点 [编辑]）

**评价表单字段 / 校验**（写和编辑共用，编辑预填）：
- **教授** dropdown，单选：来源该课程关联的教授列表（小写存储、展示首字母大写）；也可选"新教授"填 `new_professor_name`（后端 find-or-create 并关联到课程）
- **学期**：年份 + 季节两个 dropdown（Fall / Spring / Summer / January）
- **校区**：不在表单里选——自动取 Navbar 当前全局校区；表单内有紫色虚线框醒目提示「这条评价将标记为在 **XX** 上的课，不对先切校区」，study-away 先切校区再写评价
- **评价内容**：中文 / 英文两栏，**至少一个非空**；**合计 ≥ 30 字符、单栏 ≤ 5000**（前后端双校验，规则在 `lib/constants/reviews.ts`；表单右下角实时显示合计字数）
- rating / difficulty / workload 量化指标已移除（MVP 只做文字评价，未来可能加回）
- 提交 429（超每小时 10 条限额）→ toast "提交太频繁"

**关键交互**：
- **点赞 / 点踩**：每条评价底部 👍 / 👎 按钮 + 计数；点击投票、再点撤票、点另一个改票（乐观更新，失败回滚）；不能给自己的评价投票（按钮禁用）
- 写评价 inline 表单：提交成功 → 表单收起 + 新评价插入到列表置顶位置 + toast 成功
- 编辑：点 [编辑] → 该评价行原地变表单 → 保存 → 变回只读
- 删除：点 [删除] → 二次确认 dialog → 调 PATCH `is_visible=false` → 评价标灰但仍在置顶位置
- 恢复：软删后点 [恢复] → 调 PATCH `is_visible=true`
- 提交失败（如 409 同学期重复）→ Alert 提示"你已经写过这个学期这位教授的评价"

**调用的 API**：
- `GET /api/courses/[id]` **一次请求返回课程信息 + 全部评价**（含等同课组，visible OR own 由 RLS 过滤）
- `POST /api/reviews` 写
- `PATCH /api/reviews/[id]` 改 / 软删 / 恢复
- `POST /api/reviews/[id]/vote` 点赞 / 点踩 / 撤票
- 作者 anonymous_id 由后端 `get_anonymous_id()` 函数带进结果（不需要前端单独查）

**空·错·加载状态**：
- 课程 404：渲染"课程不存在"+ "回首页"按钮
- 评价为空且自己也没写：显示"暂无评价，[写下第一条]"
- 加载中：评价列表骨架屏 3 条

---

## 4. `/profile` — 我的评价

**入口**：Navbar 右侧 [我的评价] 链接。

**主要 UI**：
- 顶部信息卡：显示 "你的匿名 ID：**abc12345**" + 复制按钮 + **「换一个」按钮**（二次确认后重置匿名 ID；历史评价立即显示新 ID，不可撤销）
- 下方：当前用户**所有**评价（含软删的）列表

**每条评价显示**：
- 课程 code + name（点击跳 `/courses/[id]`）
- 教授 / 学期 / 校区（site 显示全名）
- 评价完整内容 + 点赞/点踩计数（自己的评价不可投票）
- 右上角：[编辑] / [删除]
- 已软删：整条标灰 + "已删除（仅自己可见）"标签 + [恢复] 按钮

**关键交互**：
- 点 [编辑] → 跳到 `/courses/[id]?focus=review` → 该页面自动滚动定位到自己的评价（在那里点 [编辑] 行内改）
- 删除 / 恢复：同 `/courses/[id]` 行为

**调用的 API**：
- `GET /api/reviews?user_id=<self>` 拿所有自己评价（包括 is_visible=false，由 RLS 允许）

**空·错·加载状态**：
- 没写过任何评价：显示"你还没写过评价，[去看看课程]"按钮
- 加载中：骨架屏 3 条
- 错误：toast + 重试按钮

---

## 跨页面通用约定

### Navbar（除 `/login` 外都显示）
- 左：**NYU + 校区名下拉**（16 个 site 切换），点 NYU 回 `/`
- 中：全局搜索框（回车提交，保留筛选参数）
- 右：[中 / EN 语言切换] · 用户菜单（显示 netid，展开后有 [前往个人中心] / [退出登录]）

### Toast 提示
- 用 sonner（`components/ui/sonner.tsx`）
- 成功：`toast.success` 简短文案；错误：`toast.error` + 错误原因

### Loading 状态
- 列表加载用 shadcn `Skeleton` 骨架屏
- 按钮提交中：`LoadingButton`（disabled + 文字改 "提交中…"）

### 错误页
- 404：写自定义 `not-found.tsx`，"页面不存在 · [回首页]"
- 500：写 `error.tsx`，"出错了，请稍后重试"

### i18n
- 所有文案走 `useTranslations`，禁止硬编码中英
- 默认 zh；`messages/zh.json` 与 `en.json` 键同步、中英文案均已完整维护

### URL 状态同步
- 筛选页 `/` 的搜索关键词 + 筛选条件写入 URL query，刷新 / 后退保持状态
- `/courses/[id]?focus=review` 用 query 触发自动滚动定位到自己的评价
- 首页已加载条数写入 `?n=`（replace），返回时恢复列表深度

### 未登录处理
- middleware 已统一拦截，没登录的请求一律 302 到 `/login`
- 前端**不**做"未登录则显示登录按钮"这种 fallback UI（middleware 是唯一守卫）