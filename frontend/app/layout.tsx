import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // NOTE: Update this URL after deploying your frontend to Cloudflare Pages
  metadataBase: new URL("http://localhost:3000"),
  title: "AI Influencer | Create AI Content Like Never Before",
  description: "Generate images, content, and videos with persistent AI influencer personas. The future of content creation is here.",
  openGraph: {
    title: "AI Influencer | Create AI Content Like Never Before",
    description: "Generate images, content, and videos with persistent AI influencer personas. The future of content creation is here.",
    // NOTE: Update this URL after deploying your frontend
    url: "http://localhost:3000",
    siteName: "AI Influencer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Influencer - Create AI Content Like Never Before",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Influencer | Create AI Content Like Never Before",
    description: "Generate images, content, and videos with persistent AI influencer personas. The future of content creation is here.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
