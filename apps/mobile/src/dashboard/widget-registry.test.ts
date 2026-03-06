import { widgetTypes } from '@portal/shared';
import { describe, expect, it } from 'vitest';
import { mobileWidgetRegistry } from './widget-registry';

describe('mobileWidgetRegistry parity', () => {
  it('supports all shared widget types', () => {
    const shared = [...widgetTypes].sort();
    const mobile = Object.keys(mobileWidgetRegistry).sort();
    expect(mobile).toEqual(shared);
  });
});
