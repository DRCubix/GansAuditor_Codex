## 2025-09-04

- Refine GAN Auditor fallback behavior
  - Updated fallback context message to include "Context Build Failed" for test alignment
  - Disabled Codex audit retries within `GanAuditor.executeAudit` to ensure graceful fallback on first error
  - Harmonized fallback summary phrasing ("Audit could not be completed …")
  - Files: `src/auditor/gan-auditor.ts`

