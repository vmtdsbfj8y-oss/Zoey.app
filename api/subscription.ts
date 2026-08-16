import { guard, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';

/**
 * GET /api/subscription -> { status, provider, plan? }
 *
 * ---------------------------------------------------------------------------
 * NO BILLING PROVIDER IS CONFIGURED. There is no Stripe/RevenueCat/IAP code in
 * this project, so there is no subscription state to report.
 *
 * This endpoint therefore returns `not_connected` -- a distinct status from
 * `none`. The difference matters: `none` means "we asked the provider and this
 * client has no subscription"; `not_connected` means "we cannot know". Showing
 * a client "No active subscription" when we have not actually checked would be
 * a claim we cannot support, and showing "Active" would be worse.
 *
 * To wire this up: read the provider's subscription for the authenticated
 * client and map it onto the shape below. The app already renders every one of
 * these statuses, so no client change is needed.
 * ---------------------------------------------------------------------------
 */

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none'
  | 'not_connected';

export type SubscriptionPayload = {
  status: SubscriptionStatus;
  /** null until a billing provider is configured. */
  provider: string | null;
  plan?: {
    name: string;
    priceCents: number;
    currency: string;
    interval: 'month' | 'year';
    /** epoch ms; omitted when the provider does not supply one. */
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  };
  /** Provider-hosted billing portal, when one exists. */
  manageUrl?: string;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'GET')) return;
  if (!(await requireUser(req, res))) return;

  const payload: SubscriptionPayload = {
    status: 'not_connected',
    provider: null,
  };

  res.status(200).json(payload);
}
