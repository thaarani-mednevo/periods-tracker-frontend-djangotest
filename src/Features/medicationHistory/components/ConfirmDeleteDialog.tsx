import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import { secondaryBtn } from '../lib/ui';
import Dialog from './Dialog';

interface Props {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteDialog({ name, onConfirm, onCancel }: Props) {
  const uid = useId();
  return (
    <Dialog
      role="alertdialog"
      onClose={onCancel}
      labelledBy={`${uid}-t`}
      describedBy={`${uid}-d`}
      className="max-w-[380px] p-[23px]"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-mh-danger/10 text-mh-danger">
        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 id={`${uid}-t`} className="mt-4 text-mh-m-title font-bold text-[#1e1c2b]">
        Delete {name}?
      </h2>
      <p id={`${uid}-d`} className="mt-1 text-mh-m-sub text-[#747281]">
        This removes the medication and its dose history from your record. This can’t be undone.
      </p>
      <div className="mt-6 flex justify-end gap-4">
        <button type="button" data-autofocus onClick={onCancel} className={`${secondaryBtn} min-w-[81px] px-4 sm:w-[81px] sm:px-0`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="mh-tap inline-flex h-[35px] min-w-[96px] px-4 items-center justify-center rounded-[9px] bg-mh-danger text-mh-m-btn font-semibold text-white transition hover:brightness-110"
        >
          Delete
        </button>
      </div>
    </Dialog>
  );
}
