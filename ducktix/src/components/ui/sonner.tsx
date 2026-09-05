'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** O mundo é claro-only, então o toast não consulta tema — ele tem um só. */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--surface)',
        '--normal-text': 'var(--fg)',
        '--normal-border': 'var(--line)',
        '--border-radius': 'var(--r-card)',
        '--success-bg': 'var(--brand-tint)',
        '--success-text': 'var(--brand-ink)',
        '--success-border': 'var(--brand)',
        '--info-bg': '#e8f1fb',
        '--info-text': '#24527a',
        '--info-border': '#8db7dd',
        '--warning-bg': 'var(--warn-tint)',
        '--warning-text': 'var(--warn)',
        '--warning-border': '#e3bd72',
        '--error-bg': 'var(--danger-tint)',
        '--error-text': 'var(--danger)',
        '--error-border': 'var(--danger)',
        '--loading-bg': 'var(--surface-2)',
        '--loading-text': 'var(--fg)',
        '--loading-border': 'var(--line-strong)',
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster };
