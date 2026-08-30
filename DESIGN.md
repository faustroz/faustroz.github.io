---
name: 4allx Personal Hub
description: A compact, private monochrome command console for one owner.
colors:
  ink: "#080808"
  panel: "#101010"
  panel-raised: "#171717"
  tool-surface: "#222222"
  line: "rgba(255, 255, 255, 0.06)"
  line-bright: "rgba(255, 255, 255, 0.12)"
  text: "#f5f5f5"
  muted: "#a1a1aa"
  accent: "#e5e7eb"
  accent-soft: "rgba(229, 231, 235, 0.14)"
  danger: "#ef4444"
  status-online: "#22c55e"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Manrope, sans-serif"
    fontSize: "clamp(2rem, 3vw, 3rem)"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Manrope, Geist Sans, sans-serif"
  label:
    fontFamily: "IBM Plex Mono, Geist Mono, monospace"
    fontSize: "0.62rem"
    letterSpacing: "0.08em"
rounded:
  control: "6px"
  panel: "10px"
spacing:
  compact: "0.5rem"
  control: "0.8rem"
  panel: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.7rem 0.9rem"
  button-tool:
    backgroundColor: "{colors.tool-surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.7rem"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
---

# Design System: 4allx Personal Hub

## Overview

**Creative North Star: "The Monochrome Command Console"**

The Hub is a quiet, high-contrast operating surface for one authenticated owner. It favors immediate legibility, restrained emphasis, and a compact technical rhythm over decorative atmosphere. The public portfolio has its own visual language; this system governs `/hub` and its private modules.

Flat technical is the component philosophy: borders, tonal surfaces, and state shifts create hierarchy before shadows do. Panels are used only to group a meaningful task or data channel; empty containers and ornamental metrics are not part of the system.

**Key Characteristics:**

- Near-black operational surfaces with white-gray hierarchy.
- Expressive display headlines paired with compact mono labels.
- Thin border topology, modest rounding, and sparse elevation.
- Real data, direct actions, and explicit empty states.

## Colors

The palette is almost entirely neutral: contrast and surface level carry structure, while color is reserved for status and destructive action.

### Primary
- **Console White:** Primary action fill, keyboard focus, and the strongest available contrast.

### Secondary
- **Online Green:** A small operational indicator only; never a general theme color.
- **Signal Red:** Error and destructive-action signal.

### Neutral
- **Black Ground:** The uninterrupted page field behind all Hub work.
- **Charcoal Panel:** The standard task and data surface.
- **Raised Charcoal:** Hovered or interactive field surface.
- **Ghost Lines:** Low-opacity white dividers that establish layout without card clutter.
- **Operator Text:** High-contrast reading text with a muted secondary tier.

### Named Rules

**The Neutral-First Rule.** Gray contrast establishes hierarchy; green and red only communicate operational state.

**The Quiet Accent Rule.** The primary action fill is used for one clear next action, not as decorative chrome.

## Typography

**Display Font:** Bricolage Grotesque with Manrope fallback.
**Body Font:** Manrope with Geist Sans fallback.
**Label/Mono Font:** IBM Plex Mono with Geist Mono fallback.

**Character:** Display type makes page purpose readable at a glance; mono labels provide an instrument-panel cadence for metadata, channels, and counts. Body text stays simple and compact.

### Hierarchy
- **Display:** Large, light-weight, tightly tracked headings for page and operational summaries.
- **Headline:** Display treatment for module, panel, and insight titles.
- **Title:** Compact high-contrast titles inside data records and controls.
- **Body:** Small, legible support copy for task explanation and empty states.
- **Label:** Uppercase or widely tracked mono metadata for channels, status, and field labels.

### Named Rules

**The Two-Voice Rule.** Use display type for purpose and mono for system metadata; do not introduce a third decorative voice.

## Layout

The Hub uses a desktop header grid and a persistent mobile bottom dock. Private content is arranged in responsive grids that collapse to a single column below the mobile breakpoint. Data records become a compact two-column reading layout on small screens, while controls preserve touchable minimum heights.

Spacing follows a compact rhythm: short control gaps, one standard panel inset, and thin dividers between adjacent records. Safe-area insets and dynamic viewport heights protect iPhone standalone use. Modals and search become bottom-aligned sheets on mobile rather than squeezed desktop dialogs.

## Elevation & Depth

Depth is flat by default. Tonal panel changes and low-opacity borders separate regions; the only shadow is a restrained ambient layer on dialogs and major panels, strengthened slightly on hover. Focus is communicated with a bright outline halo rather than a lifted card effect.

### Shadow Vocabulary
- **Ambient Panel:** Soft black spread below major surfaces and dialogs; use only to detach a meaningful working layer.
- **Focused Field:** A subtle light halo around the current input or search surface.

### Named Rules

**The Border-Before-Shadow Rule.** Establish hierarchy with surfaces and lines before adding depth.

## Shapes

Controls use a small, consistent corner radius. Working panels use a slightly larger radius; record rows are structural and rely on dividers rather than individual rounded cards. Borders are thin and quiet at rest, brighter only for active, focused, or hovered states.

## Components

### Buttons
- **Shape:** Compact rectangular controls with gentle corners.
- **Primary:** Light fill and dark text for the single commit or next action.
- **Hover / Focus:** Tool controls brighten by surface or border shift; focus uses the light halo.
- **Secondary / Ghost:** Dark tonal surface or transparent control with a low-contrast border.

### Cards / Containers
- **Corner Style:** Working panels are softly rounded; records are divider-led.
- **Background:** Standard charcoal panel, with raised charcoal only for interaction.
- **Shadow Strategy:** Ambient only on meaningful layers.
- **Border:** Ghost line at rest, brighter line for an active boundary.
- **Internal Padding:** One compact panel inset.

### Inputs / Fields
- **Style:** Raised dark fill, thin neutral border, mono entry text where the field is operational.
- **Focus:** Light border and restrained halo.
- **Error / Disabled:** Error communicates through the dedicated signal color; disabled controls reduce contrast without changing layout.

### Navigation
- **Style:** Sticky dark header on desktop, safe-area-aware dock on mobile.
- **State:** The active route receives a subtle white surface shift, never a colorful tab treatment.
- **Mobile treatment:** The four primary modules remain immediately reachable; secondary routes live in More.

### Data Records
- **Style:** Dense rows separated by lines, with a mono index and small field labels.
- **State:** Hover changes only the surface level; edit and delete remain compact icon actions.

## Do's and Don'ts

### Do:
- **Do** use the neutral surface ladder to clarify purpose, interaction, and focus.
- **Do** keep labels mono, compact, and visibly subordinate to real user data.
- **Do** show a truthful empty state when no authenticated data exists.
- **Do** preserve generous touch targets even when controls are visually compact.

### Don't:
- **Don't** revive Night Operations green as the Hub's general visual theme.
- **Don't** wrap every small datum in a standalone card or container.
- **Don't** add colorful gradients, fake analytics, decorative charts, or ornamental status numbers.
- **Don't** change finance or other business logic to satisfy a visual adjustment.
