import { absoluteUrl, siteConfig } from "@/lib/seo";

interface FeatureFaq {
  answer: string;
  question: string;
}

export function buildFeatureStructuredData({
  breadcrumb,
  description,
  faq,
  path,
  title,
}: {
  breadcrumb: string;
  description: string;
  faq: readonly FeatureFaq[];
  path: string;
  title: string;
}): readonly Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: absoluteUrl(path),
      inLanguage: siteConfig.language,
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      about: {
        "@type": "VideoGame",
        name: "Quake III Arena in Q3JS",
        gamePlatform: "Web browser",
        playMode: "MultiPlayer",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Q3JS", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: breadcrumb, item: absoluteUrl(path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(({ answer, question }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];
}
