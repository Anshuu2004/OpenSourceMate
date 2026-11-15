# Shared Toast Notification System

## Overview
Issue #260 introduces a lightweight, accessible, and performant **Toast Notification System** (`frontend/components/ToastProvider.tsx`) for OpenSourceMate.

It provides a centralized context and hook (`useToast`) to announce application notifications across user actions such as:
- Copying profile and issue URLs or clipboard data.
- Rate-limit warnings and network status feedback.
- Analysis export confirmations (JSON, Markdown, CSV).
- Bookmark/saving notifications.

---

## Architecture & Accessibility Features

### 1. W3C ARIA Live Regions
- **Informational & Success Toasts**: Rendered with `role="status"` and `aria-live="polite"` so screen readers smoothly announce the message without interrupting active reading.
- **Error & Alert Toasts**: Rendered with `role="alert"` and `aria-live="assertive"` so critical events (e.g. rate limit exhaustion or network failure) are immediately spoken.

### 2. Reduced Motion Support
- Integrates with `usePrefersReducedMotion()`.
- Disables sliding and translation animations when the user enables the `prefers-reduced-motion` system setting.

### 3. Queue Management & Dismissal
- Automatically dismisses toasts after a configurable duration (`defaultDuration = 5000ms`).
- Provides an accessible manual close `<button aria-label="Dismiss notification">` on every toast.
- Enforces `maxToasts` (default: 5) to prevent floating notifications from overwhelming the viewport.

---

## Usage Guide

### Wrap Application / Layout
```tsx
import { ToastProvider } from "@/components/ToastProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider position="top-right" defaultDuration={5000}>
      {children}
    </ToastProvider>
  );
}
```

### Dispatch Notifications via Hook
```tsx
import { useToast } from "@/components/ToastProvider";

export function CopyProfileButton({ username }: { username: string }) {
  const toast = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(`Copied profile link for @${username}!`, {
      title: "Link Copied",
      duration: 3000,
    });
  };

  return <button onClick={handleCopy}>Share Profile</button>;
}
```

### Toast Methods

| Method | Type | ARIA Priority | Example Use Case |
| :--- | :--- | :--- | :--- |
| `toast.success(message, options)` | `success` | `aria-live="polite"` | Data saved, link copied, report exported |
| `toast.error(message, options)` | `error` | `aria-live="assertive"` | Rate limit reached, network error |
| `toast.info(message, options)` | `info` | `aria-live="polite"` | Analysis refreshed, filters updated |
| `toast.dismissToast(id)` | Manual | N/A | Dismiss specific toast by ID |
| `toast.clearToasts()` | Batch | N/A | Clear entire notification queue |

---

## Testing & Quality Assurance

All features are tested in `frontend/__tests__/ToastProvider.test.tsx`:
- Hook error boundary checks.
- ARIA live region assertion.
- Queue overflow and auto-dismissal using fake timers.
- Manual dismissal.
- Clear all queue callback.

Run tests:
```bash
npm --prefix frontend test -- __tests__/ToastProvider.test.tsx
```
