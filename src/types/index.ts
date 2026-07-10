// ============================================================================
// Frontend form state
// ============================================================================

export type AuthFormStatus = 'idle' | 'submitting' | 'success' | 'error';

// ============================================================================
// API error envelope
// ============================================================================

export type ApiError = {
  error: string;                      // 错误码（稳定 key），如 'unauthorized' / 'rate_limited'
  message?: string;                   // 可选人类可读消息
  fields?: Record<string, string>;    // 校验失败时：字段名 → 错误文案
};

// ============================================================================
// DB-mirroring entity types (snake_case 对齐 Postgres 列名)
// ============================================================================

export interface User {
  id: string;
  email: string;
  anonymous_id: string;
  created_at: string;
  // role 字段在 DB 里有，MVP 不暴露给类型层；做 admin 时再加回来
}

export type CoreType =
  | 'GPS'
  | 'PoH'
  | 'WAI'
  | 'IPC'
  | 'Chinese'
  | 'EAP'
  | 'Maths'
  | 'ED'
  | 'STS'
  | 'AT';

/**
 * 校区 = 16 个 NYU site（3 个学位校区 + 13 个 study-away）。
 * 全局校区切换（Navbar）、课程归属、评价 site 共用这一个概念。
 * 与 lib/constants/sites.ts 的 SITES 保持同步。
 */
export type CampusCode =
  | 'SH' | 'NY' | 'AD'
  | 'ACC' | 'BER' | 'BUE' | 'FLO' | 'LON' | 'LA' | 'MAD'
  | 'PAR' | 'PRG' | 'SYD' | 'TEL' | 'TUL' | 'WAS';

export interface Course {
  id: string;
  code: string;
  name_en: string;
  // 主修课归属（必/选拆两列，filter 时 required ∪ elective 一起匹配）
  major_required: string[];
  major_elective: string[];
  // Minor-only 项目
  minor: string[];
  // Core 子分类
  core_type: CoreType[];
  // 通识选修标记
  is_general_elective: boolean;
  /** 专题课的历届 topic 清单（如 Topics in IMA / EAP / WRIT-SHU 201）；
   *  普通课程为空数组。由课表导入脚本维护，用户不可编辑 */
  topics: string[];
  home_campus: CampusCode;
  is_verified: boolean;
  equivalent_id: string | null;
  created_at: string;
}

export interface Professor {
  id: string;
  name_en: string;
  is_verified: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  professor_id: string;
  semester: string;         // "2024 Fall" | "2025 Spring" 等
  site: string;             // 16 个 NYU site 之一（SH / NY / AD / FLO / LON ...）
  // MVP 不做量化指标（rating / difficulty / workload 已删除）
  content_zh: string | null;
  content_en: string | null;
  is_visible: boolean;
  created_at: string;
}

export type VoteValue = -1 | 0 | 1;   // 0 = 未投 / 撤票

// ============================================================================
// Composite response shapes (join 后的数据)
// ============================================================================

/** 课程列表项：附带评价数统计（含等同课组内所有课程的评价合并计数） */
export interface CourseWithStats extends Course {
  review_count: number;
}

/** 等同课组成员（跨校区同一门课，如 NY 的 CSCI-UA 102 ≡ SH 的 CSCI-SHU 210） */
export interface EquivalentCourse {
  id: string;
  code: string;
  name_en: string;
  home_campus: CampusCode;
}

export interface CourseDetail extends Course {
  professors: Professor[];
  equivalents: EquivalentCourse[];   // 不含自己；空数组 = 没有等同课
}

/** GET /api/courses/[id] 的响应：详情 + 全部评价（含等同课组），一次请求 */
export interface CourseDetailWithReviews extends CourseDetail {
  reviews: ReviewWithAuthor[];
}

export interface ReviewWithAuthor extends Review {
  author_anonymous_id: string | null;   // null = 作者已注销，前端显示 "[已注销用户]"
  professor_name_en: string;
  upvotes: number;
  downvotes: number;
  my_vote: VoteValue;                   // 当前用户对这条评价的投票
}

// profile 页用：评价 + 课程基本信息（让用户能看出是哪门课的评价）
export interface ReviewWithCourse extends ReviewWithAuthor {
  course_code: string;
  course_name_en: string;
}

// ============================================================================
// Request payloads (POST / PATCH body 形状)
// ============================================================================

/** 课程分类五元组：建课时随 CourseApplyPayload 提交，也可单独 PATCH 编辑 */
export interface CourseClassificationPayload {
  major_required: string[];
  major_elective: string[];
  minor: string[];
  core_type: CoreType[];
  is_general_elective: boolean;
}

export interface CourseApplyPayload extends CourseClassificationPayload {
  code: string;
  name_en: string;
  home_campus: CampusCode;
  lecture_professors: string[];     // 至少 1 个，前端校验
  recitation_tas: string[];         // 可选；后端合并存入 professors
  /** 非上海课程可填上海等同课课号：库里有就关联，没有就自动建一门上海锚点课再关联 */
  sh_equivalent_code?: string;
}

export interface ReviewCreatePayload {
  course_id: string;
  professor_id?: string;          // 二选一：选已有教授
  new_professor_name?: string;    // 二选一：录入新教授（后端创建 + 关联到课程）
  semester: string;
  site?: string;                  // 16 个 site；前端自动带当前全局校区，不传默认 course.home_campus
  content_zh?: string;
  content_en?: string;
}

export type ReviewUpdatePayload = Partial<
  Pick<Review, 'content_zh' | 'content_en'>
>;

// ============================================================================
// Query params (GET 接口的 URL ?key=value)
// ============================================================================

export interface CourseSearchQuery {
  q?: string;                       // 模糊匹配 code / name_en / 教授名
  campus?: CampusCode;
  majors?: string[];                // required ∪ elective 任一匹配
  minors?: string[];
  core_types?: CoreType[];
  only_general_elective?: boolean;
  limit?: number;                   // 默认 20
  offset?: number;                  // 默认 0
}

export interface ReviewListQuery {
  course_id?: string;
  professor_id?: string;
  user_id?: string;         // 用于"我的评价"页（必须等于当前登录用户）
  limit?: number;           // 默认 20
  offset?: number;          // 默认 0
}

// ============================================================================
// Generic paginated response
// ============================================================================

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
