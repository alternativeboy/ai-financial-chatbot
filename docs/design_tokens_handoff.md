# 🎨 Handoff — Design Tokens (Financial Data Chat, v3 theme)

> **คู่กับ** [`simple_clone_handoff.md`](simple_clone_handoff.md) — ไฟล์นั้นบอกว่าจะ *สร้างอะไร*
> ไฟล์นี้บอกว่ามัน *หน้าตาเป็นยังไง* copy-paste ได้ทั้งดุ้น ไม่ต้องเปิดโปรเจ็กต้นฉบับ
>
> เขียนเมื่อ: 2026-07-22 · สกัดจาก frontend ที่ ship แล้ว (FR-024 UI/UX redesign, signed off)

---

## 0. อ่านยังไง

| ต้องการ | ไปที่ |
|---|---|
| ตั้งโปรเจ็กใหม่ให้หน้าตาเหมือนกัน | §2 → §3 → §4 → §5 copy ตามลำดับ (พอแล้ว) |
| เข้าใจว่าทำไมเขียนแบบนี้ | §1 (กลไก token), §6 (สองโซน) |
| ทำ component ให้ตรง | §9 สูตรของแต่ละชิ้น |
| ทำกราฟ | §10 — **อ่านให้จบก่อนเขียนโค้ดกราฟบรรทัดแรก** |
| รู้ว่าอันไหนไม่ต้องเอาไป | §11 (ตายไปกับ auth/usage) และ §12 (หนี้ที่ควรใช้ก่อนลอก) |

---

## 1. กลไก token — ทำไมเป็น oklch triplet เปล่าๆ

ทุก color token เก็บเป็น **"L C H" เปล่าๆ ไม่มี `oklch()` ครอบ**:

```css
--primary: 0.72 0.19 155;   /* ไม่ใช่ oklch(0.72 0.19 155) */
```

แล้ว Tailwind ครอบให้พร้อมช่อง alpha:

```js
const c = (v) => `oklch(var(${v}) / <alpha-value>)`;
```

**เหตุผล:** ทำแบบนี้แล้ว utility แบบ `/opacity` ยังใช้ได้ (`bg-primary/20`, `text-foreground/60`)
ถ้าเก็บเป็น `oklch(...)` เต็มรูป Tailwind จะแทรก alpha ไม่ได้ และทุก opacity variant จะพัง

**เหตุผลที่ใช้ OKLCH ไม่ใช่ HSL:** ปรับ L แล้วความสว่างที่ตาเห็นเปลี่ยนสม่ำเสมอจริง
เขียว `oklch(0.72 …)` กับ น้ำเงิน `oklch(0.72 …)` สว่างเท่ากันจริง — HSL ทำไม่ได้
เรื่องนี้สำคัญตอนทำ palette กราฟ (§10) เพราะ validator ตรวจ lightness band

> ⚠️ ถ้าจะแก้ token ให้แก้ที่ triplet **อย่าเผลอใส่ `oklch()` กลับเข้าไป** ทั้งระบบ opacity จะพังเงียบๆ

---

## 2. Color tokens — `src/index.css`

copy ทั้งบล็อกได้เลย (บรรทัดที่มาร์ค 🗑️ ให้ลบทิ้งในโคลน — ดู §11)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * v3 theme — พื้นหลักสีอ่อน (blue-gray neutrals, hue 220) + sidebar navy-teal เข้ม,
 * primary เขียวมรกตสด, gradient เขียว→เทอร์ควอยซ์ + glow
 * Token เป็น oklch "L C H" เปล่าๆ ใช้ผ่าน oklch(var(--x) / <alpha-value>)
 */
@layer base {
  :root {
    --background: 1 0 0;              /* พื้นขาว */
    --foreground: 0.18 0.02 220;      /* ตัวอักษร navy เกือบดำ */
    --card: 1 0 0;
    --card-foreground: 0.25 0.02 220;
    --popover: 1 0 0;
    --popover-foreground: 0.25 0.02 220;
    --primary: 0.72 0.19 155;         /* เขียวมรกตสด */
    --primary-foreground: 1 0 0;
    --secondary: 0.92 0.05 155;       /* เขียวอ่อน — badge/accent */
    --secondary-foreground: 0.4 0.08 155;
    --muted: 0.96 0.006 220;          /* blue-gray กลาง — hover */
    --muted-foreground: 0.55 0.015 220;
    --accent: 0.92 0.05 155;
    --accent-foreground: 0.4 0.08 155;
    --destructive: 0.58 0.17 28;      /* terracotta — ปุ่มยืนยันลบ (ธีมนี้ไม่มีสีแดง) */
    --destructive-foreground: 1 0 0;
    --border: 0.92 0.006 90;
    --input: 0.91 0.006 90;
    --ring: 0.72 0.19 155;
    --radius: 0.75rem;

    /* 🗑️ ลบใน clone — ใช้กับ usage-limit banner เท่านั้น ซึ่งถูกตัดออกแล้ว */
    --warning: 0.97 0.04 55;
    --warning-border: 0.83 0.09 60;
    --warning-foreground: 0.32 0.07 55;

    /* ✨ เพิ่มใหม่ในโคลน — โซนมืด (ดู §6/§12) */
    --sidebar-from: 0.18 0.03 220;
    --sidebar-to: 0.14 0.025 240;
    --sidebar-foreground: 0.68 0.02 220;
    --sidebar-muted: 0.6 0.02 220;
    --sidebar-label: 0.55 0.02 145;
    --sidebar-active: 0.28 0.04 175;
    --sidebar-active-foreground: 0.92 0.03 155;
    --sidebar-marker: 0.75 0.19 155;
  }

  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  ::selection { background: oklch(0.75 0.15 155 / 0.35); }

  /* Accessibility: เคารพ prefers-reduced-motion — ปิด animation/transition ทั้งระบบ */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

> บล็อก `prefers-reduced-motion` **ห้ามตัด** — ธีมนี้มี animation วนลูปหลายตัว (§8)
> ถ้าไม่มีบล็อกนี้ ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหวจะเจอ orb ลอย + glow เต้นตลอดเวลา

---

## 3. `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
const c = (v) => `oklch(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],   // ← ใส่ให้ครบ
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: c('--border'),
        input: c('--input'),
        ring: c('--ring'),
        background: c('--background'),
        foreground: c('--foreground'),
        primary:     { DEFAULT: c('--primary'),     foreground: c('--primary-foreground') },
        secondary:   { DEFAULT: c('--secondary'),   foreground: c('--secondary-foreground') },
        destructive: { DEFAULT: c('--destructive'), foreground: c('--destructive-foreground') },
        muted:       { DEFAULT: c('--muted'),       foreground: c('--muted-foreground') },
        accent:      { DEFAULT: c('--accent'),      foreground: c('--accent-foreground') },
        card:        { DEFAULT: c('--card'),        foreground: c('--card-foreground') },
        popover:     { DEFAULT: c('--popover'),     foreground: c('--popover-foreground') },
        // ✨ โซนมืดกลายเป็น token จริง (เดิม hardcode — ดู §12)
        sidebar: {
          foreground: c('--sidebar-foreground'),
          muted:      c('--sidebar-muted'),
          label:      c('--sidebar-label'),
          active:     c('--sidebar-active'),
          'active-foreground': c('--sidebar-active-foreground'),
          marker:     c('--sidebar-marker'),
        },
      },
      backgroundImage: {
        emerald:        'linear-gradient(135deg, oklch(0.72 0.19 155), oklch(0.6 0.18 172))',
        'emerald-soft': 'radial-gradient(closest-side, oklch(0.85 0.14 155 / 0.35), transparent)',
        'sidebar-dark': 'linear-gradient(165deg, oklch(var(--sidebar-from)), oklch(var(--sidebar-to)))',
        'sql-dark':     'linear-gradient(165deg, oklch(0.2 0.03 250), oklch(0.15 0.025 260))',
        'table-head':   'linear-gradient(90deg, oklch(0.95 0.03 155), oklch(0.96 0.015 200))',
        shimmer:
          'linear-gradient(90deg, oklch(0.95 0.006 90) 25%, oklch(0.9 0.02 155) 37%, oklch(0.95 0.006 90) 63%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        green:      '0 6px 16px oklch(0.65 0.19 155 / 0.4)',
        'green-lg': '0 8px 20px -6px oklch(0.6 0.18 165 / 0.5)',
        card:       '0 4px 16px -8px oklch(0.2 0.02 220 / 0.14)',
        frame:      '0 2px 4px oklch(0.2 0 0 / 0.04), 0 40px 80px -20px oklch(0.35 0.1 155 / 0.28)',
      },
      keyframes: {
        caret:   { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        glowPulse: {
          '0%,100%': { boxShadow: '0 6px 16px oklch(0.65 0.19 155 / 0.4)' },
          '50%':     { boxShadow: '0 6px 22px oklch(0.65 0.19 155 / 0.65)' },
        },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        orbFloat: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '25%':     { transform: 'translate(30px,-40px) scale(1.1)' },
          '50%':     { transform: 'translate(-20px,20px) scale(0.95)' },
          '75%':     { transform: 'translate(15px,30px) scale(1.05)' },
        },
        particleFade: {
          '0%,100%': { opacity: '0', transform: 'translateY(0)' },
          '50%':     { opacity: '0.4', transform: 'translateY(-20px)' },
        },
      },
      animation: {
        caret:             'caret 1s steps(1) infinite',
        shimmer:           'shimmer 1.6s linear infinite',
        glow:              'glowPulse 3.5s ease-in-out infinite',
        'gradient-shift':  'gradientShift 6s ease infinite',
        'orb-float':       'orbFloat 20s ease-in-out infinite',
        particle:          'particleFade 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
```

deps ที่ต้องลง: `tailwindcss` `postcss` `autoprefixer` `@tailwindcss/typography` `tailwindcss-animate`
`clsx` `tailwind-merge` (สำหรับ `cn()`) `class-variance-authority` (ปุ่ม)

---

## 4. Typography

```html
<!-- index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

| Family | Tailwind | ใช้ตรงไหน |
|---|---|---|
| **Plus Jakarta Sans** 400–800 | `font-sans` (default) | UI ทั้งหมด, prose, หัวข้อ |
| **IBM Plex Mono** 400–700 | `font-mono` | SQL, ชื่อ tool, ตัวเลขในกราฟ, label หมวดใน sidebar, ป้ายสถานะ |

> 🗑️ ต้นฉบับโหลด **Inter** มาด้วย แต่ใช้ที่หน้า login ที่เดียว — โคลนไม่มี login **ให้ตัด Inter ออกจาก URL**
> (ลดขนาดที่โหลด 1 family เต็มๆ)

**ขนาดที่ธีมนี้ใช้จริง** — เป็น scale แบบ arbitrary ไม่ใช่ scale ของ Tailwind ล้วน:

| ใช้ที่ | class |
|---|---|
| ข้อความคำตอบของ assistant | `text-[14.5px] leading-relaxed` |
| ข้อความ/ป้ายทั่วไป | `text-[13px]` |
| นับแถว, meta | `text-[12px]` / `text-xs` |
| label หมวดใน sidebar | `text-[10.5px] font-bold uppercase tracking-[0.1em]` |
| หัวข้อหน้าจอว่าง | `text-2xl lg:text-[28px] font-extrabold tracking-tight` |

---

## 5. Radius

`--radius: 0.75rem` (12px) เป็นฐาน แต่ธีมใช้ค่า arbitrary เยอะ — ตารางนี้คือของจริง:

| ค่า | ใช้กับ |
|---|---|
| `rounded-full` | จุดสถานะ, badge นับแถว, avatar |
| `rounded-[7px]` | ไอคอนสี่เหลี่ยมเล็กใน widget |
| `rounded-lg` (=12px) | ปุ่มไอคอน, แถบ shimmer |
| `rounded-[11px]` | รายการใน sidebar, ปุ่มรอง |
| `rounded-xl` | ปุ่มหลัก |
| `rounded-[18px]` | การ์ด ToolCallWidget |
| `rounded-2xl` | แบนเนอร์, กล่องใหญ่ |

---

## 6. สถาปัตยกรรมพื้นผิว — สองโซน

นี่คือแนวคิดหลักของธีม **จำไว้ข้อเดียวพอ:**

```
┌─────────────┬──────────────────────────────────┐
│  โซนมืด      │  โซนสว่าง                          │
│  (sidebar)  │  (chat)                          │
│  284px      │  flex-1                          │
│             │                                  │
│ bg-sidebar- │ bg-gradient-to-b from-white      │
│    dark     │    to-[oklch(0.985 0.006 145)]   │
│             │                                  │
│ token       │ token --background/--foreground  │
│ --sidebar-* │ (ตัวอักษรเข้มบนพื้นขาว)              │
│ (ตัวอักษร    │                                  │
│  อ่อนบนพื้นเข้ม)│  ← กราฟ/ตาราง/SQL อยู่ในโซนนี้      │
└─────────────┴──────────────────────────────────┘
```

**กฎ:**
- `--foreground` / `--muted-foreground` เป็นของ**โซนสว่างเท่านั้น** ห้ามใช้ใน sidebar (จะอ่านไม่ออก)
- ใน sidebar ใช้ `text-sidebar-foreground` / `text-sidebar-muted` / `text-sidebar-label`
- hover ใน sidebar ใช้ `hover:bg-white/[0.06]` (ไม่ใช่ `hover:bg-muted`)
- **แถบ SQL (`bg-sql-dark`) เป็นโซนมืดเล็กๆ ที่ฝังในโซนสว่าง** — ข้างในต้องใช้ตัวอักษรอ่อนเหมือนกัน
- responsive: ต่ำกว่า `lg` sidebar กลายเป็น drawer (`fixed inset-y-0 left-0 z-40` +
  `-translate-x-full` / `translate-x-0`, `transition-transform duration-300`) พร้อม backdrop

---

## 7. Gradient — ใช้อันไหนตอนไหน

| ชื่อ | ใช้กับ | หมายเหตุ |
|---|---|---|
| `bg-emerald` | ปุ่มหลัก, ไอคอนแบรนด์, จุดเน้น | 135° เขียว→เทอร์ควอยซ์ ตัวตนของแบรนด์ |
| `bg-emerald-soft` | glow เรืองด้านหลัง | radial โปร่ง ใช้เป็น layer หลัง |
| `bg-sidebar-dark` | พื้น sidebar | 165° navy→navy เข้มกว่า |
| `bg-sql-dark` | พื้นแถบโค้ด SQL | 165° น้ำเงินอมม่วง — **ตั้งใจให้ต่างจาก sidebar** เพื่อไม่ให้อ่านว่าเป็นโซนเดียวกัน |
| `bg-table-head` | หัวตาราง markdown | เขียวจางแนวนอน |
| `bg-shimmer` | skeleton ตอนกำลังโหลด | ต้องคู่กับ `bg-[length:200%_100%] animate-shimmer` ถึงจะขยับ |

---

## 8. Motion

| animation | ระยะ | ใช้กับ |
|---|---|---|
| `animate-caret` | 1s steps(1) | เคอร์เซอร์กะพริบท้ายข้อความที่กำลัง stream |
| `animate-shimmer` | 1.6s linear | skeleton ระหว่างรอ token แรก |
| `animate-glow` | 3.5s ease-in-out | ปุ่มส่ง/จุดเน้นหายใจ |
| `animate-gradient-shift` | 6s ease | gradient เลื่อน (ต้องมี `bg-[length:200%_200%]`) |
| `animate-orb-float` | 20s ease-in-out | orb ฉากหลังหน้าจอว่าง |
| `animate-particle` | 4s ease-in-out | อนุภาคลอยฉากหลัง |

จาก `tailwindcss-animate` ที่ใช้บ่อย: `animate-in fade-in slide-in-from-bottom-3 duration-300`
(ข้อความเข้า), `slide-in-from-top-1` (แผงกาง)

> **ห้ามลืม:** ทุก animation ในตารางนี้วนลูปไม่รู้จบ → บล็อก `prefers-reduced-motion` ใน §2 คือสิ่งที่กันไม่ให้มันกวนผู้ใช้

---

## 9. สูตร component (class จริงจากของที่ ship แล้ว)

### ปุ่ม (`cva`)
```
base:    inline-flex items-center justify-center rounded-xl text-sm font-semibold h-10
         transition disabled:pointer-events-none disabled:opacity-50
default: bg-emerald text-primary-foreground shadow-green hover:brightness-105
outline: border border-input bg-background hover:bg-muted
ghost:   hover:bg-muted
destructive: bg-destructive text-destructive-foreground hover:bg-destructive/90
```

### ToolCallWidget (การ์ดโชว์ SQL)
```
การ์ด:    max-w-[640px] animate-in fade-in overflow-hidden rounded-[18px] border shadow-card
หัว:      flex w-full items-center justify-between gap-2 px-4 py-3.5 hover:bg-muted
ไอคอน:    flex h-6 w-6 items-center justify-center rounded-[7px] bg-emerald  (+ Database icon h-3 w-3 text-white)
ชื่อ tool: font-mono text-[13px] font-semibold text-foreground
"running…": text-xs text-muted-foreground
นับแถว:   rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold
chevron:  h-4 w-4 text-muted-foreground transition-transform  (หมุน 180° ตอนกาง)
ตัวโค้ด:  animate-in fade-in slide-in-from-top-1 border-t duration-200 + bg-sql-dark
```
**เปิดกางไว้เป็นค่าเริ่มต้นระหว่างที่ query กำลังรัน** แล้วพับได้เมื่อเสร็จ — SQL ต้อง "เห็นได้"
ตามข้อกำหนด ไม่ใช่ต้องคลิกหา

### StreamingIndicator
```
3 จุด:    h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_…]  (หน่วง 0/150/300ms)
ข้อความ:  font-mono text-[13px] font-semibold text-muted-foreground
skeleton: h-[15px] w-[480px] max-w-full rounded-lg bg-shimmer bg-[length:200%_100%] animate-shimmer
          (แถวสอง w-[340px])
```

### ข้อความ
```
ของผู้ใช้:  flex justify-end → max-w-[520px] animate-in fade-in slide-in-from-bottom-3 whitespace-pre-wrap
ของ AI:    group/msg flex max-w-[640px] animate-in fade-in slide-in-from-bottom-3
เนื้อความ:  text-[14.5px] leading-relaxed text-foreground
ปุ่ม copy:  opacity-0 transition-opacity group-hover/msg:opacity-100   ← เผยตอน hover
หมายเหตุ partial: text-xs italic text-muted-foreground
error:     text-xs text-destructive
```

### รายการ conversation (โซนมืด — เขียนด้วย token ใหม่)
```
base:   group flex cursor-pointer items-center justify-between gap-2 rounded-[11px] px-3 py-2 transition
active: bg-sidebar-active/60 font-semibold text-sidebar-active-foreground
idle:   font-normal text-sidebar-foreground hover:bg-white/[0.06]
จุดหน้า: h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-marker   (เฉพาะตัวที่ active)
ถังขยะ:  shrink-0 text-sidebar-muted opacity-0 transition-opacity group-hover:opacity-100
```

---

## 10. Chart tokens — อ่านให้จบก่อนเขียนโค้ดกราฟ

กราฟในแอปนี้คือ **bar chart ซีรีส์เดียว** ที่ parse มาจากตาราง markdown ที่โมเดลตอบ
(หาคอลัมน์ตัวเลขคอลัมน์แรก) ถ้าไม่มีตาราง → ไม่ render อะไรเลย

### 10.1 Token ของกราฟ (ของจริงที่ใช้อยู่)

| ส่วน | ค่า |
|---|---|
| แท่ง (gradient แนวตั้ง) | บน `oklch(0.74 0.18 155)` (`#12cb76`) → ล่าง `oklch(0.55 0.17 170)` (`#008f62`) |
| เส้นแกน | `oklch(0.92 0.006 90)` — ค่าเดียวกับ `--border` |
| ตัวอักษรบนแกน | 11px, fill `oklch(0.5 0.015 145)` |
| cursor ตอน hover | `oklch(0.95 0.01 145)` |
| ตัวเลขบนแท่ง | IBM Plex Mono 11px, fill `oklch(0.5 0.015 145)` |
| ปลายแท่ง | มุมมน 4px เฉพาะด้านบน ยึดติดเส้นฐาน |
| ช่องไฟระหว่างแท่ง | ≥ 2px ของสีพื้น |

### 10.2 กฎที่ห้ามฝ่า

1. **ซีรีส์เดียว = ไม่ต้องมีกล่อง legend** — ชื่อกราฟบอกอยู่แล้วว่าคืออะไร legend จะเป็น noise
2. **แกนเดียวเท่านั้น ห้ามทำ dual-axis** (สอง y-scale) นี่คือความผิดพลาดอันดับหนึ่งของงานกราฟ
   ถ้าต้องเทียบสองหน่วยที่สเกลต่างกัน → แยกเป็นสองกราฟ หรือ index ให้ฐานเดียวกัน
3. **ตัวหนังสือใส่สีของ text token เสมอ ไม่ใช่สีของซีรีส์** — สีอยู่ที่แท่ง ตัวเลขอยู่ที่ ink
4. **ต้องมี tooltip ตอน hover เป็นค่าเริ่มต้น** กราฟใน HTML คือของที่ interact ได้ ไม่ใช่รูปนิ่ง
5. **สี status (good/warning/error) สงวนไว้** ห้ามหยิบมาใช้เป็น "ซีรีส์ที่ 4"
6. **กราฟอยู่บนพื้นสว่างเท่านั้น** แอปนี้ไม่มี dark mode ถ้าวันหนึ่งเพิ่ม
   **ห้าม auto-flip สี** ต้องเลือกสเต็ปใหม่แล้ว validate กับพื้นมืดใหม่ (§10.4)

### 10.3 ⚠️ ข้อผูกพัน: ตารางต้องอยู่คู่กราฟเสมอ

เขียวแบรนด์ (`#00c66d`) มี contrast กับพื้นขาวแค่ **2.2:1** ต่ำกว่าเกณฑ์ 3:1
ตามกฎแล้วต้องมี "ตัวชดเชย" คือ **label ที่มองเห็นได้ หรือมี table view**

ในแอปนี้ตัวชดเชยมีอยู่แล้วโดยโครงสร้าง — กราฟ render **ใต้ตาราง markdown ที่มันถูก parse มา**
ตารางนั้นคือ table view ตัวจริง

> 🔒 **ห้ามซ่อนตารางแล้วโชว์แต่กราฟ** ถ้าทำ ตัวชดเชยจะหายไปและกราฟจะไม่ผ่านเกณฑ์ accessibility
> ถ้าจำเป็นต้องซ่อนจริงๆ ต้องเพิ่ม label ตัวเลขบนทุกแท่งแทน

### 10.4 ถ้าวันหนึ่งต้องมีหลายซีรีส์

ใช้ลำดับนี้ **ตายตัว ห้ามวน** (ซีรีส์ที่ 5+ → ยุบเป็น "Other" หรือแยกเป็น small multiples):

| # | oklch | hex | บทบาท |
|---|---|---|---|
| 1 | `0.72 0.19 155` | `#00c66d` | emerald — แบรนด์ |
| 2 | `0.55 0.14 250` | `#1f74bf` | blue |
| 3 | `0.75 0.15 65` | `#ee9733` | amber |
| 4 | `0.52 0.19 305` | `#8341be` | violet |

ชุดนี้ **ผ่านการตรวจด้วยเครื่องมือแล้ว ไม่ได้กะเอา** ผลที่ได้:

```
[PASS] Lightness band     ทั้ง 4 อยู่ในช่วง L 0.43–0.77
[PASS] Chroma floor       ทั้ง 4 ≥ 0.1
[PASS] CVD separation     คู่ที่แย่สุด #ee9733↔#1f74bf ΔE 28.1 (protan) · tritan 17.8
[PASS] Normal-vision floor คู่ที่แย่สุด #1f74bf↔#00c66d ΔE 30.1
[WARN] Contrast vs surface #00c66d 2.2 · #ee9733 2.25 → ต้องมีตัวชดเชย (ดู §10.3)
```

**ถ้าจะเปลี่ยนสีใดสีหนึ่ง ต้องรันใหม่ ห้ามเดา:**
```bash
node scripts/validate_palette.js "#00c66d,#1f74bf,#ee9733,#8341be" --mode light
```
มี ≥ 2 ซีรีส์เมื่อไหร่ **ต้องมี legend** และถ้า ≤ 4 ซีรีส์ให้ direct-label ด้วย
เพื่อไม่ให้ตัวตนของข้อมูลขึ้นกับสีอย่างเดียว

---

## 11. อะไรตายไปกับ auth/usage — อย่าลอกมา

| ของ | เดิมใช้ที่ไหน | ทำยังไง |
|---|---|---|
| `--warning` / `--warning-border` / `--warning-foreground` | แบนเนอร์เตือนเกิน limit | **ลบ** |
| ฟอนต์ **Inter** + `fontFamily.inter` | หน้า login เท่านั้น | **ลบ** (ตัดออกจาก URL ของ Google Fonts ด้วย) |
| hex ดิบ `#0f1419` / `#f0f4f8` | หน้า login split-screen | **ลบ** — เป็นระบบสีที่ 3 ที่ไม่ควรมีอยู่แต่แรก |
| `animate-orb-float` / `animate-particle` | ฉากหลัง login + หน้าจอว่าง | **เก็บไว้** ยังใช้ที่หน้าจอว่างของแชท |

---

## 12. หนี้ที่ธีมนี้แบกมา — แก้ก่อนลอกจะคุ้มกว่า

**ปัญหา:** ต้นฉบับมีค่าสี `oklch(...)` เขียนตรงๆ ใน class string **~30 จุด กระจาย 10 ไฟล์**
เกือบทั้งหมดเป็นสีของโซนมืด ที่ไม่มี token ของตัวเอง ตัวอย่าง:

```tsx
// ต้นฉบับ — อ่านยาก แก้ทีเดียวหลายที่ไม่ได้
'bg-[oklch(0.28_0.04_175_/_0.6)] text-[oklch(0.92_0.03_155)]'
'text-[oklch(0.6_0.02_220)]'   // ← ซ้ำ 5 ที่
```

**ทำไมถึงเกิด:** ตอนออกแบบคิด token ไว้สำหรับโซนสว่างชุดเดียว พอเพิ่ม sidebar มืดทีหลัง
เลยไม่มีที่ให้ค่าสีไปอยู่ → หล่นลงไปใน class

**ทางแก้ (ทำแล้วใน §2/§3):** เพิ่ม `--sidebar-*` 8 ตัวแล้ว map เข้า `colors.sidebar` ของ Tailwind
โคลนควรเริ่มด้วยชุดที่แก้แล้ว **ไม่ใช่ลอกหนี้มาต่อ**

> ตัวเลขที่ใส่ใน `--sidebar-*` มาจาก literal ที่ใช้จริงในต้นฉบับ — หน้าตาเหมือนเดิมเป๊ะ ไม่ใช่การรีดีไซน์

---

## 13. Checklist ก่อนบอกว่าธีมเสร็จ

- [ ] `grep -rn "oklch(" src/ --include=*.tsx` → **ไม่เจอเลย** (สีทุกตัวมาจาก token)
- [ ] `grep -rn "#[0-9a-fA-F]\{6\}" src/` → ไม่เจอ hex ดิบ
- [ ] `bg-primary/20`, `text-foreground/60` ใช้ได้จริง (พิสูจน์ว่ากลไก alpha ไม่พัง)
- [ ] `--warning*` และ Inter ถูกลบหมดแล้ว
- [ ] เปิด DevTools ตั้ง "Emulate prefers-reduced-motion" → animation หยุดหมด
- [ ] ย่อจอต่ำกว่า `lg` → sidebar กลายเป็น drawer, ไม่มี scroll แนวนอน
- [ ] ถามคำถามที่ตอบเป็นตาราง → **เห็นทั้งตารางและกราฟ** (ตัวชดเชย §10.3 ยังอยู่)
- [ ] กราฟซีรีส์เดียว → ไม่มีกล่อง legend, มี tooltip ตอน hover
- [ ] แถบ SQL อ่านออกชัด (ตัวอักษรอ่อนบน `bg-sql-dark`)
- [ ] ถ้าแก้สีกราฟ → รัน `validate_palette.js` ใหม่แล้วผ่าน
