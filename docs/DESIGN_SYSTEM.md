# Design System

This document describes the visual rules that keep Borderless Buy consistent across screens and contributors.

## Design Goals
- Clear and trustworthy
- Calm, modern, and practical
- Easy to scan on mobile and desktop
- Focused on decision support rather than decorative UI

## Core Tokens

### Color Roles
- Background surfaces: neutral dark or light theme values from the theme config
- Primary text: highest-contrast text token
- Secondary text: supporting and helper content
- Accent: primary action and emphasis color
- Status colors: success, warning, error, and informational states

Use the theme variables defined in `app/lib/theme-config.ts` and applied through `app/lib/theme-context.tsx`.

### Typography
- Use the existing system font stack for speed and consistency.
- Reserve the largest type for page-level headings.
- Use smaller uppercase labels only for metadata and compact controls.
- Keep body copy concise and readable.

### Spacing
- Base spacing unit: `8px`
- Standard component padding: `16px`
- Major vertical section spacing: `32px`
- Touch targets should remain comfortable on mobile.

## Component Guidance

### Buttons
- Primary buttons should be visually distinct and reserved for the main next action.
- Secondary buttons should support comparison, filtering, or management actions without competing with the primary call to action.
- Disabled states should communicate clearly through both contrast and cursor behavior.

### Inputs
- Inputs should use shared theme tokens for background, border, focus, and placeholder styling.
- Keep labels explicit and avoid relying on placeholders as the only descriptor.
- Privacy-related helper copy should appear close to the relevant input.

### Cards
- Cards should group a single clear idea: one wishlist item, one market summary, or one modal state.
- Avoid stacking too many competing accents inside the same card.
- Use hover states sparingly and only when they reveal interactivity.

## Content Style
- Use plain language.
- Prefer short sentences over slogans.
- Avoid jokes, placeholder terms, and internal shorthand in shipped UI copy.
- Write labels and helper text for first-time users, not for the implementation team.

## Accessibility
- Maintain readable contrast in both themes.
- Ensure interactive controls are keyboard accessible.
- Provide visible focus states.
- Do not depend on color alone to communicate state or meaning.
