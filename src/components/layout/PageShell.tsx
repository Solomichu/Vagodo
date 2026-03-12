import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageShell({ children, title, subtitle, action }: Props) {
  return (
    <div className="px-4 pt-4 pb-nav max-w-lg mx-auto">
      {(title || action) && (
        <div className="flex items-start justify-between mb-5">
          <div>
            {title && (
              <h1 className="text-2xl font-bold tracking-brutalist">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-ink-50 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
