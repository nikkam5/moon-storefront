export type ProductId = "kingston-dtxg2" | "motul-7100" | "motul-5100" | "popia-nestum" | "honey-cornflakes";
export type Category = "tech" | "motor" | "treats";
export type Variant = { id: string; label: string; detail: string; price: number; color?: string };
export type Product = {
  id: ProductId;
  name: string;
  orderName: string;
  category: Category;
  categoryLabel: string;
  tagline: string;
  description: string;
  specs: [string, string][];
  note?: string;
  variants: Variant[];
  image?: string;
  images?: string[];
};

// Store-supplied catalog. Set image to a local /products/your-photo.jpg URL when photos arrive.
export const products: Product[] = [
  {
    id: "kingston-dtxg2",
    name: "Kingston DataTraveler Exodia G2",
    orderName: "Kingston DTXG2 USB Flash Drive",
    category: "tech",
    categoryLabel: "Tech & Accessories",
    tagline: "Ultra-portable, high-speed everyday data transfer.",
    description: "Keep work, memories and your next big idea close. A plug-and-play USB flash drive with a protective snap cap and a handy keyring loop.",
    specs: [["Connection", "USB 3.2 Gen 1 · USB Type-A"], ["Design", "Protective snap cap · keyring loop"], ["Setup", "Plug and play"], ["Warranty", "5-year official warranty"]],
    image: "/products/usb.png",
    variants: [
      { id: "64gb", label: "64GB", detail: "Matte Black", price: 35, color: "#27272b" },
      { id: "128gb", label: "128GB", detail: "Sky Blue", price: 55, color: "#66b4e8" },
      { id: "256gb", label: "256GB", detail: "Lime Green", price: 95, color: "#a9ce45" },
      { id: "512gb", label: "512GB", detail: "Deep Purple", price: 165, color: "#6945a6" },
    ],
  },
  {
    id: "motul-7100",
    name: "Motul 7100 4T 10W-40",
    orderName: "Motul 7100 4T 10W-40",
    category: "motor",
    categoryLabel: "Motor Care",
    tagline: "Factory-grade shear stability and clutch response for sport and track machines.",
    description: "100% synthetic motorcycle oil with Ester technology, for high-revving single and multi-cylinder engines and demanding rides.",
    specs: [["Bottle", "1 Litre"], ["Formulation", "100% synthetic with Ester"], ["Standards", "API SP / SN · JASO MA2"], ["Applications", "Sport and track motorcycles, including Ducati Panigale, Yamaha R-Series and Honda CBR, where this grade is specified"]],
    note: "Check your vehicle manual for the required viscosity and specifications before ordering; compatibility varies by model and year.",
    variants: [{ id: "1-litre", label: "1 Litre", detail: "100% Synthetic", price: 150 }],
  },
  {
    id: "motul-5100",
    name: "Motul 5100 4T 10W-40",
    orderName: "Motul 5100 4T 10W-40",
    category: "motor",
    categoryLabel: "Motor Care",
    tagline: "Everyday thermal resistance and anti-wear protection for urban commuting.",
    description: "Technosynthese synthetic-ester blend for everyday maintenance. An option for kapcai, standard road bikes and scooters whose manuals specify this oil grade.",
    specs: [["Bottle", "1 Litre"], ["Formulation", "Technosynthese synthetic-ester blend"], ["Standards", "API SM / SL · JASO MA2"], ["Applications", "Underbone mopeds, standard naked road bikes and compatible scooters"]],
    note: "Not universal for all scooters. Check your vehicle manual for the required viscosity and JASO standard before ordering.",
    variants: [{ id: "1-litre", label: "1 Litre", detail: "Technosynthese", price: 55 }],
  },
  {
    id: "popia-nestum",
    name: "Signature Popia Nestum Rangup",
    orderName: "Signature Popia Nestum",
    category: "treats",
    categoryLabel: "Snacks & Treats",
    tagline: "Crispy hand-rolled spring pastry coated in creamy, aromatic Nestum cereal.",
    description: "Our homemade, small-batch treat. Freshly baked and packed into an airtight tub, with zero added artificial preservatives and plenty of crunch.",
    specs: [["Net weight", "250g per jar"], ["Made", "Freshly baked in small batches"], ["Packaging", "Airtight seal tub"], ["Preservatives", "Zero added artificial preservatives"]],
    note: "Please ask us about ingredients and allergens before ordering if you have a food allergy.",
    image: "/products/popia-nestum.png",
    variants: [{ id: "standard-jar", label: "Standard Jar", detail: "250g", price: 10 }],
  },
  {
    id: "honey-cornflakes",
    name: "Golden Honey Cornflakes",
    orderName: "Golden Honey Cornflakes",
    category: "treats",
    categoryLabel: "Snacks & Treats",
    tagline: "Toasted crunchy cornflakes glazed with pure golden honey and sweet butter.",
    description: "Cornflakes Madu, the way a good treat should be: balanced sweetness, a delicate caramel finish, and a long-lasting crunch. Made for sharing (or not).",
    specs: [["Net weight", "Approx. 280g per jar"], ["Glaze", "Pure golden honey and sweet butter"], ["Finish", "Delicate caramel · balanced sweetness"], ["Texture", "Toasted and crunchy"]],
    note: "Contains butter. Please ask us for the full ingredients and allergen information before ordering.",
    variants: [{ id: "standard-jar", label: "Standard Jar", detail: "Approx. 280g", price: 15 }],
  },
];

export const getProduct = (id: ProductId) => products.find((item) => item.id === id)!;
export const isProductId = (value: unknown): value is ProductId => products.some((item) => item.id === value);
export const getVariant = (productId: ProductId, variantId: string) => getProduct(productId).variants.find((variant) => variant.id === variantId);
export type CartItem = { productId: ProductId; variantId: string; quantity: number };
export const cartKey = (item: Pick<CartItem, "productId" | "variantId">) => `${item.productId}:${item.variantId}`;
export const MAX_QUANTITY = 10;
export const CART_STORAGE_KEY = "moonstore-cart-v2";
export const money = (amount: number) => `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const itemTotal = (item: CartItem) => (getVariant(item.productId, item.variantId)?.price ?? 0) * item.quantity;
export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + itemTotal(item), 0);

export function parseCart(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  const valid: CartItem[] = [];
  for (const item of saved) {
    if (!item || !isProductId(item.productId) || typeof item.variantId !== "string" || !getVariant(item.productId, item.variantId) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
    if (valid.some((row) => cartKey(row) === cartKey(item))) continue;
    valid.push({ productId: item.productId, variantId: item.variantId, quantity: Math.min(item.quantity, MAX_QUANTITY) });
  }
  return valid;
}
