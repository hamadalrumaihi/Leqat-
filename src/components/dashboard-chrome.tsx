'use client';

import { useState } from 'react';
import { Menu, X, LogOut, Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { NotificationBell } from '@/components/notification-bell';
import { ProgramSwitcher, type SwitcherProgram } from '@/components/program-switcher';
import { cn, BRAND_GREEN } from '@/lib/utils';
import { logoutAction } from '@/app/[locale]/(auth)/actions';

type Item = { href: string; label: string };
type Group = { key: string; label: string; items: Item[] };

function NavLinks({
  groups,
  onNavigate,
}: {
  groups: Group[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'block rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-secondary font-medium text-primary border-e-4'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                    style={active ? { borderInlineEndColor: BRAND_GREEN } : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DashboardChrome({
  groups,
  brand,
  roleLabel,
  userName,
  userId,
  programs,
  activeProgramId,
  programsLabel,
  welcome,
  logoutLabel,
  menuLabel,
  notificationsLabel,
  children,
}: {
  groups: Group[];
  brand: string;
  roleLabel: string;
  userName: string;
  userId: string;
  programs: SwitcherProgram[];
  activeProgramId: string;
  programsLabel: string;
  welcome: string;
  logoutLabel: string;
  menuLabel: string;
  notificationsLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const closed = locale === 'ar' ? 'translate-x-full' : '-translate-x-full';

  const SidebarHeader = (
    <div className="flex items-center gap-2 border-b p-4">
      <Logo className="h-9 w-9 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-primary">{brand}</p>
        <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Persistent desktop sidebar */}
      <aside className="hidden border-e bg-card lg:flex lg:w-64 lg:flex-col">
        {SidebarHeader}
        <div className="flex-1 overflow-y-auto">
          <NavLinks groups={groups} />
        </div>
        <form action={logoutAction} className="border-t p-3">
          <button className="btn-outline w-full gap-2">
            <LogOut className="h-4 w-4" /> {logoutLabel}
          </button>
        </form>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside
            className={cn(
              'absolute inset-y-0 start-0 flex w-72 max-w-[80%] flex-col bg-card shadow-xl transition-transform',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <div className="flex min-w-0 items-center gap-2">
                <Logo className="h-8 w-8 shrink-0" />
                <span className="truncate font-bold text-primary">{brand}</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="close" className="btn-ghost shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
            </div>
            <form action={logoutAction} className="border-t p-3">
              <button className="btn-outline w-full gap-2">
                <LogOut className="h-4 w-4" /> {logoutLabel}
              </button>
            </form>
          </aside>
          {/* keep the off-screen transform class referenced for tooling */}
          <span className={cn('hidden', closed)} />
        </div>
      )}

      {/* Main column */}
      <main className="flex-1 bg-muted/30">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost lg:hidden"
              aria-label={menuLabel}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo className="h-8 w-8" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">{welcome}</p>
              <p className="text-sm font-semibold">{userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ProgramSwitcher programs={programs} activeId={activeProgramId} label={programsLabel} />
            <NotificationBell userId={userId} label={notificationsLabel} />
            <Link
              href={pathname}
              locale={locale === 'ar' ? 'en' : 'ar'}
              className="btn-ghost"
              aria-label="language"
            >
              <Languages className="h-4 w-4" />
            </Link>
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
