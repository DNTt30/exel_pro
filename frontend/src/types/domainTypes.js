// =====================================================================
// DOMAIN TYPES (JSDoc) — nguồn tham chiếu cho toàn app.
// Repo hiện theo quy ước JS thuần (AGENTS.md) nên dùng JSDoc thay .ts.
// Khi migrate TypeScript (Phase sau): các typedef này map 1-1 sang interface.
// =====================================================================

/**
 * @typedef {Object} Employee
 * @property {string} id            // mã NV 9 số
 * @property {string} name
 * @property {string} dept          // mã CH gốc ("A,B" legacy multi-store)
 * @property {string} type          // 'STPT' | 'STFT' | ...
 * @property {string} role
 * @property {string} jobTitle
 * @property {number} [maxH]
 * @property {boolean} [isActive]
 */

/**
 * @typedef {Object} Store
 * @property {string} id            // 'VN0485'
 * @property {string} name
 * @property {string} [smId]
 * @property {boolean} [isActive]
 */

/** Ô ca: chuỗi '6-14' | 'off' | '' | object chi viện */
/**
 * @typedef {string|{shift:string, covering_store?:string}} ScheduleCell
 */

/**
 * @typedef {Object<string, ScheduleCell>} EmpWeekShifts   // {[dayKey]: cell}
 */

/**
 * @typedef {Object} ScheduleFinding
 * @property {string} code
 * @property {'BLOCKER'|'ERROR'|'WARNING'|'INFO'} severity
 * @property {string} employeeId
 * @property {string} date          // dayKey hoặc ngày cuối tuần
 * @property {string} message
 * @property {string} [storeId]
 */

/**
 * @typedef {'draft'|'pending'|'submitted'|'approved'|'rejected'} WeekStatus
 */
export {};
