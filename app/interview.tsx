import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EvidenceNeeds } from '@/components/interview/evidence-needs';
import { GuidedOptions, InterviewProgress } from '@/components/interview/guided-options';
import { ItemMatchSelector } from '@/components/interview/item-match-selector';
import { ReflectBackCard } from '@/components/interview/reflect-back-card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';
import { paneFor, sortedEvidenceNeeds } from '@/lib/interview-presentation';
import {
  getInterview,
  needsRefetch,
  submitInterview,
  type InterviewAction,
  type InterviewState,
} from '@/lib/mobile-interview';

/**
 * The identity review, rendered from server state and nothing else.
 *
 * ==============================  NO STEP MACHINE HERE  ==============================
 *
 * The `consent-flow` doctrine: this screen holds no idea of which question comes next, how many
 * are left, or when the review is finished. It renders the pane the server's view implies, posts
 * one action, and renders whatever comes back. Progress therefore survives closing the modal,
 * backgrounding the app, or switching devices, because progress was never on the device.
 *
 * Closing does NOT cancel. The engine keeps the session open with its pending id intact, so
 * reopening resumes exactly where it stopped. (`CANCEL` exists on the seam and is deliberately not
 * wired to a button -- a stray tap must not be able to discard someone's answers.)
 *
 * ==============================  ONE SUBMIT AT A TIME  ==============================
 *
 * `inFlight` is a ref set before the first await, not state: two taps in the same frame both read
 * the old state value and both submit. That is the bug that once produced eighteen Run Zoey
 * requests, and every pending id here is single-use, so a double tap would spend the id and then
 * be told the second attempt is stale.
 */
export default function InterviewScreen() {
  const { t } = useI18n();
  const router = useRouter();
  // Read-only here: the checklist supplies each evidence row's status, nothing more.
  const { slots } = useDocuments();
  const [state, setState] = useState<InterviewState>({ status: 'LOADING' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'YES' | 'CHANGE' | 'NOT_SURE' | null>(null);
  const [draft, setDraft] = useState('');
  const inFlight = useRef(false);

  const load = useCallback(async () => setState(await getInterview()), []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (action: InterviewAction) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);

      const result = await submitInterview(action);

      inFlight.current = false;
      setBusy(false);

      if (result.ok) {
        setState({ status: 'READY', view: result.view });
        setDecision(null);
        setDraft('');
        return;
      }

      setError(result.message);
      /*
       * A stale pending id or a session that moved on means the screen is showing something the
       * server no longer offers. Re-read so the person is answering what is actually open, rather
       * than tapping a dead form -- the same reconciliation the inquiry questionnaire performs.
       */
      if (needsRefetch(result)) await load();
    },
    [load]
  );

  const view = state.status === 'READY' ? state.view : null;
  const pane = paneFor(view);
  const answered = view ? view.items.filter((item) => item.status !== 'UNREVIEWED').length : 0;

  if (state.status === 'LOADING') {
    return (
      <Shell>
        <View className="items-center py-10">
          <ActivityIndicator color={tokens.violet400} />
        </View>
      </Shell>
    );
  }

  /* Could not ask at all: a transport failure, or a session that expired mid-review. */
  if (state.status === 'UNAVAILABLE') {
    return (
      <Shell>
        <Notice
          title={state.sessionExpired ? t('interview.sessionExpired') : t('interview.unavailableTitle')}
          body={state.sessionExpired ? state.message : t('interview.unavailableBody')}
          actionLabel={t('interview.retry')}
          a11yLabel={t('interview.a11yRetry')}
          onAction={() => void load()}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Zoey's last validated sentence, when she said one. Shown as written. */}
      {view?.assistantText && pane.pane !== 'DONE' ? (
        <Text className="px-1 font-sans text-[13px] leading-[19px] text-parchment/75">{view.assistantText}</Text>
      ) : null}

      {pane.pane === 'NOT_STARTED' ? (
        <GlassSurface radius={22} glow>
          <View className="gap-2 p-4">
            <Text className="font-display text-[17px] text-parchment">{t('interview.startTitle')}</Text>
            <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
              {t('interview.startBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('interview.a11yStart')}
              accessibilityState={{ disabled: busy, busy }}
              onPress={busy ? undefined : () => void act({ action: 'START' })}
              className="mt-1 flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-85"
              style={{ backgroundColor: busy ? 'rgba(168,85,247,0.22)' : tokens.violet500 }}
            >
              {busy ? <ActivityIndicator size="small" color={tokens.parchment} /> : null}
              <Text className="font-sans-semibold text-[13px] tracking-[0.06em] text-parchment">
                {busy ? t('interview.working') : t('interview.startAction')}
              </Text>
            </Pressable>
          </View>
        </GlassSurface>
      ) : null}

      {pane.pane === 'QUESTION' && view?.pendingQuestion ? (
        <>
          <GuidedOptions
            question={view.pendingQuestion}
            busy={busy}
            onAnswer={(value) =>
              void act({ action: 'ANSWER', questionId: view.pendingQuestion!.questionId, value })
            }
          />
          <InterviewProgress answered={answered} total={view.items.length} />
          {/*
           * A typed reply only when the ENGINE asked for one. In guided-only mode the engine never
           * sends a FREE_TEXT question, so this composer simply never appears -- rather than the app
           * offering a box whose answer would be refused.
           */}
          {pane.freeText ? (
            <GlassSurface radius={18}>
              <View className="gap-2 p-3">
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  editable={!busy}
                  multiline
                  placeholder={t('chat.placeholder')}
                  placeholderTextColor="rgba(244,239,255,0.35)"
                  accessibilityLabel={t('interview.questionTitle')}
                  className="min-h-[64px] font-sans text-[13.5px] text-parchment"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('interview.startAction')}
                  accessibilityState={{ disabled: busy || !draft.trim(), busy }}
                  onPress={busy || !draft.trim() ? undefined : () => void act({ action: 'MESSAGE', text: draft.trim() })}
                  className="items-center rounded-full py-2.5 active:opacity-85"
                  style={{ backgroundColor: draft.trim() && !busy ? tokens.violet500 : 'rgba(168,85,247,0.22)' }}
                >
                  <Text className="font-sans-semibold text-[12.5px] tracking-[0.06em] text-parchment">
                    {busy ? t('interview.working') : t('interview.startAction')}
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>
          ) : null}
        </>
      ) : null}

      {pane.pane === 'SELECTION' && view?.pendingSelection ? (
        <ItemMatchSelector
          selection={view.pendingSelection}
          items={view.items}
          busy={busy}
          onSelect={(itemKeys) =>
            void act({ action: 'SELECT_ITEMS', selectionId: view.pendingSelection!.selectionId, itemKeys })
          }
        />
      ) : null}

      {pane.pane === 'SUMMARY' && view?.pendingSummary ? (
        <ReflectBackCard
          summary={view.pendingSummary}
          busy={busy}
          decision={decision}
          onDecide={(next) => {
            setDecision(next);
            void act({
              action: 'CONFIRM_SUMMARY',
              summaryId: view.pendingSummary!.summaryId,
              decision: next,
            });
          }}
        />
      ) : null}

      {pane.pane === 'SPECIALIST' ? (
        <Notice title={t('interview.specialistTitle')} body={t('interview.specialistBody')} />
      ) : null}

      {pane.pane === 'DONE' ? (
        <Notice title={t('interview.doneTitle')} body={t('interview.doneBody')} />
      ) : null}

      {pane.pane === 'UNAVAILABLE' && state.status === 'READY' ? (
        <Notice
          title={t('interview.unavailableTitle')}
          body={t('interview.unavailableBody')}
          actionLabel={t('interview.retry')}
          a11yLabel={t('interview.a11yRetry')}
          onAction={() => void load()}
        />
      ) : null}

      {/*
       * What the confirmed answers now call for. Uploading stays in the documents screen, which
       * already owns the source rules and the storage path -- each row carries the engine's slot id
       * so that screen can open focused on the exact card instead of at the top of a generic list.
       */}
      {view ? (
        <EvidenceNeeds
          needs={sortedEvidenceNeeds(view)}
          slots={slots}
          onOpenDocument={(documentType) => router.push({ pathname: '/documents', params: { documentType } })}
        />
      ) : null}

      {error ? (
        <Text className="px-1 font-sans text-[12.5px] leading-[18px]" style={{ color: tokens.signalPending }}>
          {error}
        </Text>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ScreenBackground idPrefix="interview">
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-10 pt-3">{children}</View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Notice({
  title,
  body,
  actionLabel,
  a11yLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  a11yLabel?: string;
  onAction?: () => void;
}) {
  return (
    <GlassSurface radius={22}>
      <View className="gap-2 p-4">
        <Text className="font-display text-[16px] text-parchment">{title}</Text>
        <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">{body}</Text>
        {onAction && actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a11yLabel ?? actionLabel}
            onPress={onAction}
            className="mt-1 items-center rounded-full border border-white/15 py-2.5 active:opacity-80"
          >
            <Text className="font-sans-semibold text-[12.5px] tracking-[0.06em]" style={{ color: tokens.violet300 }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassSurface>
  );
}
