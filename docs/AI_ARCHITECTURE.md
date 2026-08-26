# AI ARCHITECTURE
- **Constraint-first**: doanh thu → demand matrix (`revenueDemand.js`) → xếp ca theo CANON_ORDER trong `aiSchedulerEngine.js`. AI không tự đặt business rule.
- **Scoring**: `scheduleScore.js` — trọng số `DEFAULT_SCORE_WEIGHTS` configurable; dùng để so sánh phương án.
- **Copilot**: chat hỏi-đáp read-only. Guard: `aiGuard.assertAiActionAllowed()` — mọi action ghi bị từ chối; con người thao tác qua UI/permission layer bình thường.
- Conflict findings từ `scheduleConflicts.js` là đầu vào bắt buộc trước khi trình duyệt tuần.