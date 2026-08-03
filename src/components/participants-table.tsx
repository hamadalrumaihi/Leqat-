'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/data-table';

export type ParticipantRow = {
  name: string;
  group: string;
  level: string;
  status: string;
  enrolled: string;
};

export function ParticipantsTable({ rows }: { rows: ParticipantRow[] }) {
  const t = useTranslations('participants');

  const columns = useMemo<ColumnDef<ParticipantRow, unknown>[]>(
    () => [
      { accessorKey: 'name', header: t('name') },
      { accessorKey: 'group', header: t('group') },
      { accessorKey: 'level', header: t('level') },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ getValue }) => (
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs">{getValue() as string}</span>
        ),
      },
      { accessorKey: 'enrolled', header: t('enrolled') },
    ],
    [t],
  );

  return <DataTable columns={columns} data={rows} searchPlaceholder={t('search')} />;
}
