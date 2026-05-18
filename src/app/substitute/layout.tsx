import '@/styles/globals.css';

// Standalone root layout — substitute magic links are accessed
// without login and outside the localized app shell.
export default function SubstituteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
