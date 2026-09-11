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
 */
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
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

/** Live-subscribes to every vocab card the user owns. */
export function subscribeToCards(
  uid: string,
  onData: (cards: VocabCard[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    cardsCol(uid),
    (snapshot) => {
      const cards = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VocabCard);
      onData(cards);
    },
    onError,
  );
}

/**
 * Live-subscribes to the user's review log, most recent first. Bounded by
 * a generous limit rather than fetched in full — fine for the dashboard
 * heatmap/forecast and daily-limit accounting, which only look at recent
 * history; a very long-lived collection would eventually want pagination.
 */
export function subscribeToReviewLogs(
  uid: string,
  onData: (logs: ReviewLogEntry[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const q = query(logsCol(uid), orderBy("reviewedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewLogEntry);
      onData(logs);
    },
    onError,
  );
}

/** Live-subscribes to the user's SRS settings doc (null until they've saved any). */
export function subscribeToSettings(
  uid: string,
  onData: (settings: Partial<SrsSettings> | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data() as SrsSettings) : null),
    onError,
  );
}

export async function createCard(uid: string, input: NewVocabCardInput): Promise<string> {
  const now = Date.now();
  const ref = doc(cardsCol(uid));
  const card: Omit<VocabCard, "id"> = {
    userId: uid,
    front: input.front.trim(),
    back: input.back.trim(),
    exampleSentence: input.exampleSentence.trim(),
    partOfSpeech: input.partOfSpeech,
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
    ...createNewCardFields(new Date(now)),
  };
  await setDoc(ref, card);
  return ref.id;
}

/** Updates a card's content. SRS scheduling fields are left untouched on purpose. */
export async function updateCard(
  uid: string,
  cardId: string,
  edit: VocabCardEdit,
): Promise<void> {
  await setDoc(
    cardRef(uid, cardId),
    {
      front: edit.front.trim(),
      back: edit.back.trim(),
      exampleSentence: edit.exampleSentence.trim(),
      partOfSpeech: edit.partOfSpeech,
      tags: edit.tags.map((t) => t.trim()).filter(Boolean),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/** Resets a card's SRS scheduling back to "new". Past review history is kept for the record. */
export async function resetCardProgress(uid: string, cardId: string): Promise<void> {
  const now = Date.now();
  await setDoc(
    cardRef(uid, cardId),
    { ...createNewCardFields(new Date(now)), updatedAt: now },
    { merge: true },
  );
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

/**
 * Recomputes the due date of every review-state card from its current
 * stability under the settings' desired retention (see
 * `srs.ts#rescheduleForRetention`) — a lightweight "apply my new retention
 * target to cards I've already scheduled" action, not a full re-optimization.
 */
export async function rescheduleAllCards(
  uid: string,
  cards: VocabCard[],
  settings: SrsSettings,
): Promise<number> {
  const database = requireDb();
  const now = Date.now();
  const toUpdate = cards
    .map((card) => ({ card, next: rescheduleForRetention(card, settings, now) }))
    .filter(({ card, next }) => next.due !== card.due || next.scheduledDays !== card.scheduledDays);

  const CHUNK = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const batch = writeBatch(database);
    for (const { card, next } of toUpdate.slice(i, i + CHUNK)) {
      batch.set(
        cardRef(uid, card.id),
        { due: next.due, scheduledDays: next.scheduledDays, updatedAt: now },
        { merge: true },
      );
    }
    await batch.commit();
  }

  return toUpdate.length;
}
