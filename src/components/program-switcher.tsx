'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { setActiveProgramAction } from '@/app/[locale]/dashboard/program-context-actions';

export type SwitcherProgram = { id: string; name: string; roleLabel: string };

export function ProgramSwitcher({
  programs,
  activeId,
  label,
}: {
  programs: SwitcherProgram[];
  activeId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (programs.length === 0) return null;
  const active = programs.find((p) => p.id === activeId) ?? programs[0];

  // Single program: show it, no switcher.
  if (programs.length === 1) {
    return (
      <div className="hidden items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm sm:flex">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-40 truncate">{active.name}</span>
      </div>
    );
  }

  const choose = (id: string) => {
    if (id === activeId) return;
    startTransition(async () => {
      await setActiveProgramAction(id);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
          disabled={pending}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-36 truncate">{active.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {programs.map((p) => (
          <DropdownMenuCheckboxItem
            key={p.id}
            checked={p.id === activeId}
            onCheckedChange={() => choose(p.id)}
          >
            <span className="flex flex-col">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.roleLabel}</span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
