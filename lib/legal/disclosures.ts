import type { LegalDocument } from './types';

/**
 * The three disclosures specific to what Zoey actually is: an AI-assisted tool that reads credit
 * information and helps prepare disputes.
 *
 * Every limit stated here is a limit the software genuinely has. The AI disclosure describes the
 * chat model's real boundaries -- it receives a sanitized context and has no tools, no database
 * access and no authority to send anything -- rather than a generic "AI may be wrong" notice. The
 * credit disclaimer describes real sources of divergence between what Zoey shows and what a lender
 * sees. The dispute disclosure describes the guardrails the dispute engine already enforces.
 *
 * Writing them from the implementation is the only way they stay true as the product changes: if
 * one of these sentences stops being accurate, the thing to fix is the sentence, and somebody has to
 * notice. A borrowed template would never have been true in the first place.
 */

export const AI_DISCLOSURE: LegalDocument = {
  id: 'ai-disclosure',
  title: 'AI Disclosure',
  summary: 'How Zoey uses AI, and what it cannot do',
  version: 'ai-disclosure-2026-08-20',
  effective: '2026-08-20',
  status: 'PUBLISHED',
  requiresPublicUrl: false,
  sections: [
    {
      heading: 'Zoey uses AI to help explain things',
      body: [
        'Zoey uses artificial intelligence to help explain information and provide general guidance. AI-generated responses may be incomplete or inaccurate. Important financial, credit, legal, or dispute decisions should be reviewed using the underlying records and, when appropriate, a qualified professional.',
        'Zoey Chat is informational and explanatory. It is there to help you understand what is in your account and what a step means, not to make decisions for you.',
      ],
    },
    {
      heading: 'What the AI can and cannot do',
      body: [
        'The AI does not generate an official credit score. Any score shown in Zoey comes from a credit report or data source you provided or connected, not from the AI.',
        'The AI does not independently mail, sign, or approve disputes. Those steps require review and the appropriate human approval and signature before anything is sent.',
        'The AI may summarize information available in your Zoey account. When it does, it is working from the records in your account, and it can misread or omit something.',
        'Important information should be verified against the underlying records. Your credit report, your letters, and your documents are the source of truth. Zoey Chat is not.',
      ],
    },
    {
      heading: 'What the AI is given',
      body: [
        'Zoey Chat receives a limited summary of your case and the conversation you are having. It is not given your full documents, and it cannot look anything up on its own or take actions in your account.',
        'This is a deliberate limit rather than a temporary one. A model that is never given a piece of information cannot repeat it by mistake.',
      ],
    },
    {
      heading: 'What Zoey is not',
      body: [
        'Zoey is not a law firm, a lender, a credit bureau, a financial advisor, or a tax advisor, and it is not an attorney. Zoey does not provide legal, lending, tax, or investment advice.',
        'Nothing the AI says is certified advice, and no answer it gives should be treated as final or authoritative on its own.',
      ],
    },
    {
      heading: 'Tell us when it gets something wrong',
      body: [
        'If Zoey explains something in a way that does not match your records, trust your records and let your specialist know. Reports of wrong answers are how the limits above get narrower over time.',
      ],
    },
  ],
};

export const CREDIT_INFORMATION_DISCLAIMER: LegalDocument = {
  id: 'credit-information',
  title: 'Credit Information Disclaimer',
  summary: 'Why Zoey’s scores and report details may differ from a lender’s',
  version: 'credit-information-2026-08-20',
  effective: '2026-08-20',
  status: 'PUBLISHED',
  requiresPublicUrl: false,
  sections: [
    {
      heading: 'Where this information comes from',
      body: [
        'Credit scores, report information and account details shown in Zoey are based on the reports or data sources available to Zoey and may differ from information or scores used by a lender, creditor, credit bureau or other provider.',
        'Zoey is not a credit bureau and does not issue credit reports or credit scores.',
      ],
    },
    {
      heading: 'Why numbers differ',
      body: [
        'There are many credit scoring models, and different lenders use different ones. Two scores calculated on the same day from the same report can differ simply because the models differ.',
        'Scores also differ by bureau, because the three bureaus do not always hold identical information, and by date, because a report is a snapshot of one moment.',
        'A lender may also use information Zoey has never seen, including its own records about you.',
      ],
    },
    {
      heading: 'What is not promised',
      body: [
        'No score increase is guaranteed.',
        'No deletion or removal of any item is guaranteed.',
        'No credit approval is guaranteed.',
        'No funding is guaranteed.',
        'No timeline is guaranteed. How long anything takes depends on the bureaus, furnishers and other parties involved, not on Zoey.',
        'Anyone who promises you a specific credit outcome for a fee is making a promise they cannot keep. Zoey does not make that promise.',
      ],
    },
    {
      heading: 'Old and missing information',
      body: [
        'When Zoey does not have current information from a bureau, it says so rather than filling the gap. Information that is out of date is labelled with when it was captured, and information Zoey does not have is shown as unavailable rather than as zero or as good news.',
        'If something in Zoey looks wrong or looks stale, check it against your most recent report from the bureau.',
      ],
    },
  ],
};

export const DISPUTE_SERVICES_DISCLOSURE: LegalDocument = {
  id: 'dispute-services',
  title: 'Credit & Dispute Services Disclosure',
  summary: 'What the dispute process is, and what it depends on',
  version: 'dispute-services-2026-08-20',
  effective: '2026-08-20',
  status: 'DRAFT_PENDING_COUNSEL',
  requiresPublicUrl: false,
  sections: [
    {
      heading: 'What Zoey does',
      body: [
        'Zoey helps you review the information on your credit reports so you can see what is being reported about you and understand what it means.',
        'Where a dispute is appropriate, Zoey may help you prepare and manage supported dispute workflows, including preparing letters and keeping track of what has been sent and what has come back.',
        'You decide what to dispute. Zoey prepares and organises; it does not dispute on your behalf without your review and approval.',
      ],
    },
    {
      heading: 'Dispute what you actually believe is wrong',
      body: [
        'You should dispute information you genuinely believe is inaccurate, incomplete, unverifiable where legally relevant, or otherwise appropriately challenged.',
        'Zoey does not manufacture facts, and it will not help you build a dispute around something you know to be true.',
        'Zoey does not tell consumers to falsely claim fraud, identity theft, or lack of authorization. Claiming any of those things when they are not true can carry serious consequences for you, and Zoey will not assist with it.',
      ],
    },
    {
      heading: 'What the outcome depends on',
      body: [
        'Results depend on the facts, the evidence, and on the credit bureaus, furnishers, collectors and other parties involved. Those parties make their own decisions, and Zoey does not control them.',
        'A dispute can end with information corrected, removed, updated, or left exactly as it was. All of those are possible outcomes of a properly filed dispute.',
      ],
    },
    {
      heading: 'Things that are commonly claimed and are not true',
      body: [
        'Not every collection account must be deleted. A collection that is being reported accurately can stay.',
        'An original contract is not always legally required in order for information to be reported or verified.',
        'A missed response deadline does not automatically require deletion. What follows from a delay depends on the circumstances.',
        'A verification response is not automatically a legal violation. Bureaus and furnishers can and do verify information that turns out to be correct.',
        'Zoey builds disputes on what the records actually support. That is a slower story than the one sold by credit-repair advertising, and it is the one that holds up.',
      ],
    },
    {
      heading: 'Your rights are yours directly',
      body: [
        'You can dispute information on your credit reports yourself, directly with the credit bureaus and furnishers, at no cost. You do not need Zoey, or anyone else, in order to do it.',
        'What Zoey offers is help doing it in an organised way, with the records kept in one place.',
      ],
      counselNote:
        'Counsel to confirm required credit-services disclosures, notices and any cancellation-rights language for the states Pinnacle will operate in, and whether the company is subject to CROA or state credit-services-organization statutes. Nothing state-specific has been drafted here.',
    },
  ],
};
