import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "StudyOS", template: "%s · StudyOS" },
  description: "An AI student knowledge and planning system.",
  openGraph: { title: "StudyOS", description: "AI student knowledge & planning", images: ["/og.png"], type: "website" },
  twitter: { card: "summary_large_image", title: "StudyOS", description: "AI student knowledge & planning", images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={geist.variable}><body>{children}</body></html>;
}
