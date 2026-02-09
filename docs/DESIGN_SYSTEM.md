# Borderless Buy — Design System

**Benchmark:** Apple's design philosophy — minimalist, purposeful, premium feel.
**Target:** Professional, elegant, trustworthy price comparison experience.

---

## 1. Color Palette

### Primary Colors
- **Neutral Dark (Background):** `#0A0A0A` (off-black, not pure black)
- **Neutral Medium:** `#1A1A1A` (cards, surface)
- **Neutral Light:** `#2D2D2D` (borders, dividers)
- **Neutral Text Primary:** `#FFFFFF` (headings, primary text)
- **Neutral Text Secondary:** `#A0A0A0` (supporting text, captions)

### Accent Color (Primary Action)
- **Green Primary:** `#10B981` (trust, call-to-action)
- **Green Hover:** `#059669` (darker on interaction)
- **Green Light:** `#D1FAE5` (subtle background, not used on dark theme — consider alternative)

### Status Colors
- **Success:** `#10B981` (in stock, completed)
- **Warning:** `#F59E0B` (preorder, caution)
- **Error:** `#EF4444` (out of stock, errors)
- **Info:** `#3B82F6` (tips, secondary info)

---

## 2. Typography

### Font Family
**Primary:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- Reason: System fonts load instantly, feel native to each OS, premium.

### Type Scale

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| **Hero Title** | 32px | 700 (bold) | 1.2 (38px) | Main heading "Borderless Buy" |
| **Subtitle** | 16px | 400 (regular) | 1.5 (24px) | Tagline under hero |
| **Section Header** | 20px | 600 (semibold) | 1.3 (26px) | "Your Wishlist", "See prices..." |
| **Body Large** | 16px | 400 (regular) | 1.5 (24px) | Form labels, main text |
| **Body Regular** | 14px | 400 (regular) | 1.5 (21px) | Descriptions, card content |
| **Body Small** | 12px | 400 (regular) | 1.4 (17px) | Captions, helper text |
| **Label** | 14px | 500 (medium) | 1.4 (20px) | Button text, input labels |
| **Micro** | 11px | 400 (regular) | 1.4 (15px) | Timestamps, badges |

### Color Rules
- Primary text: `#FFFFFF`
- Secondary text: `#A0A0A0`
- Tertiary (subtle): `#707070`

---

## 3. Spacing System

**Base unit:** 8px

| Level | Value | Usage |
|-------|-------|-------|
| **xs** | 4px | Micro spacing inside components |
| **sm** | 8px | Padding in small components, gaps |
| **md** | 16px | Standard padding, component gaps |
| **lg** | 24px | Section spacing, larger gaps |
| **xl** | 32px | Between major sections |
| **2xl** | 48px | Page-level top/bottom padding |

### Layout Spacing
- **Page horizontal padding:** 16px (mobile), 24px (tablet/desktop)
- **Section vertical spacing:** 32px between sections
- **Component internal padding:** 16px (standard)
- **Input height:** 48px (touch-friendly)
- **Button height:** 48px (touch-friendly)

---

## 4. Component Design

### 4.1 Buttons

#### Primary Button (Call-to-action)
- **Background:** `#10B981` (Green Primary)
- **Text:** `#FFFFFF`, 14px, 500 weight, uppercase tracking +0.5px
- **Height:** 48px
- **Border radius:** 12px
- **Padding:** 0 24px
- **States:**
  - Default: Solid green, no shadow
  - Hover: `#059669` (darker green)
  - Active: `#047857` (even darker)
  - Disabled: `#4B5563`, opacity 0.5

#### Secondary Button
- **Background:** `#2D2D2D` (Neutral Light)
- **Text:** `#A0A0A0`, 14px, 500 weight
- **Border:** 1px solid `#3D3D3D`
- **Height:** 48px
- **Border radius:** 12px
- **States:**
  - Hover: Background → `#3D3D3D`
  - Active: Background → `#1A1A1A`, border → `#10B981`

#### Tertiary Button (Text-only)
- **Background:** Transparent
- **Text:** `#10B981`, 14px, 600 weight
- **No padding/height constraints
- **States:**
  - Hover: Opacity 0.8
  - Active: Text → `#059669`

### 4.2 Input Fields

#### All Input Types (text, email, select, etc.)
- **Background:** `#1A1A1A` (surface)
- **Border:** 1px solid `#2D2D2D`
- **Text:** `#FFFFFF`, 14px, 400 weight
- **Height:** 48px
- **Padding:** 12px 16px
- **Border radius:** 12px
- **States:**
  - Default: Neutral border
  - Focus: Border → `#10B981`, box-shadow: `0 0 0 3px rgba(16, 185, 129, 0.1)`
  - Filled: Text → `#FFFFFF`, border unchanged
  - Error: Border → `#EF4444`
  - Disabled: Opacity 0.5, cursor not-allowed

#### Placeholder Text
- **Color:** `#707070`
- **Font style:** Regular, no italics

### 4.3 Cards

#### Standard Card (Wishlist Item)
- **Background:** `#1A1A1A`
- **Border:** 1px solid `#2D2D2D`
- **Border radius:** 12px
- **Padding:** 16px
- **Shadow:** `0 2px 8px rgba(0, 0, 0, 0.3)` (subtle depth)
- **Hover state:** Shadow → `0 8px 16px rgba(0, 0, 0, 0.4)`, border → `#3D3D3D`

#### Empty State Card
- **Background:** `linear-gradient(135deg, #1A1A1A 0%, #111111 100%)`
- **Border:** 1px dashed `#2D2D2D`
- **Border radius:** 12px
- **Padding:** 40px 24px
- **Text alignment:** Center
- **Min height:** 200px

### 4.4 Section Containers

#### Major Section
- **Margin top:** 32px (first is 0)
- **Margin bottom:** 0
- **No background color** (use page background)
- **Divider:** Optional thin line `1px solid #2D2D2D` (only if semantically needed)

### 4.5 Info Tip / Helper Text

#### Inline Tip (inside form area)
- **Icon:** Use Unicode `ℹ️` or SVG icon (no emoji)
  - Actually: Use a small `i` in a circle icon, 16x16px
- **Text:** `#A0A0A0`, 12px, 400 weight
- **Background:** Transparent (no background bubble)
- **Placement:** Below form, tight coupling with form area
- **Styling:** Light gray text, minimal visual weight

#### Tip Styling (Better approach)
- **Icon:** Circle outline with `i` inside (SVG, 16px)
- **Icon color:** `#707070`
- **Text color:** `#A0A0A0`
- **Margin top:** 8px from input
- **Line height:** 1.4

---

## 5. Border Radius

**Consistency rule:** All interactive elements use same radius value.

- **Large components (cards, sections):** 12px
- **Buttons:** 12px
- **Inputs:** 12px
- **Small icons/badges:** 8px
- **Micro elements:** 4px

---

## 6. Shadows & Depth

### Elevation System

| Level | Shadow | Usage |
|-------|--------|-------|
| **None** | None | Flat elements, backgrounds |
| **1 (subtle)** | `0 2px 8px rgba(0, 0, 0, 0.3)` | Cards, standard surface |
| **2 (medium)** | `0 8px 16px rgba(0, 0, 0, 0.4)` | Hover cards, dropdowns (if added) |
| **3 (strong)** | `0 16px 32px rgba(0, 0, 0, 0.5)` | Modals, overlays (if added in future) |

**Rule:** Never use pure black shadows. Use dark overlay of the brand color.

---

## 7. Icons

### Icon Library
- **Source:** Heroicons (free, MIT licensed, premium-looking)
- **Size:** 
  - Small (inline): 16x16px
  - Medium (section header): 20x20px
  - Large (hero elements): 24x24px
- **Color:** 
  - Primary actions: `#10B981`
  - Secondary: `#A0A0A0`
  - Status (success/error): Use status colors

### Icon Rules
- No emojis (replaces all emoji usage)
- Stroke-based, not filled (except where semantic meaning requires filled)
- 2px stroke width for clarity

---

## 8. Interaction States & Feedback

### Button Interactions
- **Hover:** Darken color 10%, shadow increases by 1 level
- **Active:** Darken color further, no hover shadow
- **Disabled:** Opacity 0.5, cursor: not-allowed
- **Loading:** Replace text with spinner, button disabled

### Input Interactions
- **Focus:** 3px glowing border (green accent with 10% opacity)
- **Error state:** Red border, error message below in red text
- **Success state:** Green border (only on form validation)

### Transitions
- **All interactive elements:** `transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Smooth, purposeful (Apple style)

---

## 9. Layout Patterns

### Hero Section (Mobile)
```
[Logo/Title]              32px top padding
[Tagline]
                          24px gap
[Email Input]  (full width, 48px height)
[Country Select] 
                          16px gap
[Sign in Button]          (full width, 48px height)
                          16px gap
[Tip/Helper text]         12px, gray
                          32px gap (section divider)
```

### Form Section (Mobile)
```
[Input field label]       14px, semibold
12px gap
[Input field]             48px height, full width
                          32px gap
[Add Button]              Full width, 48px height, teal
                          16px gap
[Inline tip]              12px gray text
```

### Empty State
```
[Large section card with dashed border]
                          Center content vertically
[Icon or visual]          (if no emoji — use typography or simple SVG)
[Heading]                 18px, semibold, white
12px gap
[Description]             14px, gray, max-width 260px
                          20px gap
[Optional: "Get started" link in green text]
```

### Card/Wishlist Item
```
[Product name]            16px, semibold, white
[Price / Country row]     14px, regular
[Other metadata]          12px, gray
                          12px gap
[Remove/Edit action]      Button or icon
```

---

## 10. Responsive Breakpoints

- **Mobile:** 0 - 640px (current focus)
- **Tablet:** 641px - 1024px (future)
- **Desktop:** 1025px+ (future)

**Mobile-first approach:** All base styles are mobile, breakpoints ADD complexity.

---

## 11. Dark Mode (Current)

- This IS dark mode by default.
- Light mode (if ever needed): Invert colors, use `#F9F9F9` background, `#1A1A1A` text.

---

## 12. Accessibility

### WCAG AA Compliance
- **Text contrast:** All text ≥ 4.5:1 ratio
  - White text on `#0A0A0A`: ✅ 15:1
  - Green accent on dark: ✅ 4.8:1
  - Gray text (`#A0A0A0`) on dark: ✅ 5.3:1
  
### Touch Targets
- Minimum 48x48px for buttons and inputs
- Minimum 8px spacing between interactive elements

### Focus Indicators
- Always visible, not disabled
- Use contrasting colors (green accent)
- 3px minimum width

---

## Implementation Checklist

- [ ] Update all button styles (primary, secondary, tertiary)
- [ ] Refine input field styles (focus states, border radius)
- [ ] Replace dashed empty state with better design
- [ ] Update spacing throughout (32px between sections)
- [ ] Swap emoji usage with professional icons (Heroicons)
- [ ] Update tip/helper text styling (no bubble)
- [ ] Ensure all shadows follow elevation system
- [ ] Update transitions on hover/active states
- [ ] Test accessibility (contrast, focus, touch targets)
- [ ] Build and QA on mobile

