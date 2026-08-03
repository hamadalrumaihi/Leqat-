'use client';

import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { ar, 'en-US': enUS },
});

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string | null;
  teacher: string | null;
  room: string | null;
};

type Labels = {
  today: string; previous: string; next: string;
  week: string; day: string; agenda: string;
  date: string; time: string; event: string; noEvents: string;
};

export function ScheduleCalendar({
  events,
  labels,
  defaultDate,
}: {
  events: CalEvent[];
  labels: Labels;
  defaultDate: string;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date(defaultDate + 'T00:00:00'));

  const messages = useMemo(
    () => ({
      today: labels.today, previous: labels.previous, next: labels.next,
      week: labels.week, day: labels.day, agenda: labels.agenda,
      date: labels.date, time: labels.time, event: labels.event, noEventsInRange: labels.noEvents,
    }),
    [labels],
  );

  return (
    <div className="card p-3" style={{ height: '72vh' }} dir={isAr ? 'rtl' : 'ltr'}>
      <Calendar
        localizer={localizer}
        culture={isAr ? 'ar' : 'en-US'}
        rtl={isAr}
        events={events}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        views={['week', 'day', 'agenda']}
        step={30}
        popup
        messages={messages}
        eventPropGetter={(e: CalEvent) => ({
          style: {
            backgroundColor: e.color ?? '#1F5C3A',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
          },
        })}
        tooltipAccessor={(e: CalEvent) =>
          [e.title, e.teacher, e.room].filter(Boolean).join(' · ')
        }
        style={{ height: '100%' }}
      />
    </div>
  );
}
