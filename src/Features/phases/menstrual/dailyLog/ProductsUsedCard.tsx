import { ChevronDown, Inbox, Minus, Plus, Trash2 } from "lucide-react";
import { useId } from "react";

import type { Product, ProductType } from "../../../../services/logs";
import { PRODUCT_COPY, QTY_MAX, QTY_MIN, productName, sizesFor } from "./products";

export type ProductPatch = { quantity?: number; size?: string | null };

interface ProductsUsedCardProps {
  products: Product[];
  onPatch: (index: number, patch: ProductPatch) => void;
  onRemove: (index: number) => void;
  onOpenAdd: () => void;
}

function ProductIcon({ type }: { type: ProductType }) {
  const common = { viewBox: "0 0 24 24", fill: "none", className: "h-5 w-5 text-[#F43F8F]", "aria-hidden": true } as const;
  switch (type) {
    case "Pad":
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
          <path d="M4 12C4 9.5 7 9.5 7 9.5V14.5C7 14.5 4 14.5 4 12Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 12C20 9.5 17 9.5 17 9.5V14.5C17 14.5 20 14.5 20 12Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "Tampon":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M12 17V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "Menstrual cup":
      return (
        <svg {...common}>
          <path d="M6 5H18C18 5 18 14 12 17C6 14 6 5 6 5Z" stroke="currentColor" strokeWidth="2" />
          <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}

export function ProductsUsedCard({ products, onPatch, onRemove, onOpenAdd }: ProductsUsedCardProps) {
  const headingId = useId();
  const sizeId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="absolute inset-0 flex min-h-0 w-full flex-col space-y-3 overflow-hidden rounded-[22px] border border-[#F1EEF3] bg-white p-5 text-left shadow-[0_8px_28px_rgba(23,21,43,0.045)] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={headingId} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#68708A] sm:text-sm">
          <span>Products used</span>
          <span className="text-xs font-normal text-[#8A92A6]" aria-hidden="true">
            ⓘ
          </span>
        </h3>
        <button
          type="button"
          onClick={onOpenAdd}
          aria-haspopup="dialog"
          className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full border border-pink-200 bg-[#FFF0F6] px-4 text-xs font-bold text-[#C2185B] transition-colors hover:bg-pink-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add another entry</span>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#F1DDE8] bg-[#FFFCFE] p-4 text-center sm:p-5">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#FFF0F6] text-[#F43F8F]">
            <Inbox className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#17152B]">No products logged</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#68708A] sm:text-[0.82rem]">Add pads, tampons, a cup or other products you used.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          {products.map((prod, index) => {
            const name = productName(prod);
            const sizes = sizesFor(prod.type);
            const key = `${sizeId}-${index}`;
            return (
              <li
                key={prod.type === "Other" ? `Other-${index}` : `${prod.type}-${prod.label}-${prod.size ?? ""}`}
                className="space-y-3 rounded-2xl border border-[#F5E2EC] bg-[#FFF8FA] p-3.5 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-200 bg-white">
                      <ProductIcon type={prod.type} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-bold leading-tight text-[#17152B] sm:text-base">{name}</h4>
                      <p className="text-[0.72rem] font-medium leading-tight text-[#68708A]">
                        {PRODUCT_COPY[prod.type]?.hint ?? "Product"}
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <div className="flex items-center rounded-full border border-pink-200 bg-white">
                      <button
                        type="button"
                        aria-label={`Decrease ${name} quantity`}
                        onClick={() => onPatch(index, { quantity: prod.quantity - 1 })}
                        disabled={prod.quantity <= QTY_MIN}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#68708A] transition-colors hover:text-[#F43F8F] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-[20px] text-center text-sm font-black text-[#17152B]" aria-live="polite">
                        <span className="sr-only">Quantity </span>
                        {prod.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${name} quantity`}
                        onClick={() => onPatch(index, { quantity: prod.quantity + 1 })}
                        disabled={prod.quantity >= QTY_MAX}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#C2185B] transition-colors hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`Remove ${name}`}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {sizes.length > 0 && (
                  <div className="space-y-1">
                    <label htmlFor={key} className="block text-[0.68rem] font-bold uppercase tracking-wider text-[#68708A]">
                      {prod.type === "Menstrual cup" ? "Size" : "Size / absorbency"}
                    </label>
                    <div className="relative">
                      <select
                        id={key}
                        value={prod.size ?? sizes[0]}
                        onChange={(e) => onPatch(index, { size: e.target.value })}
                        className="min-h-[44px] w-full cursor-pointer appearance-none rounded-xl border border-[#F1DDE8] bg-white px-3.5 pr-9 text-sm font-semibold text-[#17152B] focus:outline-none focus:ring-2 focus:ring-[#F43F8F]/30"
                      >
                        {sizes.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68708A]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-left text-[0.72rem] leading-relaxed text-[#68708A]">
        Used more than one size today? Add a separate entry for each size or absorbency.
      </p>
    </section>
  );
}
