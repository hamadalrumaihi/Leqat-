import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { SiteHeader } from '@/components/site-header';
import { Logo } from '@/components/logo';
import { AchievementsChart } from '@/components/achievements-chart';

// Registration stays on WhatsApp for v1 — the CTA opens a chat, not a form.
const WHATSAPP_REGISTER =
  'https://wa.me/97472054558?text=%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AA%D8%B3%D8%AC%D9%8A%D9%84%20%D9%81%D9%8A%20%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20%D9%85%D9%87%D9%86%D8%AF%D8%B3%20%D8%A7%D9%84%D8%AD%D9%8A%D8%A7%D8%A9';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const quotients = ['SQ', 'EQ', 'IQ', 'PQ'] as const;
  const ageKeys = ['children', 'boys', 'youth'] as const;
  const manifesto = t.raw('home.manifesto') as string[];
  const packages = t.raw('packages.items') as string[];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-in">
            <p className="mb-3 text-sm font-medium text-accent">{t('brand.full')} — {t('home.heroEyebrow')}</p>
            <h1 className="text-4xl font-bold leading-tight text-primary md:text-5xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t('home.heroSubtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_REGISTER} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t('home.cta')}
              </a>
              <a href="#packages" className="btn-outline">{t('home.ctaSecondary')}</a>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ['mastery', '#FFFFFF'],
                  ['valuesForming', '#A7D7A0'],
                  ['characterStrengthening', '#1F5C3A'],
                  ['empowerment', '#3FA34D'],
                ] as const
              ).map(([k, c]) => (
                <div key={k} className="text-center">
                  <span
                    className="mx-auto mb-1 block h-3 w-full rounded-full border"
                    style={{ background: c }}
                  />
                  <span className="text-xs text-muted-foreground">{t(`palette.${k}`)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Logo className="h-64 w-64 drop-shadow-xl md:h-80 md:w-80" />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-y bg-primary text-primary-foreground">
        <div className="container py-14">
          <h2 className="mb-8 text-center text-2xl font-bold">{t('home.whyTitle')}</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {manifesto.map((line, i) => (
              <p key={i} className="rounded-lg bg-white/10 p-5 text-center text-lg">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="container grid gap-6 py-16 md:grid-cols-2">
        <div className="card p-8">
          <h3 className="mb-2 text-xl font-bold text-primary">{t('home.vision')}</h3>
          <p className="text-muted-foreground">{t('home.visionText')}</p>
        </div>
        <div className="card p-8">
          <h3 className="mb-2 text-xl font-bold text-primary">{t('home.mission')}</h3>
          <p className="text-muted-foreground">{t('home.missionText')}</p>
        </div>
      </section>

      {/* Philosophy / quotients */}
      <section id="philosophy" className="bg-muted/40">
        <div className="container py-16">
          <h2 className="text-center text-3xl font-bold text-primary">{t('quotients.title')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            {t('quotients.subtitle')}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quotients.map((q) => (
              <div key={q} className="card p-6 text-center">
                <span className="latin-term mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {q}
                </span>
                <h4 className="font-semibold">{t(`quotients.${q}.name`)}</h4>
                <p className="mt-1 text-sm text-accent">{t(`quotients.${q}.value`)}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl rounded-lg border bg-card p-5 text-center text-muted-foreground">
            <span className="latin-term font-bold text-primary">REPEAT</span> — {t('quotients.repeat')}
          </p>
        </div>
      </section>

      {/* Age groups */}
      <section id="age-groups" className="container py-16">
        <h2 className="mb-8 text-center text-3xl font-bold text-primary">{t('ageGroups.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ageKeys.map((k) => (
            <div key={k} className="card flex items-center gap-4 p-6">
              <span className="h-10 w-2 rounded-full bg-green-vibrant" />
              <span className="font-medium">{t(`ageGroups.${k}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="bg-muted/40">
        <div className="container py-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-primary">{t('packages.title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, i) => (
              <div key={i} className="card p-6">
                <span className="text-sm font-medium">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section id="achievements" className="container py-16">
        <h2 className="mb-2 text-center text-3xl font-bold text-primary">{t('achievements.title')}</h2>
        <p className="mb-8 text-center text-muted-foreground">{t('achievements.participants')}</p>
        <AchievementsChart />
        <div className="mt-10 rounded-lg border bg-card p-6 text-center">
          <p className="font-semibold text-primary">{t('achievements.trips')}</p>
          <p className="mt-2 text-muted-foreground">{t('achievements.tripsList')}</p>
        </div>
      </section>

      {/* Library */}
      <section id="library" className="bg-muted/40">
        <div className="container py-16">
          <h2 className="text-center text-3xl font-bold text-primary">{t('library.title')}</h2>
          <p className="mt-2 text-center text-sm text-accent">{t('library.note')}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['هيا بنا نمضي معا', '2018'],
              ['لأنها الحياة تصان بالقيم', '2022'],
              ['قم بعزم الشباب', '2024'],
              ['بهذا الطرح نسموا', '2025'],
            ].map(([title, year]) => (
              <div key={title} className="card flex flex-col gap-2 p-6">
                <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-green-deep to-green-vibrant" />
                <span className="font-medium">{title}</span>
                <span className="latin-term text-sm text-muted-foreground">{year}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / footer */}
      <footer id="contact" className="border-t bg-primary text-primary-foreground">
        <div className="container grid gap-8 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="h-10 w-10 shrink-0" />
              <span className="text-lg font-bold">{t('brand.name')}</span>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/80">{t('brand.full')}</p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">{t('contact.title')}</h4>
            <p className="text-sm">{t('contact.whatsapp')}</p>
            <p className="text-sm">{t('contact.instagram')}</p>
            <p className="text-sm">linkbio.co/LEProgram</p>
          </div>
          <div className="flex items-start">
            <a
              href={WHATSAPP_REGISTER}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-white px-5 h-11 text-primary hover:opacity-90"
            >
              {t('home.cta')}
            </a>
          </div>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-xs text-primary-foreground/70">
          © 2017–2026 برنامج مهندس الحياة — Life Engineer Program
        </div>
      </footer>
    </div>
  );
}
