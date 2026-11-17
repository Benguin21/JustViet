import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How JustViet collects, uses and protects your information.",
  alternates: { canonical: "/privacy" },
};

/*
 * Keep this accurate to what the app actually does. Before changing what
 * data JustViet collects or who processes it (Community, payments, mobile
 * apps, analytics, a new host…), update this page and SITE.privacyUpdated.
 * A draft: have it reviewed before launch.
 */

const email = SITE.contactEmail;
const Mail = () => <a href={`mailto:${email}`}>{email}</a>;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          JustViet is a website for learning Vietnamese, run by {SITE.operator}, based in {SITE.jurisdiction} (&ldquo;
          {SITE.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what information we collect when
          you use JustViet, why, and the choices you have. For data protection laws that use the term, we are the
          &ldquo;controller&rdquo; of your personal information.
        </p>
        <p>
          Questions? Email us at <Mail />.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "Information we collect",
    body: (
      <>
        <h3>Account information</h3>
        <ul>
          <li>
            <strong>If you sign up with email:</strong> your email address, the name you enter, and your password. Your
            password is handled by Google Firebase Authentication and stored only in a scrambled (hashed) form — we
            never see it.
          </li>
          <li>
            <strong>If you sign in with Google:</strong> your name, email address, profile picture link and Google
            account identifier, as shared by Google. We never receive your Google password.
          </li>
          <li>
            Account details such as when you signed up and last signed in, which sign-in methods you use, and whether
            your email address is verified.
          </li>
        </ul>
        <h3>Your learning data</h3>
        <p>To save your progress and sync it between your devices, we store what you create and do in JustViet:</p>
        <ul>
          <li>Your vocabulary flashcards and their review history (which cards you reviewed, when, and how you rated them).</li>
          <li>Your study settings, daily goals and the time zone used to decide when your day starts.</li>
          <li>Words, meanings and notes you add to your personal dictionary.</li>
          <li>Your XP, level, and Rồng Con&apos;s progress.</li>
        </ul>
        <h3>Technical information</h3>
        <p>
          When your browser connects to JustViet and to the Google services that power it, those services
          automatically receive technical information such as your IP address, browser and device type, and the time of
          the request. It&apos;s used to deliver the service, keep it secure and prevent abuse.
        </p>
        <h3>Information stored on your device</h3>
        <p>
          JustViet doesn&apos;t use advertising or tracking cookies, and we don&apos;t use analytics tools. Firebase
          stores a sign-in token in your browser so you stay logged in, and we store a few small preferences there (for
          example, that you dismissed a reminder). Our fonts are served from our own site, not loaded from a third
          party.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    body: (
      <>
        <ul>
          <li>To create and run your account, and to sign you in.</li>
          <li>To provide JustViet&apos;s features — scheduling your reviews, saving your dictionary words, tracking goals and XP.</li>
          <li>
            To send account emails you need, such as verifying your email address, resetting your password, or
            confirming an email change. We don&apos;t send marketing emails; if we ever offer a newsletter, it will be
            something you choose to join.
          </li>
          <li>To keep JustViet secure, prevent fraud and abuse, and fix problems.</li>
          <li>To answer you when you contact us.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p>
          <strong>We don&apos;t sell your personal information, we don&apos;t show ads, and we don&apos;t share your
          information for advertising.</strong>
        </p>
        <p>
          If you&apos;re in the European Economic Area, the UK or Switzerland, our legal bases are: providing the
          service you signed up for (contract); keeping JustViet secure and working well (our legitimate interests);
          complying with the law; and your consent where we ask for it.
        </p>
      </>
    ),
  },
  {
    id: "password-check",
    title: "Password safety check",
    body: (
      <p>
        When you choose a new password, JustViet checks whether it has appeared in known data breaches using the{" "}
        <a href="https://haveibeenpwned.com/Passwords" rel="noopener noreferrer" target="_blank">
          Have I Been Pwned
        </a>{" "}
        service. Your browser turns the password into a one-way code and sends only the first five characters of that
        code. Neither your password nor anything that could reveal it is sent, and nothing identifies you or your
        account.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share information with",
    body: (
      <>
        <p>We share information only with service providers that help us run JustViet, and only as needed:</p>
        <ul>
          <li>
            <strong>Google (Firebase Authentication and Cloud Firestore)</strong> — sign-in, account management and
            storage of your account and learning data, and sending account emails. See{" "}
            <a href="https://firebase.google.com/support/privacy" rel="noopener noreferrer" target="_blank">
              Firebase&apos;s privacy information
            </a>
            .
          </li>
          <li>
            <strong>Our website hosting provider</strong> — delivers the website to your browser.
          </li>
          <li>
            <strong>Have I Been Pwned</strong> — the password check described above, which receives no personal
            information.
          </li>
        </ul>
        <p>
          We may also disclose information if the law requires it, to protect the rights, safety or property of our
          users or others, or as part of a merger, sale or reorganization of our business (in which case this policy
          would continue to protect your information).
        </p>
      </>
    ),
  },
  {
    id: "coming-features",
    title: "Features we're planning",
    body: (
      <>
        <p>We&apos;re working on new features. Before any of these launch, we&apos;ll update this policy to explain exactly what&apos;s involved:</p>
        <ul>
          <li>
            <strong>Community:</strong> a space to ask questions and answer each other. What you post there — and your
            community display name — will be visible to other signed-in members.
          </li>
          <li>
            <strong>Paid plans:</strong> a monthly subscription with a free trial. Payments will be handled by a
            payment provider or by Apple&apos;s or Google&apos;s app stores; we won&apos;t store your full card number.
          </li>
          <li>
            <strong>Mobile apps:</strong> iPhone and Android apps that use the same account.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <>
        <p>
          We keep your account and learning data for as long as your account exists, so your progress is there when
          you come back. If you ask us to delete your account, we&apos;ll delete your personal information within 30
          days, except for anything we must keep to meet legal obligations, resolve disputes or prevent abuse. Copies in
          our providers&apos; backups and logs are removed on their normal schedules.
        </p>
        <p>
          A &ldquo;Delete my account&rdquo; button is coming to the app&apos;s settings. Until then, email <Mail /> from
          the address on your account and we&apos;ll take care of it.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: (
      <>
        <ul>
          <li>
            <strong>See and change your information:</strong> your name, email and password are in the app&apos;s
            Settings, and your cards and dictionary words can be edited or deleted any time.
          </li>
          <li>
            <strong>Get a copy, correct, or delete:</strong> email <Mail /> and we&apos;ll respond within 30 days. We
            may need to confirm the request comes from the account&apos;s owner.
          </li>
          <li>
            <strong>Object or withdraw consent:</strong> where we rely on legitimate interests or consent, you can
            object or withdraw at any time.
          </li>
        </ul>
        <p>
          Depending on where you live (for example in the EEA, the UK, or US states such as California), you may have
          further rights under local law — including to access, correct, delete or move your data, to restrict or
          object to its use, and not to be treated differently for using these rights. We honor these requests from
          everyone, wherever they live. If you&apos;re in the EEA or UK, you can also complain to your local data
          protection authority.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        JustViet isn&apos;t directed to children under 13, and we don&apos;t knowingly collect personal information from
        them. If you&apos;re under 13, please don&apos;t create an account. If you&apos;re between 13 and 18, please
        use JustViet with a parent or guardian&apos;s permission. If you believe a child under 13 has given us personal
        information, contact us at <Mail /> and we&apos;ll delete it.
      </p>
    ),
  },
  {
    id: "security",
    title: "How we protect your information",
    body: (
      <p>
        Your connection to JustViet is encrypted (HTTPS), and Google encrypts the data it stores for us. Our database
        rules only allow each account to read and change its own data. No system is perfectly secure, so please use a
        strong, unique password — JustViet will help you pick one.
      </p>
    ),
  },
  {
    id: "international",
    title: "Where your information is processed",
    body: (
      <p>
        {SITE.operator} is based in the United States, and our service providers may store and process information in
        the United States and other countries where they operate. Where the law requires it, we rely on appropriate
        safeguards for these transfers, such as the standard contractual clauses our providers offer.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We&apos;ll update this policy when JustViet changes — for example, before launching the features above. The
        &ldquo;Last updated&rdquo; date at the top shows when it last changed. If we make important changes, we&apos;ll
        tell you in the app or by email before they take effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        {SITE.operator}, {SITE.jurisdiction}. Email: <Mail />. You can also read our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated={SITE.privacyUpdated}
      summary={
        <>
          <p className="font-bold text-ink-900">The short version</p>
          <ul>
            <li>We collect what we need to run JustViet: your account details and your learning progress.</li>
            <li>No ads, no tracking cookies, no analytics, and we never sell your information.</li>
            <li>Your data is stored with Google Firebase, and only your account can access it.</li>
            <li>You can see, change or delete your information — just ask.</li>
          </ul>
        </>
      }
      sections={sections}
    />
  );
}
