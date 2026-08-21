import { PUBLIC_URLS, SUPPORT_EMAIL } from './contact';
import type { LegalDocument } from './types';

/**
 * The three pages that answer "what can I actually do about my data, and who do I talk to".
 *
 * These are the ones that most often become dead ends -- a Data Choices page whose only content is
 * "contact us" and a Contact page with no way to make contact. Each route named below is a screen
 * that exists in this app today. Where a channel does NOT exist yet, it is named as missing rather
 * than dressed up as a button.
 */

export const DATA_CHOICES: LegalDocument = {
  id: 'data-choices',
  title: 'Data & Privacy Choices',
  summary: 'What you can see, change, export and delete',
  version: 'data-choices-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: false,
  sections: [
    {
      heading: 'See and correct your information',
      body: [
        'Your profile — name, email, phone, city and state — is in Settings, and you can edit any of it there.',
        'Your documents are listed in Documents, where you can see what Zoey has received and what it was used for.',
        'Your scores and case history are in Credit Score and Disputes.',
        'If something in your credit report is wrong, correcting it in Zoey is not the fix — that information comes from the bureaus, and changing it takes a dispute.',
      ],
    },
    {
      heading: 'Choose what Zoey sends you',
      body: [
        'Notification preferences are in Settings. Zoey does not currently send push notifications, and your saved preferences will apply if and when it does.',
      ],
    },
    {
      heading: 'Get a copy of your information',
      body: [
        `You can ask for a copy of the information Zoey holds about you by emailing ${SUPPORT_EMAIL}, or by asking your specialist in the app. There is no self-service export button yet, and this page will say so until there is one.`,
      ],
      counselNote:
        'Counsel to confirm response deadlines, identity-verification requirements and the required format for portability requests once applicable privacy regimes are determined. A self-service export is a product decision that has not been made.',
    },
    {
      heading: 'Delete your account',
      body: [
        'Delete Account is in Settings, at the bottom of the Security & privacy section. It is available at any time and does not require emailing anyone or asking permission — use it rather than writing in.',
        'What deletion covers, and the limited records kept afterwards, are described on the Account Deletion page.',
      ],
    },
    {
      heading: 'Ask a question about your privacy',
      body: [
        `Questions about how your information is handled, requests to access or correct it, and questions about deletion can be sent to Pinnacle support at ${SUPPORT_EMAIL}.`,
        'You can also raise any of these with your specialist in Zoey Chat or Credit Services, whichever is easier.',
      ],
      contactEmail: SUPPORT_EMAIL,
    },
  ],
};

export const ACCOUNT_DELETION: LegalDocument = {
  id: 'account-deletion',
  title: 'Account Deletion',
  summary: 'What deleting your account does, and what is kept',
  version: 'account-deletion-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: false,
  sections: [
    {
      heading: 'How to delete your account',
      body: [
        'Open Settings, scroll to Security & privacy, and choose Delete account. You will be asked to confirm twice, because this cannot be undone.',
        'You do not need to email anyone, call anyone, or ask permission.',
      ],
    },
    {
      heading: 'What deletion removes',
      body: [
        'Your credit records: the reports you uploaded, the accounts and scores read from them, and the case history built from them.',
        'Your documents: your identity documents, supporting evidence and correspondence, removed from storage.',
        'Your profile: your name, contact details, goals, notification preferences and app data.',
        'Your sign-in: the credentials and identity used to sign in to Zoey, so the account can no longer be accessed.',
        'After deletion, signing in with the old account is no longer possible, and an existing session cannot be used to bring the account back.',
      ],
    },
    {
      heading: 'What is kept, and why',
      body: [
        'A limited amount of information is kept after deletion. This is deliberate, and it is worth being precise about rather than glossing over.',
        'Records of correspondence actually sent on your behalf are kept. Once a letter has been mailed to a credit bureau or a company, that it was sent is a fact about the outside world, and the record of it may be needed for legal and recordkeeping obligations.',
        'A small amount of security information is kept in a limited form, so that a deleted account cannot be silently recreated and so that abuse can be prevented. It is kept in the most limited form that still serves that purpose.',
        'Information required to be retained by law is kept for as long as the law requires.',
        'Zoey does not tell you that everything is instantly erased forever, because that would not be true. What is above is what actually happens.',
      ],
      counselNote:
        'FOR COUNSEL REVIEW. The retention categories described here reflect the implemented deletion process. Counsel to confirm the legal basis and retention periods for signed authorizations, mailed correspondence and security records, and to approve this consumer-facing wording before launch.',
    },
    {
      heading: 'Deleting the app is not deleting your account',
      body: [
        'Removing Zoey from your device does not delete your account or your information. Use Delete account in Settings.',
      ],
    },
    {
      heading: 'Questions about deletion',
      body: [
        `If you have a question about deleting your account, or about what is kept afterwards and why, email Pinnacle support at ${SUPPORT_EMAIL}.`,
        'You do not need to email anyone in order to delete your account — Delete account in Settings does it. This is for questions, not for making the deletion happen.',
      ],
      contactEmail: SUPPORT_EMAIL,
    },
  ],
};

export const CONTACT_SUPPORT: LegalDocument = {
  id: 'contact',
  title: 'Contact & Support',
  summary: 'How to reach a person about your case or your data',
  version: 'contact-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: true,
  sections: [
    {
      heading: 'Questions about your case',
      body: [
        'Zoey Chat is the fastest way to ask about something in your account, and it is available from the header on any main screen.',
        'Credit Services, in the More tab, is where your specialist and the status of your case live. Anything that needs a person rather than an answer goes there.',
      ],
    },
    {
      heading: 'Questions about your data or this policy',
      body: [
        'Privacy questions, requests for a copy of your information, and questions about deletion can be raised the same way, through Zoey Chat or Credit Services, and will be routed to the right person.',
      ],
    },
    {
      publicUrl: PUBLIC_URLS.support,
      heading: 'Email Pinnacle support',
      body: [
        `For help with your Zoey account, documents, credit information, privacy requests, or other questions, contact Pinnacle support at ${SUPPORT_EMAIL}.`,
        'Include the email address on your Zoey account so your message can be matched to your file. Never send your Social Security number, a password, or a full account number by email — upload documents in the app instead, where they go into private storage.',
      ],
      contactEmail: SUPPORT_EMAIL,
      /*
       * Kept deliberately short and consumer-readable, because counsel notes RENDER IN THE APP.
       *
       * The first draft of this note named an internal document path and described App Store
       * submission planning -- accurate, useful to us, and none of a consumer's business. Anything
       * written here is read by the person holding the phone; the operational detail about the
       * domain serving a catch-all page belongs in the internal worksheet, and lives there.
       */
      counselNote:
        'A public support page on the Pinnacle website is planned and is not live yet, so nothing here links to it. Email is the working channel in the meantime.',
    },
  ],
};
