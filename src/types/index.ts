// ============================================================================
// Frontend form state
// ============================================================================

export type AuthFormStatus = 'idle' | 'submitting' | 'success' | 'error';

// ============================================================================
// API error envelope
// ============================================================================

export type ApiError = {
  error: string;            // 错误码（i18n key 或简短英文标识），如 'invalidNetid' / 'unauthorized'
  message?: string;         // 可选人类可读消息
  fields?: string[];        // 校验失败时具体哪些字段出错
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

export type CampusCode = 'SH' | 'NY' | 'AD';

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
  site: string;             // "SH" | "NY" | "AD" 等
  // MVP 不做量化指标（rating / difficulty / workload 已删除）
  content_zh: string | null;
  content_en: string | null;
  is_visible: boolean;
  created_at: string;
}

// ============================================================================
// Composite response shapes (join 后的数据)
// ============================================================================

export interface CourseDetail extends Course {
  professors: Professor[];
}

export interface ReviewWithAuthor extends Review {
  author_anonymous_id: string | null;   // null = 作者已注销，前端显示 "[已注销用户]"
  professor_name_en: string;
}

// ============================================================================
// Request payloads (POST / PATCH body 形状)
// ============================================================================

export interface RegisterPayload {
  netid: string;
  password: string;
}

export interface CourseApplyPayload {
  code: string;
  name_en: string;
  home_campus: CampusCode;
  major_required?: string[];
  major_elective?: string[];
  minor?: string[];
  core_type?: CoreType[];
  is_general_elective?: boolean;
  professor_names: string[];
}

export interface ReviewCreatePayload {
  course_id: string;
  professor_id: string;
  semester: string;
  site: string;
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
