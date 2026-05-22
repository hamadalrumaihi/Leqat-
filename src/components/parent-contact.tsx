import { MessageCircle, PhoneOff } from 'lucide-react';

type Props = {
  name: string;
  phone: string | null;
  className?: string;
};

// One-tap WhatsApp beside a parent's name. Missing phone is a soft
// flag (red chip), never a block. wa.me opens the app or web fallback.
export function ParentContact({ name, phone, className = '' }: Props) {
  if (!phone) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="text-sm">{name}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
          title="رقم ولي الأمر غير مسجّل / Parent phone missing"
        >
          <PhoneOff className="h-3 w-3" aria-hidden />
          رقم مفقود
        </span>
      </span>
    );
  }

  // Normalize: strip non-digits; prepend Qatar code for 8-digit numbers.
  const digits = phone.replace(/\D/g, '');
  const intl = digits.length === 8 ? `974${digits}` : digits;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-sm">{name}</span>
      <a
        href={`https://wa.me/${intl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
        aria-label={`Open WhatsApp chat with ${name}`}
        title={`واتساب: ${phone}`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
      </a>
    </span>
  );
}
