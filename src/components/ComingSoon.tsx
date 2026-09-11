import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="text-6xl" aria-hidden="true">
        {icon}
      </span>
      <h1 className="font-heading text-3xl font-extrabold text-ink-900">
        {title}
      </h1>
      <p className="max-w-md font-semibold text-ink-500">{description}</p>
      <p className="rounded-full bg-yellow-100 px-4 py-1 text-sm font-bold tracking-wide text-yellow-600 uppercase">
        Coming soon
      </p>
      <Link href="/home" className="mt-4 w-full max-w-xs">
        <Button variant="outline">Back to Home</Button>
      </Link>
    </main>
  );
}
