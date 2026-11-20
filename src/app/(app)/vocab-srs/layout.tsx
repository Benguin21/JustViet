import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component, so its browser-tab title is set here.
export const metadata: Metadata = {
  title: "Vocabulary",
  description: "Your Vocab Spaced Repetition System (SRS): flashcards that come back right before you'd forget them.",
};

export default function VocabularyLayout({ children }: { children: ReactNode }) {
  return children;
}
