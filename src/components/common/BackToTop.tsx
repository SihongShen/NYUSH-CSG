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

  return (
    <Button
      type="button"
      onClick={scrollToTop}
      size="icon"
      aria-label="回到顶部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed bottom-6 right-6 z-30 h-11 w-11 rounded-full shadow-lg transition-all duration-200',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
        className
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
