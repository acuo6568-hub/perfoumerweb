import { getPerfumes } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";
import { applySiteBranding } from "@/lib/site-branding";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toAbsoluteImageUrl(input: string) {
  if (!input) return absoluteUrl("/perfoumerlogo.png");
  if (/^https?:\/\//i.test(input)) return input;
  return absoluteUrl(input.startsWith("/") ? input : `/${input}`);
}

function toAvailability(inStock: boolean) {
  return inStock ? "in stock" : "out of stock";
}

function toDescription(
  brand: string,
  name: string,
  gender: string,
  sizeLabel: string,
  siteName: string,
) {
  return `${brand} ${name} ${sizeLabel} ölçüdə ${gender} üçün orijinal ətir. ${siteName} Bakı mağazası və onlayn sifariş ilə təqdim olunur.`;
}

export async function GET() {
  const settings = await getSiteSettings();
  const { siteName } = settings;
  const perfumes = await getPerfumes();
  const items = perfumes.flatMap((perfume) =>
    perfume.sizes.map((size) => ({
      id: `${perfume.id}-${size.ml}`,
      title: `${perfume.brand} ${perfume.name} ${size.label}`,
      description: toDescription(perfume.brand, perfume.name, perfume.gender, size.label, siteName),
      link: absoluteUrl(`/perfumes/${perfume.slug}`),
      imageLink: toAbsoluteImageUrl(perfume.image),
      availability: toAvailability(perfume.inStock),
      price: `${size.price.toFixed(2)} AZN`,
      brand: perfume.brand,
      gender: perfume.gender,
      sizeLabel: size.label,
    })),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(applySiteBranding("Perfoumer Merchant Feed", settings))}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml(applySiteBranding("Perfoumer product feed for Google Merchant Center and free listings.", settings))}</description>
${items
  .map(
    (item) => `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:price>${escapeXml(item.price)}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:google_product_category>Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Perfume &amp; Cologne</g:google_product_category>
      <g:product_type>${escapeXml(`Perfume > ${item.gender} > ${item.sizeLabel}`)}</g:product_type>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
