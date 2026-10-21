import { PackagePlus, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { LuModal } from "../../shared/ui/LuModal";
import { PRODUCT_TYPES, type Product, type ProductType } from "../../../../services/logs";
import { QTY_MAX, QTY_MIN, sizesFor } from "./products";

interface AddProductModalProps {
  onAdd: (product: Product) => void;
  onClose: () => void;
}

type Errors = Partial<Record<"label" | "quantity" | "size", string>>;

const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#68708A]";
const fieldClass = (invalid?: string) =>
  `min-h-[44px] w-full rounded-xl border bg-[#FAF8FA] px-3.5 text-sm font-semibold text-[#17152B] outline-none focus:ring-2 focus:ring-[#F43F8F]/30 ${
    invalid ? "border-rose-400" : "border-[#F1DDE8]"
  }`;

/** Mounted only while open, so the form always starts clean. */
export function AddProductModal({ onAdd, onClose }: AddProductModalProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const first = useRef<HTMLSelectElement>(null);

  const [type, setType] = useState<ProductType>("Pad");
  const [size, setSize] = useState<string>(sizesFor("Pad")[0] ?? "");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [errors, setErrors] = useState<Errors>({});
  const sizes = sizesFor(type);

  const changeType = (next: ProductType) => {
    setType(next);
    setSize(sizesFor(next)[0] ?? "");
    setErrors({});
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    const qty = Number(quantity);
    const trimmed = label.trim();
    if (!/^\d+$/.test(quantity.trim()) || qty < QTY_MIN || qty > QTY_MAX) {
      found.quantity = `Enter a whole number from ${QTY_MIN} to ${QTY_MAX}.`;
    }
    if (type === "Other" && !trimmed) found.label = "Describe the product, e.g. period underwear.";
    if (trimmed.length > 60) found.label = "Use 60 characters or fewer.";
    if (sizes.length > 0 && !sizes.includes(size)) found.size = "Choose a size.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onAdd({ type, label: trimmed || type, size: sizes.length > 0 ? size : null, quantity: qty });
    onClose();
  };

  const err = (key: keyof Errors, fieldId: string) =>
    errors[key] ? (
      <p id={`${fieldId}-error`} className="mt-1 text-xs font-medium text-rose-600">
        {errors[key]}
      </p>
    ) : null;

  return (
    <LuModal labelledBy={titleId} onClose={onClose} initialFocus={first} className="max-w-[460px]">
      <form onSubmit={submit} noValidate className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0F6] text-[#F43F8F]" aria-hidden="true">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-lg font-bold text-[#17152B]">
                Add Product
              </h2>
              <p className="text-xs font-medium text-[#68708A]">Log a product or absorbency you used.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#8A92A6] hover:bg-pink-50 hover:text-[#D81B60]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor={`${id}-type`} className={labelClass}>
            Product type
          </label>
          <select
            ref={first}
            id={`${id}-type`}
            value={type}
            onChange={(e) => changeType(e.target.value as ProductType)}
            className={fieldClass()}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "Other" ? "Other (e.g. period underwear)" : t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-label`} className={labelClass}>
            {type === "Other" ? "Description" : "Label (optional)"}
          </label>
          <input
            id={`${id}-label`}
            type="text"
            value={label}
            maxLength={60}
            aria-invalid={Boolean(errors.label)}
            aria-describedby={errors.label ? `${id}-label-error` : undefined}
            onChange={(e) => {
              setLabel(e.target.value);
              setErrors((x) => ({ ...x, label: undefined }));
            }}
            placeholder={type === "Other" ? "e.g. Period underwear" : "e.g. Night pad"}
            className={fieldClass(errors.label)}
          />
          {err("label", `${id}-label`)}
        </div>

        <div className={`grid gap-3 ${sizes.length > 0 ? "grid-cols-1 min-[400px]:grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label htmlFor={`${id}-qty`} className={labelClass}>
              Quantity used
            </label>
            <input
              id={`${id}-qty`}
              type="number"
              inputMode="numeric"
              min={QTY_MIN}
              max={QTY_MAX}
              step={1}
              value={quantity}
              aria-invalid={Boolean(errors.quantity)}
              aria-describedby={errors.quantity ? `${id}-qty-error` : undefined}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((x) => ({ ...x, quantity: undefined }));
              }}
              className={fieldClass(errors.quantity)}
            />
            {err("quantity", `${id}-qty`)}
          </div>

          {sizes.length > 0 && (
            <div>
              <label htmlFor={`${id}-size`} className={labelClass}>
                {type === "Menstrual cup" ? "Size" : "Size / absorbency"}
              </label>
              <select id={`${id}-size`} value={size} onChange={(e) => setSize(e.target.value)} className={fieldClass(errors.size)}>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {err("size", `${id}-size`)}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] cursor-pointer rounded-full border border-[#F1DDE8] bg-white px-5 text-sm font-bold text-[#55607A] hover:bg-pink-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] cursor-pointer rounded-full bg-[#F43F8F] px-6 text-sm font-bold text-white shadow-[0_6px_20px_rgba(244,63,143,0.3)] hover:bg-[#E02874]"
          >
            Add product
          </button>
        </div>
      </form>
    </LuModal>
  );
}
