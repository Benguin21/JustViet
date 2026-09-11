/**
 * All Firestore reads/writes for the Vocab SRS feature live here — nowhere
 * else in the app should import `firebase/firestore` directly. Everything
 * is scoped under `users/{uid}/...`, which is what `firestore.rules`
 * relies on to keep each user's vocabulary private to them.
 *
 * Data model:
 *   users/{uid}/vocabCards/{cardId}  — one doc per vocab card (content + SRS fields)
 *   users/{uid}/reviewLogs/{logId}   — one doc per review, flat (not nested under
 *                                      the card) so daily-limit/heatmap queries
 *                                      don't need a composite index
 *   users/{uid}/settings/srs         — a single doc holding the user's SrsSettings
 *
 * Reads are one-time (`getDocs`/`getDoc`), not live `onSnapshot` listeners.
 * We measured `onSnapshot`'s realtime `Listen` channel taking 10-30+
 * seconds to establish in some environments (a Firestore project's
 * streaming RPC surface can lag behind plain reads/writes right after
 * Firestore is first enabled, and some networks/proxies are slow to
 * negotiate its WebChannel transport) while plain `getDocs` reads
 * consistently resolved in well under a second. Since this is a
 * single-user tool with no real need for live cross-tab sync, `useVocabData`
 * fetches once on mount and every mutation here returns the exact data it
 * wrote so the hook can update local state immediately, without waiting on
 * a listener or a follow-up fetch.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { applyReview, createNewCardFields, rescheduleForRetention } from "./srs";
import type {
  CardRating,
  NewVocabCardInput,
  ReviewLogEntry,
  SrsSettings,
  VocabCard,
  VocabCardEdit,
} from "./types";

function requireDb(): Firestore {
  if (!db) {
    throw new Error(
      "Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.",
    );
  }
  return db;
}

const cardsCol = (uid: string) => collection(requireDb(), "users", uid, "vocabCards");
const cardRef = (uid: string, cardId: string) =>
  doc(requireDb(), "users", uid, "vocabCards", cardId);
const logsCol = (uid: string) => collection(requireDb(), "users", uid, "reviewLogs");
const settingsRef = (uid: string) => doc(requireDb(), "users", uid, "settings", "srs");

/** Reasonable cap on how much review history a single load pulls in — see the module comment. */
const REVIEW_LOG_FETCH_LIMIT = 2000;

export async function fetchCards(uid: string): Promise<VocabCard[]> {
  const snapshot = await getDocs(cardsCol(uid));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VocabCard);
}

/**
 * Fetches the user's most recent review log entries (bounded — see
 * `REVIEW_LOG_FETCH_LIMIT`), most recent first. This is enough for the
 * dashboard heatmap/forecast and daily-limit accounting; a very long-lived
 * collection would eventually want real pagination for per-card history.
 */
export async function fetchReviewLogs(uid: string): Promise<ReviewLogEntry[]> {
  const q = query(logsCol(uid), orderBy("reviewedAt", "desc"), limit(REVIEW_LOG_FETCH_LIMIT));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewLogEntry);
}

export async function fetchSettings(uid: string): Promise<Partial<SrsSettings> | null> {
  const snapshot = await getDoc(settingsRef(uid));
  return snapshot.exists() ? (snapshot.data() as SrsSettings) : null;
}

/**
 * Shapes a `NewVocabCardInput` (from the manual form, or a parsed batch-
 * import row — see `import.ts`) into a full card document. Shared so both
 * creation paths stay in lockstep: an imported card is built exactly the
 * same way a manually-created one is, just with its content sourced from
 * a parsed row instead of a form.
 */
function buildNewCardDoc(uid: string, input: NewVocabCardInput, now: number): Omit<VocabCard, "id"> {
  return {
    userId: uid,
    front: input.front.trim(),
    back: input.back.trim(),
    exampleSentence: input.exampleSentence.trim(),
    partOfSpeech: input.partOfSpeech,
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    pronunciation: input.pronunciation?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    ...createNewCardFields(new Date(now)),
  };
}

export async function createCard(uid: string, input: NewVocabCardInput): Promise<VocabCard> {
  const ref = doc(cardsCol(uid));
  const card = buildNewCardDoc(uid, input, Date.now());
  await setDoc(ref, card);
  return { id: ref.id, ...card };
}

/**
 * Creates many cards at once (batch import). Each card is built with the
 * exact same `buildNewCardDoc` shaping as a single manually-created card —
 * imported cards aren't a separate kind of card, they just arrive in bulk.
 * Chunked to stay under Firestore's 500-write batch limit.
 */
export async function createCards(uid: string, inputs: NewVocabCardInput[]): Promise<VocabCard[]> {
  const database = requireDb();
  const now = Date.now();
  const created: VocabCard[] = [];

  const CHUNK = 400;
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const batch = writeBatch(database);
    for (const input of inputs.slice(i, i + CHUNK)) {
      const ref = doc(cardsCol(uid));
      const card = buildNewCardDoc(uid, input, now);
      batch.set(ref, card);
      created.push({ id: ref.id, ...card });
    }
    await batch.commit();
  }

  return created;
}

/** Updates a card's content. SRS scheduling fields are left untouched on purpose. */
export async function updateCard(
  uid: string,
  cardId: string,
  edit: VocabCardEdit,
): Promise<Partial<VocabCard>> {
  const patch = {
    front: edit.front.trim(),
    back: edit.back.trim(),
    exampleSentence: edit.exampleSentence.trim(),
    partOfSpeech: edit.partOfSpeech,
    tags: edit.tags.map((t) => t.trim()).filter(Boolean),
    pronunciation: edit.pronunciation?.trim() ?? "",
    notes: edit.notes?.trim() ?? "",
    updatedAt: Date.now(),
  };
  await setDoc(cardRef(uid, cardId), patch, { merge: true });
  return patch;
}

/** Resets a card's SRS scheduling back to "new". Past review history is kept for the record. */
export async function resetCardProgress(uid: string, cardId: string): Promise<Partial<VocabCard>> {
  const now = Date.now();
  const patch = { ...createNewCardFields(new Date(now)), updatedAt: now };
  await setDoc(cardRef(uid, cardId), patch, { merge: true });
  return patch;
}

export async function setCardSuspended(
  uid: string,
  cardId: string,
  suspended: boolean,
): Promise<void> {
  await setDoc(cardRef(uid, cardId), { suspended, updatedAt: Date.now() }, { merge: true });
}

/** Deletes a card and its review log entries together. */
export async function deleteCard(uid: string, cardId: string): Promise<void> {
  const database = requireDb();
  const logsSnapshot = await getDocs(query(logsCol(uid), where("cardId", "==", cardId)));

  const batch = writeBatch(database);
  batch.delete(cardRef(uid, cardId));
  for (const logDoc of logsSnapshot.docs) batch.delete(logDoc.ref);
  await batch.commit();
}

/**
 * Records a review: applies the SRS algorithm to the card and writes both
 * the updated card and a new review-log entry in one atomic batch, so a
 * failure can't leave scheduling and history out of sync.
 */
export async function submitReview(
  uid: string,
  card: VocabCard,
  rating: CardRating,
  settings: SrsSettings,
  now: Date = new Date(),
): Promise<{ card: VocabCard; log: ReviewLogEntry }> {
  const database = requireDb();
  const result = applyReview(card, rating, settings, now);
  const updatedCard: VocabCard = { ...card, ...result.card, updatedAt: now.getTime() };

  const newLogRef = doc(logsCol(uid));
  const log: ReviewLogEntry = {
    id: newLogRef.id,
    cardId: card.id,
    userId: uid,
    ...result.log,
  };

  const batch = writeBatch(database);
  batch.set(cardRef(uid, card.id), updatedCard);
  batch.set(newLogRef, log);
  await batch.commit();

  return { card: updatedCard, log };
}

export async function saveSettings(uid: string, settings: SrsSettings): Promise<void> {
  await setDoc(settingsRef(uid), settings);
}

export interface RescheduledCard {
  id: string;
  due: number;
  scheduledDays: number;
}

/**
 * Recomputes the due date of every review-state card from its current
 * stability under the settings' desired retention (see
 * `srs.ts#rescheduleForRetention`) — a lightweight "apply my new retention
 * target to cards I've already scheduled" action, not a full re-optimization.
 * Returns just the cards that actually changed, so the caller can patch
 * local state without a refetch.
 */
export async function rescheduleAllCards(
  uid: string,
  cards: VocabCard[],
  settings: SrsSettings,
): Promise<RescheduledCard[]> {
  const database = requireDb();
  const now = Date.now();
  const toUpdate: RescheduledCard[] = cards
    .map((card) => ({ card, next: rescheduleForRetention(card, settings, now) }))
    .filter(({ card, next }) => next.due !== card.due || next.scheduledDays !== card.scheduledDays)
    .map(({ card, next }) => ({ id: card.id, due: next.due, scheduledDays: next.scheduledDays }));

  const CHUNK = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const batch = writeBatch(database);
    for (const update of toUpdate.slice(i, i + CHUNK)) {
      batch.set(
        cardRef(uid, update.id),
        { due: update.due, scheduledDays: update.scheduledDays, updatedAt: now },
        { merge: true },
      );
    }
    await batch.commit();
  }

  return toUpdate;
}
