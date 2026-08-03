'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatTime12 } from '@/lib/utils';
import { reorderScheduleDayAction } from '@/app/[locale]/dashboard/master-schedule/actions';

type Item = { id: string; label: string; dur: number };

const fmt = (min: number, pref: 'arabic' | 'latin') =>
  formatTime12(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`, pref);

function SortableRow({ item, start, pref }: { item: Item; start: number; pref: 'arabic' | 'latin' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border bg-background p-3 ${isDragging ? 'opacity-60 shadow-md' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="drag"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span dir="ltr" className="tabular-nums text-sm text-muted-foreground">
        {fmt(start, pref)} – {fmt(start + item.dur, pref)}
      </span>
      <span className="font-medium">{item.label}</span>
    </li>
  );
}

export function ScheduleBuilder({
  programId,
  date,
  base,
  entries,
}: {
  programId: string;
  date: string;
  base: number; // earliest start, in minutes
  entries: Item[];
}) {
  const t = useTranslations('scheduleOps');
  const locale = useLocale();
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(entries);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (entries.length < 2) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline h-9 px-4 text-sm">
        {t('builder')}
      </button>
    );
  }

  // Running start time for display, in current order.
  let cursor = base;
  const starts = items.map((it) => {
    const s = cursor;
    cursor += it.dur;
    return s;
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => {
      void reorderScheduleDayAction(programId, date, next.map((i) => i.id));
    });
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t('builder')}</p>
        <span className="text-xs text-muted-foreground">
          {pending ? t('saving') : t('builderHint')}
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <SortableRow key={it.id} item={it} start={starts[i]} pref={pref} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button onClick={() => setOpen(false)} className="btn-ghost h-8 px-3 text-xs">✕</button>
    </div>
  );
}
