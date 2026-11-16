# Studio cost and reuse ledger

Log every authorized video render with shot count, template-only percentage, planned auto vs hand-edited percentage, render seconds, cached-shot count, and voice provider. Compare against prior film and record what would improve reuse.

| Video | Shots | Template reuse | Planned auto vs hand-edited | Render seconds | Cached shots | Voice provider |
|---|---:|---:|---|---:|---:|---|
| _Setup only — no film rendered_ | — | — | — | — | — | — |
| the-wrong-side | 19 | 100% | 0% auto (0/19) / 100% hand-edited | 398.1 | 0 | kokoro-onnx |

Approximately 40 CPU-hours/month is the requested planning budget, not a verified entitlement. Static tests are not logged as videos.

| midnight-horror-elite | 6 | 100% | 67% auto (4/6) / 33% hand-edited | 581.1 | 0 | kokoro-onnx-0.6.1-int8 |
