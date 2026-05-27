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

export type CourseCategory = 'Core' | 'Major' | 'Elective';
export type CoreType = 'GPS' | 'PoH' | 'IPC' | 'WAI' | 'ED' | 'STS' | 'AT' | 'EAP';

export interface Course {
  id: string;
  code: string;
  name_en: string;
  category: CourseCategory | null;
  core_type: CoreType | null;
  department: string | null;
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
  rating: number;           // 1-5
  difficulty: number;       // 1-5
  workload: number;         // 1-5
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
  author_anonymous_id: string;
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
  category?: CourseCategory;
  core_type?: CoreType;
  department?: string;
  professor_names: string[];
}

export interface ReviewCreatePayload {
  course_id: string;
  professor_id: string;
  semester: string;
  site: string;
  rating: number;
  difficulty: number;
  workload: number;
  content_zh?: string;
  content_en?: string;
}

export type ReviewUpdatePayload = Partial<
  Pick<
    Review,
    'rating' | 'difficulty' | 'workload' | 'content_zh' | 'content_en'
  >
>;

// ============================================================================
// Query params (GET 接口的 URL ?key=value)
// ============================================================================

export interface CourseSearchQuery {
  q?: string;               // 模糊匹配 code / name_en / 教授名
  category?: CourseCategory;
  department?: string;
  limit?: number;           // 默认 20
  offset?: number;          // 默认 0
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
