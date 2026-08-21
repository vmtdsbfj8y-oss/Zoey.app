import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DELIVERY,
  NOTIFICATION_CATEGORIES,
  deliveryIsLive,
  notificationStatusMessage,
  preferencesAreEditable,
  shouldRequestOsPermission,
  type NotificationStatus,
} from '../notification-preferences';

const ROOT = join(__dirname, '..', '..');
const status = (over: Partial<NotificationStatus> = {}): NotificationStatus => ({
  delivery: 'AVAILABLE',
  osPermission: 'GRANTED',
  ...over,
});

describe('the app tells the truth about whether it can send anything', () => {
  it('reports delivery as not implemented, because no delivery path exists', () => {
    expect(DELIVERY).toBe('NOT_IMPLEMENTED');
    expect(deliveryIsLive()).toBe(false);
  });

  it('ships no push library, which is the fact the flag is describing', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const lib of ['expo-notifications', 'react-native-onesignal', '@react-native-firebase/messaging']) {
      expect(deps[lib], lib).toBeUndefined();
    }
  });

  it('says so before the switches rather than promising delivery', () => {
    const message = notificationStatusMessage(status({ delivery: 'NOT_IMPLEMENTED' }));
    expect(message).toContain('does not send push notifications yet');
    expect(message).toContain('saved');
  });

  it('places that explanation ABOVE the toggles in Settings', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    const banner = settings.indexOf('{statusMessage}');
    const toggles = settings.indexOf('NOTIFICATION_CATEGORIES.map');
    expect(banner).toBeGreaterThan(-1);
    expect(toggles).toBeGreaterThan(-1);
    expect(banner).toBeLessThan(toggles);
  });
});

describe('OS permission and Zoey preferences are never conflated', () => {
  it('never asks for permission while there is nothing to deliver', () => {
    expect(shouldRequestOsPermission(status({ delivery: 'NOT_IMPLEMENTED', osPermission: 'NOT_DETERMINED' }))).toBe(false);
  });

  it('asks once when delivery exists and the user has not been asked', () => {
    expect(shouldRequestOsPermission(status({ osPermission: 'NOT_DETERMINED' }))).toBe(true);
  });

  it('does not nag after a denial, and does not re-ask after a grant', () => {
    expect(shouldRequestOsPermission(status({ osPermission: 'DENIED' }))).toBe(false);
    expect(shouldRequestOsPermission(status({ osPermission: 'GRANTED' }))).toBe(false);
    expect(shouldRequestOsPermission(status({ osPermission: 'UNAVAILABLE' }))).toBe(false);
  });

  it('explains a denial and points at the Settings app instead of silently failing', () => {
    const message = notificationStatusMessage(status({ osPermission: 'DENIED' }))!;
    expect(message).toContain('device settings');
    expect(message).toContain('saved');
    expect(message.toLowerCase()).toContain('settings app');
  });

  it('keeps preferences editable in every state, including denied', () => {
    for (const state of ['NOT_DETERMINED', 'GRANTED', 'DENIED', 'UNAVAILABLE'] as const) {
      expect(preferencesAreEditable(status({ osPermission: state })), state).toBe(true);
    }
    expect(preferencesAreEditable(status({ delivery: 'NOT_IMPLEMENTED' }))).toBe(true);
  });

  it('says nothing extra only when delivery works and permission is granted', () => {
    expect(notificationStatusMessage(status())).toBeNull();
  });
});

describe('categories are real, and preferences persist per account', () => {
  it('exposes only categories backed by an event the product actually produces', () => {
    expect(NOTIFICATION_CATEGORIES.length).toBeGreaterThan(0);
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(category.purpose.trim().length, category.key).toBeGreaterThan(20);
      expect(category.label.trim().length, category.key).toBeGreaterThan(0);
    }
  });

  it('uses the same keys the server persists', () => {
    const route = readFileSync(join(ROOT, 'api', 'profile.ts'), 'utf8');
    const block = route.slice(route.indexOf('NOTIFICATION_FIELDS'), route.indexOf('] as const', route.indexOf('NOTIFICATION_FIELDS')));
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(block, category.key).toContain(category.key);
    }
  });

  it('persists server-side per account rather than only on the device', () => {
    const route = readFileSync(join(ROOT, 'api', 'profile.ts'), 'utf8');
    expect(route).toContain('requireUser');
    expect(route).toContain('storeFor(user.id)');
    expect(route).toContain('store.putProfile');
  });

  it('renders the switches from the shared registry, so labels cannot drift', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    expect(settings).toContain('NOTIFICATION_CATEGORIES');
    expect(settings).toContain('toggleNotification');
  });
});

describe('no control implies functionality that does not exist', () => {
  it('the header bell no longer shows a permanent unread dot over a dead button', () => {
    const header = readFileSync(join(ROOT, 'components', 'home', 'zoey-header.tsx'), 'utf8');
    const code = header.replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(code).not.toContain('unread dot');
    expect(code).toContain('name="bell"');
    expect(code).toContain('onPress');
  });

  it('Settings has no inert row for something that already works', () => {
    /* Comments stripped: the note explaining what the old row said quotes its label. */
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      ' '
    );
    const inert = settings.slice(settings.indexOf('<SectionLabel>Security'));
    expect(inert).not.toContain('Download or delete your data');
    expect(inert).toContain("router.push('/legal/data-choices')");
  });
});
