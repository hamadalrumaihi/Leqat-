import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/providers';
import '@/styles/globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

const latin = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'برنامج مهندس الحياة — Life Engineer Program',
  description:
    'منصة برنامج مهندس الحياة التربوي — قطر. بناء الشخصية عبر SQ · EQ · IQ · PQ وإطار REPEAT.',
  manifest: '/manifest.webmanifest',
  // The compass SVG is the only icon asset; point every icon slot at it
  // so there is no /favicon.ico 404 on each page load.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: { capable: true, title: 'برنامج مهندس الحياة', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#1F5C3A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${arabic.variable} ${latin.variable} font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
