# Mobile Navigation Menu Architecture & Accessibility Guidelines

## Overview
As part of Issue #259, OpenSourceMate implements a dedicated, fully accessible **Mobile Navigation Menu** (`frontend/components/MobileNavigationMenu.tsx`) and enhanced disclosure behavior in the primary `Navbar` (`frontend/components/Navbar.tsx`).

On mobile and small viewport screens (from 320px up to 768px), navigation items can crowd the header. The mobile navigation disclosure pattern ensures a clean interface, full keyboard operability, WCAG 2.1 AA compliance, and accessible touch targets without trapping keyboard focus when collapsed.

---

## Architecture & Specifications

### 1. Disclosure Pattern & ARIA Standards
- **Trigger Element**: An interactive `<button>` with explicit semantic attributes:
  - `aria-label`: Dynamically switches between `"Open navigation menu"` and `"Close navigation menu"`.
  - `aria-expanded`: Reflects disclosure state (`"true"` when panel is open, `"false"` when closed).
  - `aria-controls`: Associates the trigger button with the disclosure container ID (`mobile-navigation-panel` / `mobile-navigation-dropdown`).
- **Disclosure Container**: A `<div role="region" aria-label="Mobile Navigation Menu">` enclosing the navigation links.
- **Focus Management**:
  - When closed, menu items are completely unmounted or removed from the tab order so focus is never trapped.
  - When the menu is dismissed via the `Escape` key or navigation link click, focus immediately returns to the trigger button (`ref.current?.focus()`).

### 2. Viewport & Theme Adaptability
- **Minimum Viewport Target**: Designed and tested down to **320px** wide screens.
- **Theme Accessibility**: The `ThemeToggle` button remains prominently visible and clickable in the top bar beside the hamburger button, ensuring quick dark/light mode switching without requiring the user to open the menu.
- **Breakpoint Synchronization**: Automatically closes the menu if the window is resized to desktop width (>= 768px).

---

## Component API: `MobileNavigationMenu`

```tsx
import { MobileNavigationMenu } from "@/components/MobileNavigationMenu";

<MobileNavigationMenu
  theme={theme}
  onToggleTheme={toggleTheme}
  activeSection={activeSection}
  onNavigateSection={(section) => scrollToSection(section)}
  isOpen={isMobileMenuOpen}
  onOpenChange={setIsMobileMenuOpen}
/>
```

### Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `theme` | `"dark" \| "light"` | Active theme mode |
| `onToggleTheme` | `() => void` | Theme switcher callback |
| `activeSection` | `string` (optional) | ID of currently visible section |
| `onNavigateSection` | `(sectionId: string) => void` (optional) | Anchor link click callback |
| `isOpen` | `boolean` (optional) | Controlled disclosure state |
| `onOpenChange` | `(open: boolean) => void` (optional) | State change handler |
| `className` | `string` (optional) | Additional CSS wrapper classes |

---

## Testing & Verification

Unit and integration tests are located in:
- `frontend/__tests__/MobileNavigationMenu.test.tsx`
- `frontend/__tests__/LandingComponents.test.tsx`

Run tests locally:
```bash
npm --prefix frontend test -- __tests__/MobileNavigationMenu.test.tsx
```

All 8 mobile disclosure test cases verify:
- Initial closed state with reachable theme toggle.
- Toggle click opening and closing.
- Keyboard `Escape` handling with focus return.
- Anchor and router link click handling.
- Screen resize auto-dismiss.
- Theme contrast compliance.
