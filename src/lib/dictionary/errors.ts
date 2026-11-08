/** Thrown when creating a dictionary entry whose headword already exists (shared or personal). */
export class DuplicateDictionaryEntryError extends Error {
  readonly key: string;
  readonly headword: string;

  constructor(key: string, headword: string) {
    super("This word is already in your dictionary.");
    this.name = "DuplicateDictionaryEntryError";
    this.key = key;
    this.headword = headword;
  }
}
