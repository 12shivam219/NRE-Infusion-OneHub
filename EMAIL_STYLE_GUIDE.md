# Email UI/UX Visual Style Guide

## Design System

### Color Palette

#### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #2563eb | Primary actions, links, focus states |
| Success Green | #10b981 | Success messages, confirmations |
| Warning Orange | #f97316 | Warnings, limits approaching |
| Error Red | #ef4444 | Errors, destructive actions |

#### Text Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Dark Text | #111827 | Headers, primary text |
| Body Text | #4b5563 | Standard body copy |
| Secondary Text | #6b7280 | Less important text |
| Light Text | #9ca3af | Placeholder text |

#### Background Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Card Background | #ffffff | Main content cards |
| Input Background | #f9fafb | Input fields, light sections |
| Section Background | #f3f4f6 | Section containers |
| Page Background | #f7f8fa | Overall page (implement at parent) |

#### Border Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Border | #e5e7eb | Main borders |
| Secondary Border | #d1d5db | Hover borders |
| Light Border | #f0f1f3 | Very subtle dividers |

---

## Typography

### Type Scale
```
Heading 4 (h4):     18px, weight 700, letter-spacing -0.3px
Body 2:             14px, weight 600 (labels), 400 (body)
Caption:            12px, weight 400 or 600
Small:              11px, weight 700 (uppercase labels)
```

### Text Styling
- **Section Headers:** 18px bold, #111827, -0.3px letter-spacing
- **Labels:** 14px semi-bold, #111827
- **Body Text:** 14px regular, #4b5563, 1.5 line-height
- **Helper Text:** 12px regular, #6b7280
- **Overline:** 11px bold uppercase, #4b5563, 0.5px letter-spacing

---

## Components

### Cards/Paper Components
```
Background:       #ffffff
Border:           1px solid #e5e7eb
Border-Radius:    8px
Padding:          24-32px (1.5rem-2rem)
Box-Shadow:       0 1px 3px rgba(0, 0, 0, 0.1)
Transition:       all 0.2s ease
Hover Shadow:     0 2px 4px rgba(0, 0, 0, 0.08)
```

### Buttons

#### Primary Button
```
Background:       #2563eb
Text Color:       #ffffff
Font-Weight:      600
Border-Radius:    6px
Padding:          8px 16px
Text-Transform:   none (sentence case)
Transition:       background-color 0.2s ease

States:
Hover:            #1d4ed8
Focus:            #1d4ed8 + outline
Disabled:         #e5e7eb bg, #9ca3af text
```

#### Secondary Button (Outlined)
```
Background:       transparent
Border:           1px solid #e5e7eb
Text Color:       #4b5563
Font-Weight:      600
Border-Radius:    6px
Padding:          8px 16px
Text-Transform:   none

States:
Hover:            rgba(37, 99, 235, 0.08) background
Focus:            #2563eb border
Disabled:         #e5e7eb border, #9ca3af text
```

#### Text Button
```
Background:       transparent
Border:           none
Text Color:       #2563eb
Font-Weight:      600
Border-Radius:    6px
Padding:          4px 8px
Text-Transform:   none

States:
Hover:            rgba(37, 99, 235, 0.1) background
Focus:            rgba(37, 99, 235, 0.2) background
```

### Input Fields
```
Background:       #f9fafb
Border:           1px solid #e5e7eb
Border-Radius:    6px
Padding:          8px 12px
Transition:       all 0.2s ease

States:
Hover:            border #d1d5db
Focus:            #2563eb border + shadow
Focus Shadow:     0 0 0 3px rgba(37, 99, 235, 0.1)

Placeholder:      color #9ca3af, opacity 1
```

### Toolbar
```
Background:       #f9fafb
Border:           1px solid #e5e7eb
Border-Radius:    6px
Padding:          12px 16px
Divider Color:    #d1d5db

Icon Buttons:
Default:          color #4b5563
Hover:            bg rgba(37, 99, 235, 0.1), color #2563eb
Border-Radius:    6px
Transition:       all 0.2s ease
```

### Chips
```
Background:       #f3f4f6
Border:           1px solid #d1d5db
Border-Radius:    4px
Text Color:       #111827
Font-Weight:      500
Padding:          6px 12px

Variants:
Outlined:         #f3f4f6 bg, #d1d5db border
Filled (Success): #ecfdf5 bg, #6ee7b7 border, #10b981 text
```

### Progress Bar
```
Background Track: #e5e7eb
Border-Radius:    4px
Height:           8px

Bar Colors:
0-60%:            #10b981 (green)
60-75%:           #eab308 (yellow)
75-90%:           #f97316 (orange)
90-100%:          #ef4444 (red)
```

---

## Spacing System

### Standard Spacing (rem = 16px)
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  12px  (0.75rem)
lg:  16px  (1rem)
xl:  24px  (1.5rem)
2xl: 32px  (2rem)
```

### Layout Spacing
- **Between Sections:** 32px (2rem)
- **Within Sections:** 24px (1.5rem)
- **Between Form Fields:** 16px (1rem)
- **Between Chips/Items:** 12px (0.75rem)

---

## Responsive Design

### Breakpoints
```
XS (Mobile):      0px - 599px
SM (Tablet):      600px - 959px
MD (Tablet Landscape): 960px - 1279px
LG (Desktop):     1280px - 1919px
XL (Large Screen):1920px+
```

### Mobile-First Approach
- Design for mobile first
- Enhance for larger screens
- Touch-friendly sizes (44x44px minimum)
- Readable font sizes on small screens (14px minimum)

---

## Shadows

### Box Shadow System
```
Subtle:    0 1px 2px rgba(0, 0, 0, 0.05)
Small:     0 1px 3px rgba(0, 0, 0, 0.1)
Medium:    0 2px 4px rgba(0, 0, 0, 0.08)
Large:     0 4px 8px rgba(0, 0, 0, 0.12)
XL:        0 8px 16px rgba(0, 0, 0, 0.15)

Sticky Element (top shadow):
           0 -2px 8px rgba(0, 0, 0, 0.08)
```

---

## Transitions & Animations

### Standard Transition
```
Duration:         0.2s
Easing:           ease
Properties:       all or specific (all 0.2s ease)
```

### Animation Examples
```
Drag-Drop Pulse:  1s infinite
Opacity:          0% → 100%

Use for:
- Hover effects
- Focus states
- Drag-drop feedback
- State changes
```

---

## Accessibility Standards

### Color Contrast
- **Normal Text:** 4.5:1 minimum (WCAG AA)
- **Large Text (18px+):** 3:1 minimum
- **UI Components:** 3:1 minimum
- **All combinations in this guide exceed AA standards**

### Focus Indicators
```
Style:     Solid outline or shadow
Color:     #2563eb
Width:     2-3px
Offset:    2px from element
Contrast:  High and visible
```

### Touch Targets
- **Minimum Size:** 44x44px
- **Spacing:** 8px minimum between targets
- **Text-Only Buttons:** Properly padded for touch

---

## Examples

### Card with Header and Content
```
┌─────────────────────────────────────────┐
│ ✉️ Section Header                       │  ← 18px bold, #111827
│ Helper text explaining the section     │  ← 14px, #4b5563
├─────────────────────────────────────────┤
│                                         │
│ Input or content area                   │  ← 14px body copy
│                                         │
├─────────────────────────────────────────┤
│ ⭐ Set as Default        [Action Button] │  ← 14px, #2563eb action
└─────────────────────────────────────────┘

Spacing: 2rem between sections, 1.5rem inside card
Background: #ffffff card on #f7f8fa page
Borders: #e5e7eb, 8px radius, subtle shadow
```

### Form Input
```
Label Text                            ← 14px bold, #111827
┌──────────────────────────────────┐
│ Placeholder text in gray         │  ← #9ca3af, 14px
└──────────────────────────────────┘
Helper text or error message       ← 12px, #6b7280 or #ef4444

Input Styling:
Background: #f9fafb
Border: 1px solid #e5e7eb
Radius: 6px
Focus: #2563eb border + shadow
```

### Button States
```
[Primary Button] [Secondary Button] [Text Action]

Primary:     #2563eb bg, white text
Secondary:   Outlined, #e5e7eb border
Text:        No bg, #2563eb text

Hover:       Darker background or border
Focus:       Visible outline, same as hover
Disabled:    #e5e7eb bg, #9ca3af text
```

---

## Implementation Checklist

- [ ] All cards use #ffffff background with subtle shadow
- [ ] Section headers are 18px bold #111827
- [ ] All buttons use 6px border-radius
- [ ] Primary buttons are #2563eb
- [ ] Input fields have #f9fafb background
- [ ] Spacing between sections is 2rem (32px)
- [ ] Focus states are visible and blue (#2563eb)
- [ ] Color contrast meets WCAG AA
- [ ] Transitions use 0.2s ease
- [ ] All interactive elements have hover states
- [ ] Responsive design works at all breakpoints
- [ ] ARIA labels present on all icon buttons
- [ ] Empty states have helpful messaging

---

## Quick Reference

### Colors by Use
```
Primary Actions:        #2563eb
Success/Complete:       #10b981
Warnings:               #f97316
Errors:                 #ef4444
Primary Text:           #111827
Secondary Text:         #4b5563
Borders:                #e5e7eb
Card Backgrounds:       #ffffff
Input Backgrounds:      #f9fafb
```

### Typography Sizes
```
Headers:   18px (bold)
Body:      14px (regular)
Labels:    14px (semi-bold)
Help:      12px (regular)
```

### Common Spacings
```
Between Sections: 32px
Within Sections:  24px
Between Items:    12-16px
```

---

This style guide ensures consistency across all email UI components and provides a foundation for future improvements.
