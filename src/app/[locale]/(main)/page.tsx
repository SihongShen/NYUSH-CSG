import { getUser } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">NYUSH 课程评价</h1>
      <p className="mt-2 text-muted-foreground">
        欢迎，{user?.email ?? ''}。这里之后会放课程搜索和评价入口。
      </p>
    </main>
  );
}
