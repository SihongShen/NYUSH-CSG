import { useTranslations } from 'next-intl';
import { GitHubIcon } from '@/components/common/GitHubIcon';
import {
  GITHUB_BUG_URL,
  GITHUB_FEATURE_URL,
  GITHUB_REPO_URL
} from '@/lib/constants/links';

/**
 * 全局页脚：左侧版权 / License，右侧反馈入口（全部引导到 GitHub issue 表单）。
 * Server Component，无交互逻辑。
 */
export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="relative border-t bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} NYUSH-CSG ·{' '}
          <a
            href={`${GITHUB_REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            MIT License
          </a>
        </p>
        <nav className="flex items-center gap-4">
          <a
            href={GITHUB_BUG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('reportBug')}
          </a>
          <a
            href={GITHUB_FEATURE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('featureRequest')}
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline"
          >
            <GitHubIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
