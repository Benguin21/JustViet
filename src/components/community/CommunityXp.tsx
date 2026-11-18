import { COMMUNITY_XP_EXPLANATION, COMMUNITY_XP_LABEL, communityXp } from "@/lib/community/votes";

/**
 * "12 Community XP". Always neutral: a negative total gets the same
 * styling as a positive one (no red, no labels). The explanation is the
 * title, and spelled out on profile pages.
 */
export function CommunityXp({ totals, className = "" }: { totals: { up: number; down: number }; className?: string }) {
  const xp = communityXp(totals);
  return (
    <span className={`whitespace-nowrap ${className}`} title={COMMUNITY_XP_EXPLANATION}>
      {xp.toLocaleString("en-US")} {COMMUNITY_XP_LABEL}
    </span>
  );
}
