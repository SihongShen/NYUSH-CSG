'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface BackToTopProps {
  /** 滚动多少像素后显示，默认 300 */
  showAfter?: number;
  /** 自定义额外 className */
  className?: string;
}

/**
 * 长页面右下角浮动"回到顶部"按钮。
 * 滚动超过阈值才出现；带 fade + slide 动效；点击平滑滚动到顶。
 *
 * 用法：放在 layout 里即可全站启用。
 */
export function BackToTop({ showAfter = 300, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > showAfter);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 把按钮挂在一条贴底的居中条上，wrapper 比 max-w-7xl 宽 2 个按钮宽度（88px），
  // 让按钮的右边落在主内容右边线再往右 2 个按钮位的位置。
  // 视口窄于此 wrapper 时条宽等于视口，按钮自然 fallback 到屏幕右下角。
  // 外层 pointer-events-none 让条本身不挡内容；按钮自己开 pointer-events-auto。
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="relative mx-auto max-w-[91rem] px-6">
        <Button
          type="button"
          onClick={scrollToTop}
          size="icon"
          aria-label="回到顶部"
          aria-hidden={!visible}
          tabIndex={visible ? 0 : -1}
          className={cn(
            'pointer-events-auto absolute bottom-6 right-6 h-11 w-11 rounded-full shadow-lg transition-all duration-200',
            visible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0',
            className
          )}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
