---
'@loams/mastra-resonate': patch
---

Resuming a suspended foreach by label now resumes only the iteration that suspended with that label, as `run.resume({ forEachIndex })` does and as Mastra's default engine does; the other iterations stay suspended.
