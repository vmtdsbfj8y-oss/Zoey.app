import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoeyHero, ZoeyRunLockedCard } from '@/components/documents/zoey-hero';
import { ZoeyHeader } from '@/components/home/zoey-header';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';
import { useMembership } from '@/lib/membership-context';

/**
 * Run Zoey -- the premium Zoey experience, on the approved reference's layout.
 *
 * Hero (the run lifecycle), then "Choose your report", then the documents as clear glass rows in
 * the dashboard's own material language. Every row is still the real upload affordance -- the
 * reference's clean panel replaces the old filtered list, not the functionality behind it.
 *
 * Locking it does not put Credit Services behind the paywall. That case lives at
 * More -> Credit Services, is reachable without a membership, and writes through the SAME
 * `useDocuments()` store and the same engine -- so there is one document record per client either
 * way. The engine itself cannot read an entitlement at all; this is presentation.
 */

/** Section heading in the dashboard's own voice: sentence case, real size, no box. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-4 px-1 font-display text-[21px] leading-[26px] text-parchment">
      {children}
    </Text>
  );
}

/**
 * The clear glass panel the dashboard's sections use: thin violet hairline, near-transparent
 * fill, a fine reflective top edge.
 */
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="mt-2.5 overflow-hidden"
      style={{
        borderRadius: 26,
        backgroundColor: 'rgba(138,106,214,0.045)',
        borderWidth: 1,
        borderColor: 'rgba(198,166,255,0.13)',
      }}>
      {children}
    </View>
  );
}

function PanelRow({
  icon,
  label,
  value,
  valueColor,
  busy,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  busy?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress || busy}
      className="flex-row items-center gap-3 px-5 py-4 active:opacity-70"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' }}>
      <IconSymbol name={icon as never} size={18} color={tokens.violet400} />
      <Text className="flex-1 font-sans text-[15.5px] text-parchment/90" numberOfLines={1}>
        {label}
      </Text>
      {busy ? (
        <ActivityIndicator size="small" color={tokens.violet400} />
      ) : (
        <Text
          className="font-sans-medium text-[13.5px]"
          style={{ color: valueColor ?? 'rgba(228,218,255,0.6)' }}
          numberOfLines={1}>
          {value}
        </Text>
      )}
      <IconSymbol name="chevron.right" size={13} color="rgba(228,218,255,0.4)" />
    </Pressable>
  );
}

/** One of the two report-source chips: outlined glass, exactly the selector's material. */
function ReportChip({
  icon,
  iconLit,
  title,
  subtitle,
  selected,
  busy,
  onPress,
}: {
  icon: string;
  /** Fills the icon puck violet, the reference's "connected" treatment. */
  iconLit?: boolean;
  title: string;
  subtitle: string;
  selected?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={busy ? undefined : onPress}
      className="flex-1 active:opacity-80"
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? 'rgba(214,180,255,0.5)' : 'rgba(198,166,255,0.14)',
        backgroundColor: selected ? 'rgba(150,110,230,0.07)' : 'rgba(138,106,214,0.035)',
      }}>
      <View className="flex-row items-center gap-3 px-3.5 py-3.5">
        <View
          className="items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: iconLit ? 'rgba(178,132,255,0.9)' : 'rgba(150,110,230,0.12)',
          }}>
          {busy ? (
            <ActivityIndicator size="small" color={iconLit ? '#2E1065' : tokens.violet300} />
          ) : (
            <IconSymbol name={icon as never} size={16} color={iconLit ? '#2E1065' : tokens.violet300} />
          )}
        </View>
        <View className="flex-1">
          <Text
            className="font-sans-semibold text-[13.5px] text-parchment"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}>
            {title}
          </Text>
          <Text
            className="mt-0.5 font-sans text-[12px]"
            style={{ color: 'rgba(228,218,255,0.55)' }}
            numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The engine's slot id for a client-uploaded credit report. */
const REPORT_SLOT_ID = 'IDENTITYIQ_CREDIT_REPORT';

export default function DocumentsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { slots, report, uploadSlot, uploadState } = useDocuments();
  const { isPremium, loading: membershipLoading } = useMembership();

  /*
   * The upload chip targets the checklist's own report slot when the engine asks for one, and the
   * canonical report type otherwise -- a report refresh is legitimate at any time, and the slot id
   * IS the engine's document type.
   */
  const reportSlot = slots.find((slot) => slot.id.includes('CREDIT_REPORT'));
  const reportSlotId = reportSlot?.id ?? REPORT_SLOT_ID;
  const reportUpload = uploadState[reportSlotId];
  const reportUploadBusy = reportUpload?.kind === 'uploading' || reportUpload?.kind === 'preparing';

  const connectedSubtitle = report?.accepted
    ? t('runzoey.ready')
    : report?.received
      ? t('runzoey.inReview')
      : t('runzoey.notConnected');

  const uploadSubtitle =
    reportUpload?.kind === 'failed' || reportUpload?.kind === 'rejected'
      ? reportUpload.message
      : reportUploadBusy
        ? t('runzoey.uploading')
        : t('runzoey.chooseFile');

  return (
    <ScreenBackground idPrefix="docs" floor>
      <SafeAreaView edges={[]} className="flex-1">
        {/* The dashboard's own header, then the screen's name in its title voice. */}
        <ZoeyHeader />
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Text className="font-display text-[24px] text-parchment">{t('tabfab.runZoey')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pb-44">
            {membershipLoading ? null : isPremium ? (
              <>
                <ZoeyHero onViewAnalysis={() => router.push('/disputes')} />

                <SectionHeading>{t('runzoey.chooseReport')}</SectionHeading>
                <View className="mt-2.5 flex-row gap-2.5">
                  <ReportChip
                    icon="checkmark"
                    iconLit={Boolean(report?.accepted)}
                    title={t('runzoey.connectedReport')}
                    subtitle={connectedSubtitle}
                    selected={Boolean(report?.accepted)}
                    onPress={() => router.push('/(tabs)/credit-score')}
                  />
                  <ReportChip
                    icon="icloud.and.arrow.up"
                    title={t('runzoey.uploadPdf')}
                    subtitle={uploadSubtitle}
                    busy={reportUploadBusy}
                    onPress={() => void uploadSlot(reportSlotId)}
                  />
                </View>
                {/* Brand names -- the string is identical in every locale by design. */}
                <Text
                  className="mt-2.5 px-1 font-sans text-[12.5px]"
                  style={{ color: 'rgba(228,218,255,0.45)' }}>
                  {t('runzoey.bureaus')}
                </Text>

                <SectionHeading>{t('runzoey.yourDocuments')}</SectionHeading>
                <GlassPanel>
                  {slots.map((slot) => {
                    const upload = uploadState[slot.id];
                    const busy = upload?.kind === 'uploading' || upload?.kind === 'preparing';
                    const failed = upload?.kind === 'failed' || upload?.kind === 'rejected';
                    return (
                      <PanelRow
                        key={slot.id}
                        icon={slot.state === 'uploaded' ? 'doc.text.fill' : 'doc.text'}
                        label={slot.name}
                        value={failed ? upload.message : slot.detail}
                        valueColor={
                          failed
                            ? tokens.signalPending
                            : slot.state === 'uploaded'
                              ? tokens.violet300
                              : undefined
                        }
                        busy={busy}
                        onPress={() => void uploadSlot(slot.id)}
                      />
                    );
                  })}
                  <PanelRow
                    icon="clock"
                    label={t('runzoey.analysisHistory')}
                    value={t('runzoey.viewResults')}
                    onPress={() => router.push('/disputes')}
                    last
                  />
                </GlassPanel>

                {/* the reference's quiet closing line, with the claim the app already stands behind */}
                <View className="mt-5 flex-row items-center justify-center gap-1.5 px-6">
                  <IconSymbol name="lock.fill" size={11} color="rgba(228,218,255,0.5)" />
                  <Text
                    className="text-center font-sans text-[12px]"
                    style={{ color: 'rgba(228,218,255,0.5)' }}>
                    {t('hero.privateStorage')}
                  </Text>
                </View>
              </>
            ) : (
              <View className="gap-3">
                {/* The real card, action locked -- a non-member can see what membership turns on. */}
                <ZoeyRunLockedCard />
                <PremiumLockCard
                  icon="doc.text.fill"
                  title={t('documents.title')}
                  blurb={t('documents.blurb')}
                  bullets={[
                    'Upload, replace and review every document',
                    'Live processing status as Zoey reads them',
                    'Dispute letters and generated documents',
                  ]}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
