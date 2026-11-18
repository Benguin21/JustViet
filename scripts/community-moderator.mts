/**
 * Gives or takes away Community moderator rights: the Firebase custom claim
 * `moderator: true`, which firestore.rules checks. Only this script (or
 * anything else holding an admin service-account key) can set it, so no
 * browser can make itself a moderator.
 *
 *   node scripts/community-moderator.mts --key path/to/key.json --grant someone@example.com
 *   node scripts/community-moderator.mts --key path/to/key.json --revoke <uid or email>
 *   node scripts/community-moderator.mts --key path/to/key.json --list
 *
 * The key is a Firebase service-account JSON (Firebase console → Project
 * settings → Service accounts → Generate new private key). Keep it outside
 * the repo or in a `*.service-account.json` file (gitignored). NEVER commit
 * it. GOOGLE_APPLICATION_CREDENTIALS works instead of --key.
 *
 * The change reaches the person's browser when their sign-in token next
 * refreshes (within an hour); signing out and back in applies it at once.
 * They also need a community profile to use the moderation pages.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";

const args = process.argv.slice(2);
const value = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const keyPath = value("--key");
initializeApp({ credential: keyPath ? cert(JSON.parse(readFileSync(resolve(keyPath), "utf8"))) : applicationDefault() });
const auth = getAuth();

async function findUser(who: string): Promise<UserRecord> {
  return who.includes("@") ? auth.getUserByEmail(who) : auth.getUser(who);
}

async function setModerator(who: string, on: boolean) {
  const user = await findUser(who);
  const claims = { ...(user.customClaims ?? {}) };
  if (on) claims.moderator = true;
  else delete claims.moderator;
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`${on ? "Granted" : "Revoked"} moderator rights for ${user.uid}${user.email ? ` (${user.email})` : ""}.`);
  console.log("It applies when their sign-in refreshes (within an hour), or right away if they sign out and back in.");
}

async function list() {
  let token: string | undefined;
  let found = 0;
  do {
    const page = await auth.listUsers(1000, token);
    for (const u of page.users) {
      if (u.customClaims?.moderator === true) {
        found++;
        console.log(`${u.uid}${u.email ? `  ${u.email}` : ""}`);
      }
    }
    token = page.pageToken;
  } while (token);
  console.log(found ? `${found} moderator(s).` : "No moderators yet.");
}

const grant = value("--grant");
const revoke = value("--revoke");
if (grant) await setModerator(grant, true);
else if (revoke) await setModerator(revoke, false);
else if (args.includes("--list")) await list();
else {
  console.log("Usage: node scripts/community-moderator.mts --key <service-account.json> (--grant <email|uid> | --revoke <email|uid> | --list)");
  process.exit(1);
}
