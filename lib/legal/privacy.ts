import { PUBLIC_URLS, SUPPORT_EMAIL } from './contact';
import type { LegalDocument } from './types';

/**
 * The Privacy Policy, written from the implementation rather than from a template.
 *
 * Every category below was confirmed by reading the code that stores it: the document types the
 * upload flow accepts, the fields the profile endpoint persists, the context the chat model is
 * given, and the processors named in the dependency and environment configuration. Nothing is
 * listed because it is customary, and nothing customary was left out because it was awkward.
 *
 * The two sentences most privacy policies get wrong are both here deliberately. Zoey does NOT say
 * your data is never shared, because service providers necessarily receive it in order to run the
 * product -- storing a file, sending a letter, answering a chat message. And Zoey does NOT promise
 * that deletion erases every last trace, because the deletion process intentionally keeps a small
 * amount of security and compliance information. Saying either of those would be the easy version
 * and the false one.
 */

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  summary: 'What Zoey collects, why, who processes it, and how deletion works',
  version: 'privacy-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: true,
  sections: [
    {
      publicUrl: PUBLIC_URLS.privacy,
      heading: 'The short version',
      body: [
        'Zoey collects the information needed to review your credit reports and help you prepare disputes. That includes sensitive things: your credit reports, your government ID, and in some cases a Social Security card document.',
        'Zoey does not sell your personal information. Zoey does use service providers to run the product, and those providers necessarily handle your information in order to do their part. Those are different things, and this policy keeps them separate.',
        'You can delete your account from Settings at any time.',
      ],
    },
    {
      heading: 'Information you give us',
      body: [
        'Account and sign-in information: your email address, and the password or third-party sign-in you use to access Zoey.',
        'Profile and contact details: your first and last name, email, phone number, and city and state.',
        'Credit reports: the credit report files you upload, and the account, balance, status, inquiry and personal-information details contained in them.',
        'Credit scores: scores read from the reports or data sources you provide, along with the bureau, model and date they came from.',
        'Identity documents: a government-issued photo ID, a Social Security card document, and proof of address, where these are needed to verify your identity with a credit bureau.',
        'Supporting evidence and correspondence: documents you send in support of a dispute, and bureau or creditor letters you receive and upload.',
        'Signatures and consents: the acknowledgment or authorization you sign, together with the date and the version of what you signed.',
        'Mailing information: the name and postal address used on correspondence sent on your behalf.',
        'Zoey Chat content: the messages you send in Zoey Chat, and the replies.',
        'Goals you set, and any notes you add to them.',
      ],
    },
    {
      heading: 'Information collected automatically',
      body: [
        'Technical information about your device and the app, such as app version, operating system, and general device type, along with logs and error reports generated when the app talks to Zoey’s servers.',
        'Standard request information such as IP address, which is used for security purposes including rate limiting and abuse prevention.',
        'Zoey does not use third-party advertising or cross-app tracking software, and does not track you across other companies’ apps or websites.',
      ],
    },
    {
      heading: 'Push notification tokens',
      body: [
        'Zoey does not currently send push notifications and does not collect push notification tokens. Your notification preferences are stored, but no delivery token exists because no delivery service is connected.',
        'If push notifications are added, this policy will be updated to say what is collected before any token is registered.',
      ],
    },
    {
      heading: 'How Zoey uses this information',
      body: [
        'To create and secure your account, and to verify that you are the person the credit information belongs to.',
        'To read and organise your credit reports so you can see what is being reported about you.',
        'To help prepare, review and track disputes, including preparing correspondence and sending it where you have authorized that.',
        'To answer your questions in Zoey Chat.',
        'To operate, secure and troubleshoot the service, including preventing fraud and abuse.',
        'To meet legal, regulatory and recordkeeping obligations that apply to this kind of service.',
      ],
    },
    {
      heading: 'Service providers who process your information',
      body: [
        'Zoey relies on other companies to run parts of the product. They receive only what they need for their part, and they act on Zoey’s instructions rather than for their own purposes.',
        'Identity and authentication: Supabase, which stores your sign-in credentials and issues the session that proves who you are.',
        'Hosting, compute and file storage: Vercel, which runs Zoey’s servers and stores uploaded documents in private storage.',
        'Database and cache hosting: a managed database provider that stores your account records, case records and profile.',
        'AI processing: OpenAI, which receives a limited summary of your case and your chat messages in order to generate Zoey Chat replies. It is not given your uploaded documents.',
        'Physical mail: Lob, which prints and mails dispute correspondence, and therefore receives the letter and the addresses on it, when you have authorized mailing.',
        'This is not the same as selling your information, and none of these providers are permitted to use it to market to you.',
      ],
      counselNote:
        'Counsel and operations to confirm the final subprocessor list, each provider’s legal entity name, and whether a public subprocessor page or advance-notice commitment is appropriate before launch.',
    },
    {
      heading: 'When else information is shared',
      body: [
        'With credit bureaus, furnishers, creditors and collectors, when you authorize a dispute or correspondence to be sent. This is the point of the service: a dispute cannot be filed without sending it.',
        'With your Pinnacle specialist and authorized staff, who review your case and approve correspondence before it goes out. Access is limited to the people who need it for that work.',
        'When required by law, such as in response to a valid legal request, or where necessary to protect the rights, safety or property of you, Zoey, or others.',
        'If the business is ever involved in a merger, acquisition or sale of assets, your information could be transferred as part of that transaction. You would be told before your information became subject to a different privacy policy.',
      ],
    },
    {
      heading: 'Zoey does not sell your personal information',
      body: [
        'Zoey does not sell your personal information, and does not share it for cross-context behavioural advertising.',
        'Some privacy laws define "selling" and "sharing" broadly enough to include arrangements that do not involve money. Zoey has no such arrangement. If that ever changes, this policy will be updated and you will be given the choices the law requires before the change takes effect.',
      ],
    },
    {
      heading: 'How your information is protected',
      body: [
        'Uploaded documents are stored in private storage that is not publicly accessible and cannot be reached by a shareable link.',
        'Access to your records requires an authenticated session belonging to your account. Requests are scoped to you, so one consumer’s records cannot be returned to another.',
        'Responses containing your personal information are marked private and are not cached by browsers or intermediate networks.',
        'Sign-in attempts and sensitive operations are rate limited to make credential-guessing and abuse impractical.',
        'No security measure is perfect, and Zoey does not claim otherwise. What is described here is what is in place, not a guarantee that nothing can go wrong.',
      ],
    },
    {
      heading: 'How long information is kept',
      body: [
        'Your account information and case records are kept while your account is open, and for as long as needed to provide the service.',
        'When you delete your account, Zoey deletes your credit records, documents, case history, profile and sign-in credentials through the deletion process described in the Account Deletion page.',
        'A limited amount of information is kept after deletion where it is needed for security, fraud prevention, or to meet legal and recordkeeping obligations. This includes records of correspondence that was actually sent on your behalf, and a small amount of information used to prevent a deleted account from being silently recreated. It is kept in the most limited form that still serves that purpose.',
        'Zoey does not claim that deletion erases every trace of you everywhere. Where something is retained, the reason is one of the ones named above.',
      ],
      counselNote:
        'Counsel to set the retention schedule and the specific retention periods for signed authorizations, mailed correspondence and audit records, and to confirm the post-deletion retention wording. The retention description here reflects the current implementation, not an approved legal policy.',
    },
    {
      heading: 'Your choices',
      body: [
        'You can view and correct your profile information in Settings.',
        'You can change your notification preferences in Settings at any time.',
        'You can delete your account, and everything the deletion process covers, from Settings.',
        `You can ask questions about your information, ask for a copy of it, or ask about correction or deletion by emailing Pinnacle support at ${SUPPORT_EMAIL}, or by contacting your specialist in the app.`,
        'Depending on where you live, you may have additional rights over your personal information, such as rights to access, correct, delete, or obtain a portable copy, and a right not to be discriminated against for exercising them.',
      ],
      contactEmail: SUPPORT_EMAIL,
      counselNote:
        'Counsel to determine which state and federal privacy regimes apply, and to supply the required rights descriptions, verification procedure, response deadlines, appeal process and any authorized-agent language. No jurisdiction-specific rights have been drafted here.',
    },
    {
      heading: 'Children',
      body: [
        `Zoey is built for adults managing their own credit and is not directed to children. Zoey does not knowingly collect personal information from anyone under 18. If you believe a minor has provided information, email ${SUPPORT_EMAIL} and it will be removed.`,
      ],
    },
    {
      heading: 'How to contact us about this policy',
      body: [
        `Questions about this policy, or about how your information is handled, go to Pinnacle support at ${SUPPORT_EMAIL}.`,
      ],
      contactEmail: SUPPORT_EMAIL,
    },
    {
      heading: 'Changes to this policy',
      body: [
        'If this policy changes in a way that matters, the version and effective date shown here will change and you will be told in the app before the change takes effect where that is required.',
        'This version is a draft prepared from how Zoey actually works. It has not yet been reviewed by an attorney, and the sections marked for review are the ones that need that review most.',
      ],
    },
  ],
};
