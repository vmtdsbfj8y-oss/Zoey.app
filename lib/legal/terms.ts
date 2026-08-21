import { SUPPORT_EMAIL } from './contact';
import type { LegalDocument } from './types';

/**
 * Terms of Use -- a structured draft, with the lawyer-shaped holes left open rather than filled in.
 *
 * The sections a template would supply most confidently are exactly the ones missing here:
 * limitation of liability, warranty disclaimers, governing law, venue, arbitration and class-action
 * waiver. Those are choices a company makes with counsel, and inventing them would produce a
 * document that looks finished, reads as authoritative, and binds nobody -- the worst of the three
 * possible outcomes.
 *
 * A disclaimer does not make a company lawsuit-proof, and nothing in this document is written as
 * though it does. What terms can honestly do is set expectations, describe the service accurately,
 * and state what the consumer is responsible for. That is what this draft tries to do well.
 */

export const TERMS_OF_USE: LegalDocument = {
  id: 'terms',
  title: 'Terms of Use',
  summary: 'The agreement between you and Zoey — draft, pending legal review',
  version: 'terms-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: true,
  sections: [
    {
      heading: 'Who can use Zoey',
      body: [
        'You must be at least 18 years old and able to enter into a contract to use Zoey.',
        'You may only use Zoey for your own credit information. Do not create an account to review or dispute someone else’s credit, even with their permission, unless Zoey has explicitly provided a way to do that.',
        'You are responsible for your account, for keeping your sign-in credentials private, and for activity that happens under your account. Tell us promptly if you think someone else has access to it.',
      ],
    },
    {
      heading: 'What Zoey is',
      body: [
        'Zoey is a tool for reviewing your credit information and preparing and managing supported dispute workflows, with help from a Pinnacle specialist.',
        'Zoey provides educational and informational tools and is not a law firm, lender, credit bureau, financial advisor or tax advisor. Information provided through Zoey is not legal, lending, tax or investment advice.',
        'Zoey is not a credit bureau, does not issue credit reports or scores, and does not make lending decisions.',
      ],
    },
    {
      heading: 'You must give truthful information',
      body: [
        'The information you give Zoey, and the statements made in disputes prepared through Zoey, must be truthful and accurate to the best of your knowledge.',
        'Do not use Zoey to claim that something is fraudulent, was identity theft, or was unauthorized, if that is not true. Do not submit forged, altered or borrowed documents.',
        'Disputes are sent to credit bureaus and to the companies reporting the information. Knowingly false statements in them can have consequences for you that Zoey cannot undo.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        'Use Zoey for its intended purpose. Do not attempt to access another person’s account or data, probe or interfere with the security of the service, scrape or bulk-extract data, upload malicious files, or use automated systems to hammer the service.',
        'Do not resell, sublicense or repackage Zoey or its output as your own service.',
        'Accounts engaged in abuse, fraud, or activity that puts other consumers or the service at risk may be suspended or terminated.',
      ],
    },
    {
      heading: 'AI features',
      body: [
        'Zoey uses artificial intelligence to help explain information and provide general guidance. AI-generated responses may be incomplete or inaccurate, and should be checked against the underlying records.',
        'The AI does not generate an official credit score and does not independently mail, sign or approve disputes.',
        'The full AI Disclosure is part of these terms.',
      ],
    },
    {
      heading: 'Credit information and outcomes',
      body: [
        'Credit scores, report information and account details shown in Zoey are based on the reports or data sources available to Zoey and may differ from information or scores used by a lender, creditor, credit bureau or other provider.',
        'No score increase, deletion, removal, approval, funding or timeline is guaranteed. Outcomes depend on the facts, the evidence, and on bureaus, furnishers and other parties Zoey does not control.',
        'The full Credit Information Disclaimer and Credit & Dispute Services Disclosure are part of these terms.',
      ],
    },
    {
      heading: 'Third-party services and data',
      body: [
        'Zoey relies on third-party providers for hosting, storage, authentication, AI processing and physical mail, and on credit data that originates with credit bureaus and the companies that report to them.',
        'Zoey is not responsible for the accuracy of information that originates with a credit bureau or a furnisher, and cannot control the decisions those parties make about a dispute.',
        'Third-party services may be interrupted or changed in ways that affect Zoey.',
      ],
    },
    {
      heading: 'Membership and payment',
      body: [
        'Some Zoey features are part of a paid membership. The price, billing period and what is included are shown before you purchase, and those terms apply to your purchase.',
        'Where a membership is purchased through the Apple App Store, billing, renewal and refunds are handled by Apple under Apple’s terms, and you manage or cancel the subscription in your Apple account settings.',
      ],
      counselNote:
        'Placeholder appropriate to the current launch plan. Counsel and the company to supply final pricing, billing-cycle, auto-renewal, free-trial, refund and cancellation terms once the launch commercial model is fixed, together with any state-required cancellation rights and notices.',
    },
    {
      heading: 'Cancelling and ending your account',
      body: [
        'You can stop using Zoey at any time, and you can delete your account from Settings.',
        'Deleting your account ends your access. Some records are retained after deletion as described in the Privacy Policy and the Account Deletion page.',
        'Zoey may suspend or end an account that violates these terms, or where required by law.',
      ],
    },
    {
      heading: 'Intellectual property',
      body: [
        'Zoey, including the app, its design, and the software behind it, belongs to the company and is protected by intellectual property law. These terms do not transfer ownership of any of it to you.',
        'Your documents and your information remain yours. You give Zoey permission to use them only as needed to provide the service to you, as described in the Privacy Policy.',
      ],
    },
    {
      heading: 'Availability',
      body: [
        'Zoey is provided as an ongoing service and may be updated, interrupted for maintenance, or changed over time. Features may be added, altered or removed.',
        'Zoey does not promise uninterrupted or error-free operation.',
      ],
    },
    {
      heading: 'Warranties and limitation of liability',
      body: [
        'This section has not been drafted and is not in effect.',
      ],
      counselNote:
        'FOR COUNSEL REVIEW. Warranty disclaimers and any limitation or exclusion of liability must be drafted by counsel. They have deliberately not been invented here. Note also that disclaimers do not make the company immune from suit and their enforceability varies by jurisdiction and by claim.',
    },
    {
      heading: 'Governing law and disputes between you and us',
      body: [
        'This section has not been drafted and is not in effect.',
      ],
      counselNote:
        'FOR COUNSEL REVIEW. Governing law, venue, and any arbitration agreement or class-action waiver must be selected by the company with counsel. No arbitration clause, class-action waiver, governing-law choice or venue has been fabricated here, and none should be added without counsel.',
    },
    {
      heading: 'How to contact us',
      body: [
        `Questions about these terms, your account, or the service go to Pinnacle support at ${SUPPORT_EMAIL}.`,
        'If you think someone else has access to your account, use the same address and say so in the subject line.',
      ],
      contactEmail: SUPPORT_EMAIL,
    },
    {
      heading: 'Changes to these terms',
      body: [
        'If these terms change in a way that matters, the version and effective date shown here will change, and you will be told in the app before the change takes effect where that is required.',
        'This version is a draft prepared from how Zoey actually works. It has not been reviewed by an attorney.',
      ],
    },
  ],
};
