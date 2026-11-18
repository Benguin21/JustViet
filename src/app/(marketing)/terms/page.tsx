import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using JustViet.",
  alternates: { canonical: "/terms" },
};

/*
 * A draft: have it reviewed before launch. When paid plans or the mobile
 * apps launch, revisit sections 8 and 9 and update SITE.termsUpdated.
 * Section 5 ("Your content") covers the Community and links /guidelines.
 */

const email = SITE.contactEmail;
const Mail = () => <a href={`mailto:${email}`}>{email}</a>;

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreeing to these terms",
    body: (
      <>
        <p>
          These Terms of Service are an agreement between you and {SITE.operator} (&ldquo;{SITE.name}&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;) for using the JustViet website, apps and services (together, &ldquo;JustViet&rdquo;).
          By creating an account or using JustViet, you agree to these terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use JustViet.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use JustViet",
    body: (
      <ul>
        <li>
          Learners of any age can use JustViet&apos;s learning features. If you&apos;re under 18 (or the age of
          majority where you live), you need a parent or guardian&apos;s permission, and they agree to these terms for
          you. If you&apos;re under 13, a parent or guardian should create your account and look after it.
        </li>
        <li>
          The Community is only for members 13 and older. Everyone is asked to confirm their age before joining it.
        </li>
        <li>You must give accurate information when you sign up, and an account is for one person.</li>
      </ul>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <p>
        Keep your password private and your email address up to date. You&apos;re responsible for what happens under
        your account. If you think someone else has accessed it, change your password in Settings and email us at{" "}
        <Mail />.
      </p>
    ),
  },
  {
    id: "using",
    title: "Using JustViet",
    body: (
      <>
        <p>
          We give you a personal, non-transferable permission to use JustViet for your own learning, as long as you
          follow these terms. Please don&apos;t:
        </p>
        <ul>
          <li>Break the law or anyone else&apos;s rights while using JustViet.</li>
          <li>Try to access other people&apos;s accounts or data, or get around our security or usage limits.</li>
          <li>
            Copy, scrape or bulk-download JustViet&apos;s content (such as the dictionary), or use it to build a
            competing product.
          </li>
          <li>Disrupt or overload the service, or use bots or automated tools to access it.</li>
          <li>Upload anything harmful, such as malware, or content that is unlawful, hateful or harassing.</li>
          <li>Resell or commercially exploit JustViet without our written permission.</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You own what you create in JustViet — like your flashcards, notes, personal dictionary words and community
          posts. You give us permission to store, process and display that content as needed to run JustViet for you
          and, for content you share in the Community, to show it to other signed-in members. You can delete your
          content at any time; deleting a community post permanently erases its text, though a &ldquo;deleted by its
          author&rdquo; placeholder may stay so that others&apos; replies still make sense.
        </p>
        <p>
          You&apos;re responsible for what you add, and you must have the right to share it. The Community is for
          members 13 and older, and everything you post there must follow our{" "}
          <Link href="/guidelines">Community Guidelines</Link>. We may remove content or limit accounts that break these
          terms or the guidelines. Other members&apos; posts are their own views, not ours, and may be wrong: check
          important things with a reliable source.
        </p>
      </>
    ),
  },
  {
    id: "our-content",
    title: "Our content",
    body: (
      <p>
        JustViet — including its dictionary, lessons, design, characters such as Rồng Con, Cô Tươi and Thầy Vinh, and
        the JustViet name and logo — belongs to {SITE.operator} or its licensors and is protected by intellectual
        property laws. These terms don&apos;t give you any rights to it beyond using JustViet as described here. If you
        send us feedback or ideas, we may use them freely.
      </p>
    ),
  },
  {
    id: "learning",
    title: "About the learning content",
    body: (
      <p>
        We work hard to make JustViet accurate, but language is complicated and mistakes happen. JustViet is a study
        tool, not a professional translation or interpreting service — please don&apos;t rely on it where a mistake
        could cause harm (for example, legal or medical matters). If you spot an error, we&apos;d love to hear about it.
      </p>
    ),
  },
  {
    id: "plans",
    title: "Free access, paid plans and free trials",
    body: (
      <>
        <p>
          <strong>JustViet is currently free.</strong> We plan to offer a paid monthly subscription in the future.
          Before it launches we&apos;ll update these terms and let you know, and you&apos;ll never be charged unless
          you choose to sign up for a paid plan. When paid plans are available, these rules will apply:
        </p>
        <ul>
          <li>
            <strong>Price:</strong> we&apos;ll show the price, including any taxes we&apos;re required to collect,
            before you subscribe.
          </li>
          <li>
            <strong>Free trial:</strong> a new subscription may start with a free trial. Unless you cancel before the
            trial ends, your subscription will begin and you&apos;ll be charged at the end of the trial. We&apos;ll
            tell you how long the trial lasts and when you&apos;ll be charged when you start it.
          </li>
          <li>
            <strong>Automatic renewal:</strong> subscriptions renew automatically each month and are charged to your
            payment method until you cancel.
          </li>
          <li>
            <strong>Cancelling:</strong> you can cancel at any time. You&apos;ll keep access until the end of the
            period you&apos;ve paid for, and you won&apos;t be charged again.
          </li>
          <li>
            <strong>Price changes:</strong> we&apos;ll give you advance notice of any price change, and you can cancel
            before it takes effect.
          </li>
          <li>
            <strong>Refunds:</strong> payments are non-refundable except where the law requires otherwise or we decide
            to make an exception.
          </li>
          <li>
            <strong>App store purchases:</strong> if you subscribe in our iPhone or Android app, Apple or Google
            processes the payment, and their terms govern billing, cancellation (in your device&apos;s subscription
            settings) and refunds.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Other services",
    body: (
      <p>
        JustViet works with services from other companies, such as Sign in with Google and, later, Apple&apos;s and
        Google&apos;s app stores. Your use of those services is also covered by their own terms, and we aren&apos;t
        responsible for them.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to JustViet and these terms",
    body: (
      <p>
        JustViet will keep changing: we may add, change or remove features. We may also update these terms. If we make
        important changes, we&apos;ll tell you in the app or by email before they take effect. Continuing to use
        JustViet after that means you accept the updated terms; if you don&apos;t agree, you can stop using JustViet
        and delete your account.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending your use of JustViet",
    body: (
      <p>
        You can stop using JustViet at any time and ask us to delete your account by emailing <Mail /> (an in-app
        option is coming). We may suspend or close accounts that seriously or repeatedly break these terms, or where
        we&apos;re required to by law; where reasonable, we&apos;ll tell you first. Sections that should naturally
        continue after an account ends — such as ownership, disclaimers and limits of liability — will continue.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        We provide JustViet &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the law allows, we
        don&apos;t make promises beyond those in these terms — including that JustViet will always be available, free
        of errors, or meet a particular goal such as passing an exam. Some places don&apos;t allow certain
        disclaimers, so some of these may not apply to you.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limits on our liability",
    body: (
      <p>
        To the fullest extent the law allows, {SITE.operator} won&apos;t be liable for indirect, incidental, special,
        consequential or punitive damages, or for lost data, profits or revenue, arising from your use of JustViet. Our
        total liability for any claim relating to JustViet is limited to the greater of the amount you paid us in the
        12 months before the claim, or US$50. These limits don&apos;t apply where the law doesn&apos;t allow them, and
        nothing in these terms limits rights you have as a consumer that can&apos;t be waived.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These terms are governed by the laws of the State of {SITE.governingLawState}, USA, without regard to its
        conflict-of-law rules. If you have a concern, please email us first at <Mail /> — most issues can be solved
        quickly. Any dispute that can&apos;t be resolved informally will be handled in the state or federal courts
        located in {SITE.governingLawState}, and you and we agree to their jurisdiction. If you live in a country whose
        laws give you the right to bring a claim in your local courts or under your local law, nothing here takes
        that right away.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <p>
        These terms and our Privacy Policy are the whole agreement between you and us about JustViet. If part of these
        terms can&apos;t be enforced, the rest still applies. If we don&apos;t enforce something right away, we
        haven&apos;t given up the right to do so later. You can&apos;t transfer your rights under these terms; we may
        transfer ours as part of a merger, sale or reorganization.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        {SITE.operator}, {SITE.jurisdiction}. Email: <Mail />.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated={SITE.termsUpdated}
      summary={
        <>
          <p className="font-bold text-ink-900">The short version</p>
          <ul>
            <li>
              Anyone can learn with JustViet; under 18 with a parent&apos;s permission. The Community is for members 13
              and older.
            </li>
            <li>Use JustViet for your own learning, and be kind — don&apos;t misuse it or copy our content.</li>
            <li>You own what you create. We own JustViet&apos;s content and design.</li>
            <li>JustViet is free right now. If paid plans arrive, you&apos;ll only pay if you choose to subscribe.</li>
          </ul>
        </>
      }
      sections={sections}
    />
  );
}
