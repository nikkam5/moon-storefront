// Add another entry here to include a new screenshot in the full gallery.
// The BounceCards preview uses only the first three entries.
export const customerFeedback = [
  { id: "usb-phone", src: "/feedback/usb-phone.webp", width: 858, height: 1080, alt: "WhatsApp customer feedback about USB speed, price and use with a phone" },
  { id: "usb-quality", src: "/feedback/usb-quality.webp", width: 998, height: 1080, alt: "WhatsApp customer feedback about Kingston USB quality, performance and design" },
  { id: "usb-service", src: "/feedback/usb-service.webp", width: 1220, height: 612, alt: "WhatsApp customer feedback about fast USB performance and friendly service" },
];

export type CustomerFeedbackImage = typeof customerFeedback[number];
