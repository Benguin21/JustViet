import { NavCard } from "@/components/NavCard";

const SECTIONS = [
  {
    href: "/goals",
    icon: "🎯",
    label: "Goals",
    description: "Set and track your learning targets",
    tone: "red",
  },
  {
    href: "/grammar",
    icon: "📖",
    label: "Grammar",
    description: "Learn how Vietnamese sentences work",
    tone: "yellow",
  },
  {
    href: "/dictionary",
    icon: "🔎",
    label: "Dictionary",
    description: "Look up words and their meanings",
    tone: "red",
  },
  {
    href: "/vocab-srs",
    icon: "🧠",
    label: "Vocab SRS",
    description: "Review words with spaced repetition",
    tone: "yellow",
  },
  {
    href: "/skills",
    icon: "🌟",
    label: "Skills",
    description: "Practice reading, listening, and speaking",
    tone: "red",
  },
  {
    href: "/community",
    icon: "💬",
    label: "Community",
    description: "Connect with other learners",
    tone: "yellow",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">
          Chào mừng bạn! 👋
        </h1>
        <p className="mt-1 font-semibold text-ink-500">
          Where do you want to learn today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <NavCard key={section.href} {...section} />
        ))}
      </div>
    </main>
  );
}
