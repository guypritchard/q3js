export type CsjsPromotionPlacement = "homepage_dialog" | "homepage_hero";

export function csjsPromotionUrl(placement: CsjsPromotionPlacement): string {
  const parameters = new URLSearchParams({
    utm_source: "q3js",
    utm_medium: "referral",
    utm_campaign: "q3js_cross_promo",
    utm_content: placement,
  });

  return `https://csjs.live/?${parameters.toString()}`;
}
