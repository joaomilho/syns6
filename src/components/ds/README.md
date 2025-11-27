# Design System (ds)

A collection of reusable UI components with consistent styling across the app.

## Typography Component

A collection of typography components with consistent styling.

### H1 - Main Heading

Large, bold, white heading using Geist font.

#### Import

```typescript
import { H1 } from '@/components/ds';
```

#### Props

```typescript
interface H1Props extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  // ... all standard h1 props (className, id, onClick, etc.)
}
```

#### Styling

- **Font Size:** 3rem (48px) on desktop, 2rem (32px) on mobile
- **Font Weight:** 700 (bold)
- **Color:** #ffffff (white)
- **Font Family:** Geist Sans
- **Margin:** 0 0 1rem 0
- **Line Height:** 1.2

#### Examples

```tsx
// Basic usage
<H1>Start your free trial</H1>

// With additional className
<H1 className={styles.customClass}>
  Welcome to Syns6
</H1>

// With other HTML attributes
<H1 id="main-title" aria-label="Page title">
  Pricing
</H1>
```

---

## Button Component

A flexible button component with multiple sizes and colors.

### Import

```typescript
import { Button } from '@/components/ds';
// or
import Button from '@/components/ds/Button';
```

### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'small' | 'medium' | 'cta';  // Default: 'medium'
  color?: 'green' | 'red' | 'white' | 'blue';  // Default: 'green'
  children: React.ReactNode;
  // ... all standard button props (onClick, disabled, type, etc.)
}
```

### Sizes

- **`small`** - Like the "Generate" button in AI creation flow
  - padding: 12px 24px
  - font-size: 14px
  - border-radius: 22px

- **`medium`** - In between small and cta (default)
  - padding: 15px 36px
  - font-size: 17px
  - border-radius: 28px

- **`cta`** - Like the "Join" CTA on home page
  - padding: 18px 48px
  - font-size: 20px
  - border-radius: 36px

### Colors

- **`green`** (default) - #0f0 with glow effect
- **`red`** - Error/destructive actions
- **`white`** - Like "Cancel" in AI flow
- **`blue`** - Info/secondary actions

### Background

All buttons use `backdrop-filter: blur(20px)` for that classic blurred glass effect.

### Examples

```tsx
// Default - Medium Green
<Button onClick={handleClick}>
  Click Me
</Button>

// Small White (Cancel style)
<Button size="small" color="white" onClick={onCancel}>
  Cancel
</Button>

// CTA Green (Join style)
<Button size="cta" color="green" onClick={onJoin}>
  Join the waitlist
</Button>

// Small Red
<Button size="small" color="red" onClick={onDelete}>
  Delete
</Button>

// Medium Blue
<Button size="medium" color="blue" onClick={onSave}>
  Save & Continue
</Button>

// With disabled state
<Button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// As a submit button in form
<Button type="submit" size="cta" color="green">
  Generate Visualization
</Button>
```

### Styling Details

#### Hover Effects
- Small: `translateY(-1px)`
- Medium: `translateY(-1.5px)`
- CTA: `translateY(-2px)`

#### States
- **Disabled**: 50% opacity, no hover effects
- **Active** (pressed): No transform
- **Hover**: Brightness increase + box shadow glow

#### Border Thickness
All buttons use `2px` solid borders matching their color scheme.

### Accessibility

The component extends native button props, so you can use:
- `aria-label`
- `aria-describedby`
- `title`
- All other ARIA attributes

### Usage Tips

1. **Use CTA size sparingly** - Only for primary actions
2. **Green is for positive actions** - Sign up, join, create, etc.
3. **Red is for destructive actions** - Delete, remove, cancel subscription
4. **White is for neutral/secondary actions** - Cancel, go back
5. **Blue is for info/helpful actions** - Save, learn more, view details

### Customization

You can pass additional className for custom overrides:

```tsx
<Button className={styles.myCustomButton} size="small">
  Custom
</Button>
```

Note: The component uses CSS modules, so styles are scoped by default.

