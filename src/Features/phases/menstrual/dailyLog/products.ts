import { PRODUCT_SIZES, type Product, type ProductType } from "../../../../services/logs";

export const QTY_MIN = 1;
export const QTY_MAX = 20;

export const PRODUCT_COPY: Record<string, { title: string; hint: string }> = {
  Pad: { title: "Pads", hint: "Disposable pads" },
  Tampon: { title: "Tampons", hint: "Internal protection" },
  "Menstrual cup": { title: "Menstrual cup", hint: "Reusable cup" },
  Other: { title: "Other", hint: "Product" },
};

export const sizesFor = (type: ProductType): readonly string[] => PRODUCT_SIZES[type] ?? [];

/** Name shown on a row: the user's own label if they typed one, else the product title. */
export const productName = (p: Product) =>
  p.label && p.label !== p.type ? p.label : (PRODUCT_COPY[p.type]?.title ?? p.type);

/** "Other" entries are named by the user, so they never merge with each other. */
const sameProduct = (a: Product, b: Product) =>
  a.type !== "Other" && a.type === b.type && a.label === b.label && (a.size ?? null) === (b.size ?? null);

/** Same product + same size + same label becomes one row with a higher quantity (except "Other"). */
export function mergeProducts(list: Product[]): Product[] {
  const out: Product[] = [];
  for (const p of list) {
    const hit = out.find((o) => sameProduct(o, p));
    if (hit) hit.quantity = Math.min(QTY_MAX, hit.quantity + p.quantity);
    else out.push({ ...p });
  }
  return out;
}
