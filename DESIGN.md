# ChargeGuard Design Direction (DESIGN.md)

> Direction and visual language for the ChargeGuard IoT Charging Guardian & Battery Estimator.
> Functional, crafted, and purpose-driven telemetry interfaces.

---

## 1. Product Identity & Mood
- **Domain:** Mission-critical IoT edge telemetry and theft security guardian.
- **Tone & Mood:** Industrial, utilitarian, technical, surgical precision. Like an aviation flight instrument or modern aerospace control station.
- **Avoid:** Generic SaaS marketing cliches, decorative wavy gradients, random pastel badges, meaningless floating illustrations.

---

## 2. Color Palette & Functional Semantics
Every color has a strict operational meaning:

| Semantic Role | Color Hex / Tailwind | Meaning & Context |
| :--- | :--- | :--- |
| **Canvas Background** | `#090d16` (`bg-slate-950`) | Deep technical backdrop, minimal eye fatigue during night monitoring. |
| **Card Surface** | `#0f172a` (`bg-slate-900/80`) | Structured edge containers with subtle `border-slate-800`. |
| **Status 1: Normal / Safe** | `#10b981` (`emerald-500`) | Charging cable securely connected, stable environment. |
| **Status 2: Battery Full** | `#06b6d4` (`cyan-500`) | Battery charged $\ge 95\%$, safe trickle mode. |
| **Status 3: Warning** | `#f59e0b` (`amber-500`) | Grace period countdown (5 seconds), cable unplugged softly. |
| **Status 4: Danger / Alarm** | `#ef4444` (`red-500`) | Physical theft jerk detected or timeout expired; siren active. |
| **Offline / Inactive** | `#64748b` (`slate-500`) | Device powered off or web closed; passive silent standby. |

---

## 3. Typography & Data Readability
- **Primary Interface Font:** Modern Sans-Serif (`system-ui`, `-apple-system`, `Inter`, `sans-serif`) with tight letter-spacing for headers and status labels.
- **Data & Telemetry Font:** Monospace (`ui-monospace`, `JetBrains Mono`, `Consolas`, `monospace`) for:
  - Battery percentages (`92%`)
  - Motion SMV values (`2.45 m/s²`)
  - Accelerometer components (`X: 0.1, Y: 0.0, Z: 9.8`)
  - Mathematical formulas ($Y = mX + c$)
  - Timestamps and countdowns (`5s`, `19:24:00 WIB`)

---

## 4. Mobile Ergonomics (HP 1 & HP 2)
- **Touch Targets:** Minimum $48 \times 48\text{px}$ for critical actions (Disarm, Test Alarm, Start Guarding).
- **Stealth AMOLED Mode:** True `#000000` full-screen blackout to conserve OLED battery while maintaining `WakeLock` and sensor watchdogs.
- **Layout Integrity:** Zero horizontal overflow (`overflow-x: hidden`). All cards and tables reflow smoothly on portrait mobile screens.

---

## 5. Visual Consistency & UI Guidelines
- **No Cliché Purple Gradients:** Never apply decorative purple/pink gradients without functional reason.
- **No Fake Metrics:** Every number on the dashboard is derived from real incoming MQTT telemetry or real linear regression calculations.
- **Clear Information Density:** Prefer compact, scannable data panels over spread-out decorative whitespace.
