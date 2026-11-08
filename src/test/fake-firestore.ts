/**
 * A tiny in-memory stand-in for the parts of `firebase/firestore` the
 * repositories use, for unit tests (`vi.mock("firebase/firestore", ...)`).
 * Transactions run one at a time and commit their writes at the end, which
 * is enough to exercise the "check inside a transaction, then write" logic
 * the duplicate-prevention code relies on. Not a full emulator.
 */
type Data = Record<string, unknown>;

export const store = new Map<string, Data>();
let autoId = 0;

export function resetStore() {
  store.clear();
  autoId = 0;
}

interface Ref {
  type: "doc" | "collection";
  path: string;
  id: string;
}

const isRef = (x: unknown): x is Ref => typeof x === "object" && x !== null && "path" in x;

export function collection(parent: unknown, ...segments: string[]): Ref {
  const base = isRef(parent) ? [parent.path] : [];
  const path = [...base, ...segments].join("/");
  return { type: "collection", path, id: segments[segments.length - 1] };
}

export function doc(parent: unknown, ...segments: string[]): Ref {
  if (isRef(parent) && parent.type === "collection" && segments.length === 0) {
    const id = `auto${++autoId}`;
    return { type: "doc", path: `${parent.path}/${id}`, id };
  }
  const base = isRef(parent) ? [parent.path] : [];
  const path = [...base, ...segments].join("/");
  return { type: "doc", path, id: segments[segments.length - 1] };
}

function snapshot(ref: Ref) {
  const data = store.get(ref.path);
  return {
    id: ref.id,
    ref,
    exists: () => data !== undefined,
    data: () => (data === undefined ? undefined : structuredClone(data)),
  };
}

function check(data: Data) {
  const visit = (value: unknown, where: string) => {
    if (value === undefined) throw new Error(`Unsupported field value: undefined (${where})`);
    if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${where}[${i}]`));
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) visit(v, `${where}.${k}`);
  };
  visit(data, "doc");
}

export async function getDoc(ref: Ref) {
  return snapshot(ref);
}

export async function getDocs(target: Ref | { collection: Ref }) {
  const col = "collection" in target ? target.collection : target;
  const prefix = `${col.path}/`;
  const docs = Array.from(store.keys())
    .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
    .map((p) => snapshot({ type: "doc", path: p, id: p.slice(prefix.length) }));
  return { docs };
}

export async function setDoc(ref: Ref, data: Data, options?: { merge?: boolean }) {
  check(data);
  store.set(ref.path, options?.merge ? { ...(store.get(ref.path) ?? {}), ...structuredClone(data) } : structuredClone(data));
}

export async function deleteDoc(ref: Ref) {
  store.delete(ref.path);
}

let queue: Promise<unknown> = Promise.resolve();

export function runTransaction<T>(_db: unknown, fn: (tx: unknown) => Promise<T>): Promise<T> {
  const run = async () => {
    const writes: (() => void)[] = [];
    const tx = {
      get: async (ref: Ref) => snapshot(ref),
      set: (ref: Ref, data: Data) => {
        check(data);
        writes.push(() => store.set(ref.path, structuredClone(data)));
      },
      delete: (ref: Ref) => writes.push(() => store.delete(ref.path)),
    };
    const result = await fn(tx);
    writes.forEach((w) => w());
    return result;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export function writeBatch() {
  const writes: (() => void)[] = [];
  return {
    set: (ref: Ref, data: Data) => writes.push(() => store.set(ref.path, structuredClone(data))),
    delete: (ref: Ref) => writes.push(() => store.delete(ref.path)),
    commit: async () => writes.forEach((w) => w()),
  };
}

export const query = (collectionRef: Ref) => ({ collection: collectionRef });
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const initializeFirestore = () => ({});
export const getFirestore = () => ({});
