---
'@loams/mastra-resonate': patch
---

`run.resume()` through a workflow that is not registered with a Mastra instance (one built again after a restart, say) now fails with a `RESONATE_ENGINE_STORAGE_REQUIRED` error that says to register the workflow first, as the default engine requires.
