import Link from "next/link";
import { Logo } from "@/components/Logo";
import { COPYRIGHT_YEAR, SITE } from "@/lib/site";

const linkClass =
  "rounded text-sm font-semibold text-ink-500 hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200";

export function MarketingFooter() {
  return (
    <footer className="border-t-2 border-ink-300/20 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-3">
          <Link href="/" aria-label="JustViet home" className="rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
            <Logo className="justify-start" />
          </Link>
          <p className="max-w-xs text-sm text-ink-500">
            A friendly way to learn Vietnamese — a little every day. <span lang="vi">Chúc bạn học vui!</span>
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="font-heading mb-3 text-sm font-extrabold tracking-wide text-ink-900 uppercase">JustViet</h2>
          <ul className="flex flex-col gap-2">
            <li><Link href="/#features" className={linkClass}>Features</Link></li>
            <li><Link href="/#pricing" className={linkClass}>Pricing</Link></li>
            <li><Link href="/#faq" className={linkClass}>FAQ</Link></li>
            <li><Link href="/login?view=signup" className={linkClass}>Create an account</Link></li>
            <li><Link href="/login" className={linkClass}>Log in</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal and contact">
          <h2 className="font-heading mb-3 text-sm font-extrabold tracking-wide text-ink-900 uppercase">Company</h2>
          <ul className="flex flex-col gap-2">
            <li><Link href="/privacy" className={linkClass}>Privacy Policy</Link></li>
            <li><Link href="/terms" className={linkClass}>Terms of Service</Link></li>
            <li><Link href="/guidelines" className={linkClass}>Community Guidelines</Link></li>
            <li>
              <a href={`mailto:${SITE.contactEmail}`} className={linkClass}>
                Contact us
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t-2 border-ink-300/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-500 sm:px-6">
          © {COPYRIGHT_YEAR} {SITE.operator}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
