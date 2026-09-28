import { business } from "./business";
import { CartItem, cartTotal, getProduct, getVariant, itemTotal, money } from "./product";

export function orderMessage(items: CartItem[]) {
  const lines = items.map((item) => {
    const product = getProduct(item.productId);
    const variant = getVariant(item.productId, item.variantId)!;
    const label = product.variants.length > 1 ? `${variant.label} - ${variant.detail}` : variant.label;
    return `- ${item.quantity}x ${product.orderName} (${label}) - ${money(itemTotal(item))}`;
  });
  return ["Hello Moon Store! I would like to place an order from your website:", "", ...lines, "", `Total: ${money(cartTotal(items))}`, "", "Delivery / Pickup details:", "Name: [Customer to fill]", "Delivery Address: [Customer to fill]"].join("\n");
}

export const checkoutUrl = (items: CartItem[]) => items.length ? `${business.whatsapp}?text=${encodeURIComponent(orderMessage(items))}` : business.whatsapp;
