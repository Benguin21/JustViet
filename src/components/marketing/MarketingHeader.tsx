import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HeaderCtas } from "@/components/marketing/AuthAwareCtas";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink-300/20 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="JustViet home" className="rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          <Logo className="origin-left scale-90 sm:scale-100" />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-ink-700 hover:bg-yellow-100 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <HeaderCtas />
      </div>
    </header>
  );
}
