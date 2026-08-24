import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';

import { ConnectAccountScreen } from '@/components/link/connect-account';
import { useMobileOverview } from '@/hooks/use-mobile-overview';

/**
 * Recovery: attach this sign-in to the Pinnacle file the consumer already had.
 *
 * ==============================  THE SITUATION  ==============================
 *
 * Signing up in the app creates a file. Someone who was ALREADY a Pinnacle client therefore ends up
 * with two -- a blank one their phone is attached to, and the real one holding their intake, report
 * and history. The connect screen never appeared for them, because from the app's point of view
 * they were linked; they were simply linked to the wrong one, with nowhere to put the code their
 * specialist had given them.
 *
 * This route is that missing place. It is the SAME screen and the same request as first-time
 * connection -- only the wording differs, so there is one code path for redeeming a code and no
 * second implementation to drift.
 *
 * Reaching it is not the permission to use it. The engine decides both: this entry appears in More
 * only while `account.canConnectExistingFile` is true, and the redemption itself re-runs the audit
 * that proves the blank file is empty. Opening the URL directly changes nothing -- a client with a
 * real file gets the ordinary refusal, because the check lives at the write, not at the screen.
 */
export default function ConnectExistingFileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { refresh } = useMobileOverview();

  return (
    <ConnectAccountScreen
      title={t('connect.title')}
      subtitle={t('connect.body')}
      onLinked={() => {
        /*
         * Re-ask the engine, then leave. The session now resolves to the original file, so the
         * dashboard rebuilds against it on the way back -- no sign-out and no app restart, which
         * for someone who has just been looking at an empty account is the difference between
         * "it worked" and "did it work?".
         */
        void refresh();
        router.back();
      }}
    />
  );
}
