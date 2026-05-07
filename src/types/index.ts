export type AuthFormStatus = 'idle' | 'submitting' | 'success' | 'error';

export type ApiError = {
  error: string;
  code?: string;
};
