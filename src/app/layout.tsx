import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Vietnamese needs its own subset for letters like ồ, ữ and ạ, or they fall back to
// another font mid-word.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "JustViet — Learn Vietnamese",
  description: "A friendly, bite-sized way to learn Vietnamese.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
