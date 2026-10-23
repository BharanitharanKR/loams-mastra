---
'@loams/mastra-resonate': patch
---

`run.resume()` closes a `streamLegacy` stream that stayed open while the run was suspended, and `getWorkflowState()` returns the resumed result, as with Mastra's default engine. A resume issued as soon as a step reports its suspension now waits for the suspended snapshot instead of failing with "This workflow run was not suspended".
