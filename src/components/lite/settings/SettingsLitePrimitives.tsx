import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsGlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'bg-muted/30 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettingsGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="px-1 text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
      <SettingsGlassCard className="divide-y divide-border/30">{children}</SettingsGlassCard>
    </div>
  );
}

type SettingsRowBaseProps = {
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
  title: string;
  description?: string;
  right?: ReactNode;
  disabled?: boolean;
  showChevron?: boolean;
  destructive?: boolean;
  className?: string;
};

type SettingsRowProps =
  | (SettingsRowBaseProps & { href: string; onClick?: never })
  | (SettingsRowBaseProps & { href?: never; onClick: () => void });

export function SettingsRow(props: SettingsRowProps) {
  const {
    icon: Icon,
    iconBgClassName,
    iconClassName,
    title,
    description,
    right,
    disabled,
    showChevron = true,
    destructive,
    className,
  } = props;

  const content = (
    <>
      <div
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
          iconBgClassName ?? 'bg-primary/10'
        )}
      >
        <Icon
          className={cn(
            'h-[18px] w-[18px]',
            destructive ? 'text-destructive' : 'text-primary',
            iconClassName
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium truncate', destructive ? 'text-destructive' : 'text-foreground')}>
          {title}
        </div>
        {description ? <div className="text-xs text-muted-foreground truncate">{description}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
      {showChevron ? (
        <ChevronRight
          className={cn('h-4 w-4 shrink-0', destructive ? 'text-destructive/50' : 'text-muted-foreground')}
        />
      ) : null}
    </>
  );

  const baseClassName = cn(
    'w-full flex items-center gap-3 px-4 py-3 min-h-11 text-left',
    'transition-colors hover:bg-muted/35 active:bg-muted/45',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
    disabled && 'opacity-50 pointer-events-none',
    className
  );

  if ('href' in props) {
    return (
      <Link to={props.href} className={baseClassName} aria-disabled={disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={baseClassName} disabled={disabled}>
      {content}
    </button>
  );
}

