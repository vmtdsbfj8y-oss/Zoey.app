import type { Resource } from './types';

/**
 * ENGLISH — the canonical source.
 *
 * Every key is defined here first. Spanish is a translation OF this file, and the parity test fails
 * if the two ever diverge in key set. Brand names are never keys and never translated: Zoey,
 * Pinnacle Capital, Equifax, Experian, TransUnion, IdentityIQ and Apple appear verbatim in both
 * languages.
 *
 * What is deliberately NOT here: anything the consumer or a bureau supplied. Creditor names, account
 * references, addresses, uploaded document contents and report values are evidence, not copy, and
 * translating them would corrupt the record.
 */
export const en: Resource = {
  /* ---------------------------------------------------------------- common */
  'common.cancel': 'Cancel',
  'common.continue': 'Continue',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.saved': 'Saved',
  'common.retry': 'Try again',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.notSet': 'Not set',
  'common.loading': 'Loading…',
  'common.learnMore': 'Learn more',
  'common.notAvailableYet': 'Not available yet',
  'common.unavailable': 'Unavailable',

  /* ------------------------------------------------------------- language */
  'language.title': 'Language',
  'language.subtitle': 'Choose how Zoey speaks to you',
  'language.english': 'English',
  'language.spanish': 'Español',
  'language.chooseTitle': 'Choose your language',
  'language.chooseBody': 'You can change this at any time in Settings.',
  'language.changed': 'Language updated',
  'language.a11ySelect': 'Select {language}',
  'language.a11ySelected': '{language}, selected',
  'language.documentNote':
    'This document is shown in English. A Spanish translation is being reviewed by a bilingual attorney before launch.',

  /* ------------------------------------------------------------------ tabs */
  'tabs.home': 'Home',
  'tabs.creditScore': 'Credit Score',
  'tabs.documents': 'Documents',
  'tabs.disputes': 'Disputes',
  'tabs.more': 'More',

  /* --------------------------------------------------------------- welcome */
  'welcome.getStarted': 'Get Started',
  'welcome.signIn': 'I already have an account',

  /* ------------------------------------------------------------------ auth */
  'auth.welcomeTitle': 'Welcome to Zoey',
  'auth.signInMode': 'Sign in',
  'auth.createMode': 'Create account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signInButton': 'Sign In Securely',
  'auth.createButton': 'Create My Account',
  'auth.forgotPassword': 'Forgot password?',
  'auth.checkInfoTitle': 'Check your information',
  'auth.checkInfoBody': 'Enter a valid email and a password with at least 8 characters.',
  'auth.acceptRequiredTitle': 'One more thing',
  'auth.acceptRequiredBody': 'Please read and accept the Terms of Use and Privacy Policy to create an account.',
  'auth.acceptPrefix': 'I have read and agree to the',
  'auth.acceptTerms': 'Terms of Use',
  'auth.acceptAnd': 'and',
  'auth.acceptPrivacy': 'Privacy Policy',
  'auth.acceptA11y': 'Accept the Terms of Use and Privacy Policy',
  'auth.verifyEmailTitle': 'Check your email',
  'auth.verifyEmailBody': 'Open Zoey’s verification email before signing in.',
  'auth.unableTitle': 'Unable to continue',
  'auth.unableBody': 'Please try again.',
  'auth.resetSentTitle': 'Check your email',
  'auth.resetSentBody': 'We sent a secure password-reset link.',
  'auth.resetFailedTitle': 'Unable to send reset email',
  'auth.enterEmailFirst': 'Enter your email first',
  'auth.legalLink': 'Legal & Privacy',
  'auth.newPasswordTitle': 'Choose a new password',
  'auth.newPasswordPlaceholder': 'New password',
  'auth.openingResetLink': 'Opening secure reset link…',
  'auth.updatePassword': 'Update password',

  /* ------------------------------------------------------------- settings */
  'settings.title': 'Settings',
  'settings.personalInformation': 'Personal information',
  'settings.loadingSettings': 'Loading your settings…',
  'settings.firstName': 'First name',
  'settings.lastName': 'Last name',
  'settings.email': 'Email',
  'settings.phone': 'Phone',
  'settings.city': 'City',
  'settings.state': 'State',
  'settings.saveChanges': 'Save changes',
  'settings.couldNotSave': 'Could not save.',
  'settings.securityPrivacy': 'Security & privacy',
  'settings.passwordSignIn': 'Password & sign-in',
  'settings.passwordSignInDetail': 'Password reset is available from sign in',
  'settings.dataPrivacyChoices': 'Data & privacy choices',
  'settings.dataPrivacyChoicesDetail': 'See, correct, export or delete your information',
  'settings.legalPrivacy': 'Legal & privacy',
  'settings.legalPrivacyDetail': 'Privacy Policy, Terms, AI and credit disclosures',
  'settings.signOut': 'Sign out',
  'settings.signingOut': 'Signing out…',
  'settings.footerNote':
    'Zoey never shows your SSN, full identity details or documents on this screen. Sign out clears the protected session from this device. Deleting your account removes your profile, documents, disputes, goals and score history, and cannot be undone — a limited amount of information is kept afterwards, explained under Legal & privacy.',

  /* -------------------------------------------------------- notifications */
  'notifications.title': 'Notifications',
  'notifications.disputeUpdates': 'Dispute updates',
  'notifications.disputeUpdatesDetail': 'When a bureau responds to a dispute',
  'notifications.actionRequired': 'Action required',
  'notifications.actionRequiredDetail': 'When Zoey needs a document or an answer from you',
  'notifications.creditReportUpdates': 'Credit report updates',
  'notifications.creditReportUpdatesDetail': 'When a new report shows a score or account change',
  'notifications.productNews': 'Product news',
  'notifications.productNewsDetail': 'Occasional updates about Zoey',
  'notifications.notDelivering':
    'Zoey does not send push notifications yet. Your choices here are saved and will apply as soon as it does.',
  'notifications.osDenied':
    'Notifications are turned off for Zoey in your device settings, so nothing can be delivered. Your choices here are saved. To allow them, open the Settings app, find Zoey, and turn on Notifications.',
  'notifications.osNotDetermined':
    'Zoey has not asked your device for permission to send notifications yet. It will ask the first time there is something worth sending.',
  'notifications.osUnavailable': 'This device cannot receive notifications from Zoey. Your choices here are saved.',
  'notifications.couldNotSaveTitle': 'Could not save',
  'notifications.couldNotSaveBody': 'That change was not saved. Check your connection.',
  'notifications.a11ySettings': 'Notification settings',

  /* ------------------------------------------------------- account delete */
  'delete.action': 'Delete account',
  'delete.deleting': 'Deleting your account…',
  'delete.a11yHint': 'Permanently deletes your account and all of your data',
  'delete.confirmTitle': 'Delete your Zoey account?',
  'delete.confirmBody':
    'This deletes your profile, documents, disputes, goals and score history, and removes your sign-in. It cannot be undone and Zoey cannot recover it. A limited amount of information is kept afterwards where it is needed for security or required by law — see Legal & Privacy.',
  'delete.finalTitle': 'Permanently delete?',
  'delete.finalBody':
    'Last check. Deleting removes your account and your records, and you will not be able to sign back in.',
  'delete.keepAccount': 'Keep my account',
  'delete.deleteForever': 'Delete forever',
  'delete.failedTitle': 'Could not delete your account',
  'delete.failedBody':
    'Zoey could not delete your account. Nothing was changed. Check your connection and try again.',
  'delete.doneTitle': 'Account deleted',
  'delete.doneBody':
    'Your account was deleted, but this device could not clear its session. Close and reopen Zoey to finish signing out.',

  /* ------------------------------------------------------------- sign out */
  'signOut.confirmTitle': 'Sign out of Zoey?',
  'signOut.confirmBody': 'You will need to sign in again to reach your case.',

  /* ------------------------------------------------------------------ chat */
  'chat.title': 'Zoey',
  'chat.subtitle': 'Your financial assistant',
  'chat.placeholder': 'Ask Zoey about your credit',
  'chat.disclosure':
    'Zoey uses AI. Answers can be incomplete or inaccurate — check anything important against your records.',
  'chat.disclosureLink': 'Learn more',
  'chat.a11yDisclosure': 'AI disclosure',
  'chat.a11yDisclosureHint': 'Read how Zoey uses AI and what it cannot do',
  'chat.lockedTitle': 'Zoey AI Chat',
  'chat.lockedBlurb': 'Ask Zoey about your credit and your case',
  'chat.lockedBullet1': 'Answers grounded in your own Zoey records',
  'chat.lockedBullet2': 'Explanations of every dispute and document',
  'chat.lockedBullet3': 'Straight answers when something is missing',
  'chat.errorGeneric': 'I couldn’t put an answer together just then. Try asking again.',

  /* --------------------------------------------------------------- legal */
  'legal.title': 'Legal & Privacy',
  'legal.subtitle':
    'What Zoey does with your information, what it can and cannot do, and how to delete your account.',
  'legal.plainLanguage': 'Plain language',
  'legal.contact': 'Contact',
  'legal.supportName': 'Pinnacle support',
  'legal.websiteTitle': 'pinnaclecapitalusa.com',
  'legal.websiteDetail': 'These documents are also published on our website',
  'legal.draftBadge': 'Draft',
  'legal.draftNoticeTitle': 'Some of these documents are still in draft',
  'legal.draftNoticeBody':
    'They describe how Zoey works today and are being reviewed by an attorney before launch. Sections still under review are marked inside each document.',
  'legal.documentDraftNotice':
    'This is a draft. It describes how Zoey actually works today and is being reviewed by an attorney before launch.',
  'legal.underReview': 'Under legal review',
  'legal.versionLine': 'Version {version} · Effective {effective}',
  'legal.notFound': 'That document could not be found. Go back to Legal & Privacy to see everything available.',
  'legal.alsoPublished': 'Also published at pinnaclecapitalusa.com',
  'legal.a11yEmail': 'Email {email}',
  'legal.a11yEmailHint': 'Opens your email app',
  'legal.a11yViewOnWeb': 'View {title} on pinnaclecapitalusa.com',
  'legal.a11yViewOnWebHint': 'Opens the public page in your browser',
  'legal.noMailAppTitle': 'Email Pinnacle support',
  'legal.noMailAppBody': 'No email app is set up on this device. You can reach support at {email}.',
  'legal.plainLanguageBody1':
    'Zoey provides educational and informational tools and is not a law firm, lender, credit bureau, financial advisor or tax advisor. Information provided through Zoey is not legal, lending, tax or investment advice.',
  'legal.plainLanguageBody2':
    'No score increase, deletion, approval, funding or timeline is guaranteed. What happens with a dispute depends on the facts, the evidence, and the bureaus and companies involved.',

  /* -------------------------------------------------------- subscription */
  'subscription.title': 'Subscription',
  'subscription.notConnectedTitle': 'Billing isn’t connected yet',
  'subscription.notConnectedBody':
    'Zoey can’t show your plan or payment details until a billing provider is connected to this app.',
  'subscription.notConnectedNote':
    'This screen is ready for real data. Once billing is wired up it will show your plan, price, renewal date and a link to manage payment — nothing here is placeholder pricing.',
  'subscription.noneTitle': 'No active subscription',
  'subscription.noneBody': 'You don’t have a plan on this account right now.',
  'subscription.currentPlan': 'Current plan',
  'subscription.pastDue': 'Your last payment didn’t go through. Update your payment method to keep Zoey working on your case.',
  'subscription.manageBilling': 'Manage billing',
  'subscription.noPortal':
    'A billing portal link isn’t available for this plan yet, so payment changes and cancellation need to go through support.',
  'subscription.memberSince': 'Member since {date}',

  /* --------------------------------------------------------------- errors */
  'error.generic': 'Something went wrong. Please try again.',
  'error.offline': 'Zoey can’t reach the network right now. Check your connection and try again.',
  'error.session': 'Your session has ended. Sign in again to continue.',
  'error.rateLimited': 'That was a lot of requests at once. Wait a moment and try again.',
  'error.tooLarge': 'That file is too large. The limit is {limit}.',
  'error.serverBusy': 'Zoey is busy right now. Try again in a moment.',

  /* ------------------------------------------------------------ documents */
  'documents.itemsReceived': { one: '{count} document received', other: '{count} documents received' },
  'documents.itemsNeeded': { one: '{count} document still needed', other: '{count} documents still needed' },

  /* --------------------------------------------------------------- states */
  'state.empty': 'Nothing here yet',
  'state.errorTitle': 'Something went wrong',
};
