import { Link } from '@/i18n/routing';

export default function NotFound() {
  return (
    <div className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-bold text-primary">٤٠٤</p>
      <p className="text-muted-foreground">الصفحة غير موجودة — Page not found</p>
      <Link href="/" className="btn-primary">
        العودة للرئيسية
      </Link>
    </div>
  );
}
