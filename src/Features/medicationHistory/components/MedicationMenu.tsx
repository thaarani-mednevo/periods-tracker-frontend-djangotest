import { Clock, Download, MoreVertical, Pill, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { usePopover } from '../hooks/usePopover';

export type MenuAction = 'edit' | 'skip' | 'download' | 'delete';

interface Props {
  medName: string;
  onSelect: (action: MenuAction) => void;
}

const ITEMS: { action: MenuAction; label: string; Icon: typeof Pill; danger?: boolean }[] = [
  { action: 'edit', label: 'Edit medication', Icon: Pill },
  { action: 'skip', label: 'Skip', Icon: Clock },
  { action: 'download', label: 'Download details', Icon: Download },
  { action: 'delete', label: 'Delete medication', Icon: Trash2, danger: true },
];

export default function MedicationMenu({ medName, onSelect }: Props) {
  const { open, setOpen, close, containerRef, triggerRef } = usePopover();
  const menuId = useId();
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length].focus();
    };
    if (e.key === 'ArrowDown') focusAt(i + 1);
    else if (e.key === 'ArrowUp') focusAt(i - 1);
    else if (e.key === 'Home') focusAt(0);
    else if (e.key === 'End') focusAt(items.length - 1);
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${medName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-full text-[#4b4d5c] transition hover:bg-mh-blush"
      >
        <MoreVertical size={16} strokeWidth={2.6} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`${medName} actions`}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%-4px)] z-30 w-[204px] max-w-[calc(100vw-2rem)] desk:left-1/2 desk:right-auto desk:-translate-x-1/2 rounded-[14px] border border-[#ece8f0] bg-white py-[5px] shadow-[0_14px_34px_-10px_rgb(23_21_43/0.28)]"
        >
          {ITEMS.map(({ action, label, Icon, danger }, idx) => (
            <div key={action}>
              {danger && <div role="separator" className="my-[4px] border-t border-[#ece8f0]" />}
              <button
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  // Close first so focus is back on the trigger before any dialog captures its opener.
                  close();
                  onSelect(action);
                }}
                className={`flex h-[34px] w-full items-center gap-[10px] pl-[13px] pr-3 text-left text-mh-ui font-medium leading-none transition hover:bg-mh-blush focus-visible:bg-mh-blush max-desk:min-h-11 pointer-coarse:min-h-11 ${
                  danger ? 'text-mh-danger' : 'text-[#272830]'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" className={danger ? '' : 'text-[#575a73]'} />
                {label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
