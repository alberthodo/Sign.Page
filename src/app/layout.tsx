import type { Metadata, Viewport } from "next";
import { BRAND_ICON } from "@/lib/brand";
import { getAppName } from "@/lib/app-name";
import { getMetadataBase } from "@/lib/site-url";
import "./globals.css";

const appName = getAppName();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** App-wide defaults; marketing SEO lives on `/` via `generateMetadata`. */
export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: appName,
    template: `%s · ${appName}`,
  },
  icons: {
    icon: BRAND_ICON,
    apple: BRAND_ICON,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full w-full overflow-x-clip flex flex-col">{children}</body>
    </html>
  );
}
