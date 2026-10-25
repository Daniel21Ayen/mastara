# ADR 006: Single Shared KaTeX Document Renderer for Memory Optimization

## Status
Accepted (October 24, 2026)

## Context
Rendering KaTeX mathematics on React Native originally instantiated an individual `<WebView>` component for every formula or paragraph. On pages with multiple equations or quiz choices, Android spawned dozens of Chromium renderer processes, consuming > 220 MB RAM and triggering Out-Of-Memory (OOM) crashes on 2 GB RAM budget devices (e.g. Tecno, Infinix).

## Decision
1. Introduce `SharedKatexRenderer` in `apps/mobile/src/shared/ui/SharedKatexRenderer.tsx`.
2. Evaluate math complexity dynamically in `RichText`:
   - Simple formulas ($E = mc^2$, Greek symbols, subscripts) render as zero-overhead native text via `MathSpan` (0 WebViews).
   - If any formula in the document requires 2D layout (fractions, roots, matrices), the entire document is compiled into a single consolidated HTML document rendered inside **exactly one** shared `<WebView>`.
3. Cap resident memory footprint strictly under **120 MB RAM**.

## Consequences
- Reduces peak memory from 250 MB+ down to under 98 MB during complex formula rendering.
- Eliminates WebView flashing, layout shifts, and Android OS process termination.
