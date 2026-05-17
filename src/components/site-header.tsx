'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { Moon, Sun, Languages, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { Logo } from './logo';

export function SiteHeader() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '#philosophy', label: t('philosophy') },
    { href: '#age-groups', label: t('ageGroups') },
    { href: '#packages', label: t('programs') },
    { href: '#achievements', label: t('achievements') },
    { href: '#library', label: t('library') },
    { href: '#contact', label: t('contact') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <span className="text-lg font-bold text-primary">لِ.قات</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href={pathname}
            locale={locale === 'ar' ? 'en' : 'ar'}
            className="btn-ghost"
            aria-label={t('language')}
          >
            <Languages className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">{t('language')}</span>
          </Link>
          <button
            className="btn-ghost"
            aria-label={t('theme')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </button>
          <Link href="/login" className="btn-outline hidden sm:inline-flex">
            {t('login')}
          </Link>
          <Link href="/register" className="btn-primary hidden sm:inline-flex">
            {t('register')}
          </Link>
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(!open)} aria-label="menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t lg:hidden">
          <nav className="container flex flex-col gap-1 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-md px-2 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="btn-outline flex-1">{t('login')}</Link>
              <Link href="/register" className="btn-primary flex-1">{t('register')}</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
