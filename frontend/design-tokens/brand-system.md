# AI Singer Studio Brand System

## Brand Identity

**Name:** AI Singer Studio
**Tagline:** Create. Perform. Inspire.
**Mission:** Empowering creators to generate stunning AI-powered music videos with premium quality and intuitive controls.

---

## Signature Visual Elements

### 1. Wave Arc Motif

The **wave arc** is our signature geometric pattern representing the flow of music and creativity. It appears throughout the interface as a consistent visual rhythm.

#### Design Specifications

**Wave Arc Formula:**
```
y = sin(x * frequency) * amplitude + offset
```

**Standard Wave Parameters:**
- **Frequency:** `0.015` (gentle flow)
- **Amplitude:** `60px` (desktop), `40px` (mobile)
- **Offset:** Varies by context
- **Stroke Width:** `2px` (standard), `3px` (emphasis), `1px` (subtle)
- **Colors:** Primary gradient or accent gradient

**Wave Arc Variations:**

1. **Header Wave** - Subtle background element
   - Amplitude: 40px
   - Opacity: 0.15
   - Color: Primary 500
   - Position: Top of sections

2. **Section Divider Wave** - Between major sections
   - Amplitude: 60px
   - Opacity: 0.2
   - Color: Gradient mesh
   - Animation: Gentle horizontal shift

3. **Card Accent Wave** - Decorative element on cards
   - Amplitude: 30px
   - Opacity: 0.3
   - Color: Accent gradient
   - Position: Top-right or bottom-left corner

4. **Button Hover Wave** - Interactive feedback
   - Amplitude: 20px
   - Opacity: 0.4
   - Color: Matches button color
   - Animation: Flow on hover

**Implementation Pattern:**
```svg
<svg className="wave-arc" viewBox="0 0 1440 120" preserveAspectRatio="none">
  <path
    d="M0,60 Q360,0 720,60 T1440,60 L1440,120 L0,120 Z"
    fill="url(#gradient-primary)"
    opacity="0.15"
  />
</svg>
```

### 2. Gradient Mesh Backgrounds

Premium background treatment for hero sections and feature areas.

**Mesh Pattern:**
- 4 radial gradients positioned at corners
- Colors: Primary 600, Accent 500, Purple 500, Pink 500
- Opacity: 0.6 (light mode), 0.4 (dark mode)
- Blur: High (100px+)
- Animation: Subtle shift (optional, 20s duration)

**Usage Contexts:**
- Hero sections
- Dashboard headers
- Modal backgrounds (with increased blur)
- Feature highlights

### 3. Glassmorphism Effects

Modern depth and layering system.

**Glass Card Specifications:**
- Background: `rgba(255, 255, 255, 0.1)` (light), `rgba(0, 0, 0, 0.2)` (dark)
- Backdrop Blur: `10px` (standard), `20px` (prominent)
- Border: `1px solid rgba(255, 255, 255, 0.2)`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.1)`

**Implementation:**
```css
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### 4. Glow Effects

Interactive elements receive subtle glow on hover/focus.

**Glow Specifications:**
- Primary Glow: `0 0 20px rgba(99, 102, 241, 0.5)`
- Accent Glow: `0 0 20px rgba(244, 63, 94, 0.5)`
- Success Glow: `0 0 20px rgba(34, 197, 94, 0.5)`

**Usage:**
- Primary actions (CTAs, submit buttons)
- Interactive cards on hover
- Active navigation items
- Focus states on inputs

---

## Visual Language Principles

### 1. Modern Minimalism

**Philosophy:** Clean, uncluttered interfaces that let content shine.

- **Whitespace:** Generous spacing using 8px grid system
- **Hierarchy:** Clear visual distinction between content layers
- **Simplicity:** Remove unnecessary elements; every pixel has purpose
- **Focus:** Guide attention to primary actions and content

### 2. Fluid Motion

**Philosophy:** Smooth, purposeful animations that feel alive.

**Motion Guidelines:**
- **Duration:** Fast (140ms) for micro-interactions, Base (180ms) for transitions, Hero (600ms) for page transitions
- **Easing:** Use spring easing for playful interactions, decelerate for entering, accelerate for exiting
- **Reduced Motion:** Always provide static alternatives
- **Purpose:** Animations guide attention and provide feedback, never purely decorative

**Animation Types:**
- **Fade:** Content appearing/disappearing
- **Slide:** Panels, modals, dropdowns
- **Scale:** Buttons, cards on hover
- **Gradient Shift:** Background animations (subtle, slow)

### 3. Premium Depth

**Philosophy:** Layered elevation creates sophisticated depth.

**Elevation Levels:**
1. **Base (0):** Page background
2. **Raised (1-2):** Cards, surfaces
3. **Floating (3-4):** Buttons, inputs on hover
4. **Overlay (5-6):** Dropdowns, tooltips
5. **Modal (7-8):** Dialogs, popovers

**Shadow Strategy:**
- Combine soft shadows with glow effects
- Darker shadows in dark mode for contrast
- Animated shadow transitions on interaction

### 4. Responsive Typography

**Philosophy:** Fluid, accessible text that scales beautifully.

**Scale Approach:**
- Use `clamp()` for all font sizes
- Minimum: Mobile optimal
- Preferred: Viewport-relative (vw)
- Maximum: Desktop optimal
- Line height: Tighter for headings (1.1-1.3), generous for body (1.5-1.6)

**Hierarchy:**
- **Display (6xl-5xl):** Hero headings, landing pages
- **Headings (4xl-2xl):** Page titles, section headers
- **Body (xl-base):** Main content, descriptions
- **UI (sm-xs):** Labels, captions, metadata

---

## Component Patterns

### Button Treatments

**Primary Button:**
- Background: Primary gradient
- Text: White
- Shadow: md → glow-primary on hover
- Border radius: lg
- Padding: 16px 32px (desktop), 12px 24px (mobile)
- Transition: all 180ms spring
- Hover: Scale 1.02, add glow
- Active: Scale 0.98

**Secondary Button:**
- Background: Transparent
- Border: 2px solid primary
- Text: Primary color
- Hover: Background primary 50, slight glow

**Ghost Button:**
- Background: Transparent
- Text: Foreground color
- Hover: Background muted

### Card Treatments

**Standard Card:**
- Background: Card semantic color
- Border: 1px solid border color
- Border radius: xl
- Padding: 24px
- Shadow: sm → md on hover
- Transition: shadow 180ms

**Feature Card (Premium):**
- Glass effect background
- Wave arc accent (top-right corner)
- Gradient border (subtle, 1px)
- Shadow: lg with glow effect
- Hover: Lift slightly (translateY -4px)

**Interactive Card:**
- Cursor: pointer
- Hover: Scale 1.01, shadow lg, subtle glow
- Active: Scale 0.99
- Focus: Ring with primary color

### Input Treatments

**Text Input:**
- Background: Input semantic color
- Border: 2px solid border color
- Border radius: md
- Padding: 12px 16px
- Focus: Border primary, ring 4px primary/20
- Error: Border error 500, ring error/20
- Success: Border success 500, ring success/20

**Textarea:**
- Same as text input
- Min height: 120px
- Resize: vertical

**Select/Dropdown:**
- Same as text input
- Icon: chevron-down (12px)
- Dropdown: Glass card with shadow xl

---

## Visual Hierarchy Rules

### Spacing Scale (8px Grid)

**Component Spacing:**
- **xs (4px):** Tight inline elements
- **sm (8px):** Related items
- **md (16px):** Component internal spacing
- **lg (24px):** Between sections within a container
- **xl (32px):** Between major sections
- **2xl (48px):** Between page regions

**Layout Spacing:**
- Container padding: 16px (mobile), 24px (tablet), 32px (desktop)
- Section padding Y: 48px (mobile), 64px (tablet), 96px (desktop)
- Grid gap: 16px (mobile), 24px (desktop)

### Color Application

**Primary Color Usage:**
- Primary actions (CTAs)
- Links
- Active states
- Brand elements

**Accent Color Usage:**
- Secondary actions
- Highlights
- Special features
- Decorative elements

**Neutral Colors:**
- Text: 900 (light), 50 (dark)
- Borders: 200 (light), 800 (dark)
- Backgrounds: 50-100 (light), 900-950 (dark)

**Semantic Colors:**
- Success: Confirmations, completed states
- Warning: Cautions, pending states
- Error: Errors, destructive actions

### Typography Scale Application

**Page Structure:**
```
Hero: 5xl-6xl display font
Section Heading: 3xl-4xl
Subsection: 2xl-3xl
Card Title: xl-2xl
Body Text: base-lg
UI Text: sm-base
Caption: xs-sm
```

---

## Accessibility Standards

### Color Contrast

**WCAG AAA Compliance:**
- Text on background: Minimum 7:1 contrast
- Large text (18pt+): Minimum 4.5:1
- UI elements: Minimum 3:1

**Contrast Checker:**
- Test all semantic colors against backgrounds
- Provide high-contrast mode option
- Never rely on color alone for information

### Focus States

**Keyboard Navigation:**
- All interactive elements must have visible focus
- Focus ring: 4px with primary color at 40% opacity
- Skip to main content link
- Logical tab order

**Focus Ring Standard:**
```css
.focus-ring {
  outline: none;
  box-shadow: 0 0 0 4px var(--primary);
  opacity: 0.4;
}
```

### Motion Preferences

**Reduced Motion:**
- Respect `prefers-reduced-motion` media query
- Disable all non-essential animations
- Keep critical transitions (< 50ms)
- Provide static alternatives for animated content

### Screen Readers

**ARIA Implementation:**
- Proper landmark roles
- Descriptive labels for all interactive elements
- Live regions for dynamic content
- Hidden decorative elements

---

## Dark Mode Strategy

### Color Adaptation

**Automatic Switching:**
```css
/* Light mode (default) */
:root {
  --background: var(--color-neutral-50);
  --foreground: var(--color-neutral-900);
}

/* Dark mode (system preference) */
@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--color-neutral-950);
    --foreground: var(--color-neutral-50);
  }
}

/* Dark mode (manual toggle) */
[data-theme="dark"] {
  --background: var(--color-neutral-950);
  --foreground: var(--color-neutral-50);
}
```

**Adjustments:**
- **Shadows:** Stronger, more visible in dark mode
- **Borders:** Higher opacity for definition
- **Glow Effects:** More prominent
- **Glass Effects:** Darker background tint

### Testing Requirements

**Cross-theme Validation:**
- Test all components in both modes
- Verify contrast ratios
- Check shadow visibility
- Validate glass effect legibility

---

## Implementation Checklist

### Design System Foundation
- [x] Design tokens (JSON)
- [x] CSS custom properties
- [x] Tailwind configuration
- [x] Brand system documentation
- [ ] Component primitives (Button, Card, Input)
- [ ] Typography components
- [ ] Motion utilities

### Quality Assurance
- [ ] Accessibility audit (WCAG AAA)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile responsiveness testing (320px - 2560px)
- [ ] Dark mode validation
- [ ] Performance benchmarks (< 50ms paint times)
- [ ] Reduced motion testing

### Documentation
- [x] Brand system guide (this document)
- [ ] Component usage examples
- [ ] Storybook setup (optional)
- [ ] Design handoff specifications

---

## Usage Examples

### Hero Section with Wave Arc

```jsx
<section className="relative overflow-hidden">
  {/* Gradient mesh background */}
  <div className="absolute inset-0 bg-gradient-mesh opacity-60" />

  {/* Wave arc decoration */}
  <svg className="absolute top-0 left-0 w-full h-24 text-primary-500 opacity-15">
    <path d="M0,60 Q360,0 720,60 T1440,60 L1440,120 L0,120 Z" fill="currentColor" />
  </svg>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-6 py-24">
    <h1 className="text-6xl font-display font-bold gradient-text">
      Create. Perform. Inspire.
    </h1>
    <p className="text-xl text-muted-foreground mt-6">
      AI-powered music video generation platform
    </p>
  </div>
</section>
```

### Glass Card with Glow

```jsx
<div className="glass rounded-xl p-6 shadow-lg hover:shadow-glow-primary transition-all duration-base">
  <h3 className="text-2xl font-semibold">Feature Title</h3>
  <p className="text-muted-foreground mt-2">Feature description...</p>
</div>
```

### Premium Button

```jsx
<button className="relative px-8 py-4 bg-gradient-primary text-white rounded-lg shadow-md hover:shadow-glow-primary hover:scale-102 active:scale-98 transition-all duration-fast ease-spring">
  <span className="font-medium">Get Started</span>
</button>
```

---

**Last Updated:** 2025-01-20
**Version:** 1.0.0
**Status:** Foundation Complete
