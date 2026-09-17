# CODE_REVIEW_KNOWLEDGE.md
### Bộ tri thức Code Review – Trích xuất từ các nguồn video & tài liệu kỹ thuật chất lượng cao

---

## 1. Giới thiệu

Tài liệu này là một **bộ quy tắc (ruleset) có thể vận hành được** để đánh giá chất lượng source code, được tổng hợp từ việc nghiên cứu các video YouTube, bài nói tại hội nghị, và tài liệu kỹ thuật chính thống về 8 chủ đề:

`Code Review` · `Clean Code` · `SOLID` · `Security Code Review` · `OWASP` · `Performance` · `Architecture` · `Refactoring`.

Khác với một bản tóm tắt video, mỗi mục dưới đây được chuyển hoá thành một **rule có cấu trúc cố định**, đủ để:

- Một reviewer (người) dùng làm checklist khi review code.
- Một **AI Code Review Agent** dùng làm knowledge base để tự động phát hiện vi phạm và đề xuất khắc phục (mỗi rule có `Cách phát hiện` mô tả dấu hiệu/heuristic/công cụ tĩnh có thể dùng để dò tìm trong source code).

## 2. Phương pháp nghiên cứu

1. **Tìm kiếm & xác minh nguồn**: mỗi kênh YouTube / video / tài liệu được kiểm tra tồn tại thực tế qua tìm kiếm web (tên kênh, số subscriber, tiêu đề video, link) trước khi được dùng làm căn cứ — không suy diễn từ trí nhớ.
2. **Ưu tiên nguồn có uy tín đã được cộng đồng kỹ thuật kiểm chứng**: tác giả sách/nguyên tắc gốc (Robert C. Martin, Martin Fowler, Kevlin Henney), tài liệu chính thức (OWASP Foundation, Google Engineering Practices), kênh chuyên sâu được đánh giá cao (CodeAesthetic, ArjanCodes, Continuous Delivery, CodeOpinion), và các nghiên cứu định lượng đã công bố (SmartBear/Cisco code review study).
3. **Trích xuất nguyên tắc, không tóm tắt nội dung**: với mỗi nguồn, tài liệu này rút ra *nguyên tắc kỹ thuật cốt lõi* mà nguồn đó trình bày, rồi tự viết lại thành rule + ví dụ code minh hoạ gốc (không sao chép transcript hay trích dẫn nguyên văn video).
4. **Không bịa kiến thức**: nếu một chi tiết (số liệu, tên hạng mục, thứ hạng...) không xác minh được từ nguồn đáng tin cậy, tài liệu không đưa vào. Ví dụ, phần OWASP dưới đây dùng **OWASP Top 10:2025** (phiên bản chính thức mới nhất, công bố 11/2025 và chốt bản cuối 01/2026, thay thế bản 2021) thay vì dựa vào bản 2021 đã lỗi thời.
5. Danh sách nguồn đầy đủ (kênh/video/tài liệu, kèm link) được liệt kê theo từng nhóm ở **Mục 7 – Nguồn tham khảo đầy đủ** cuối tài liệu.

## 3. Cấu trúc một Rule

Mỗi rule gồm 9 trường đúng theo yêu cầu:

| Trường | Ý nghĩa |
|---|---|
| **Rule ID** | Mã định danh duy nhất, ví dụ `CC-003` |
| **Category** | 1 trong 8 nhóm chủ đề |
| **Principle** | Nguyên tắc kỹ thuật cốt lõi |
| **Bad example** | Đoạn code vi phạm nguyên tắc |
| **Good example** | Đoạn code tuân thủ nguyên tắc |
| **Khi nào áp dụng** | Bối cảnh/điều kiện cần soi rule này |
| **Mức độ nghiêm trọng** | Thang 4 mức (xem Mục 4) |
| **Cách phát hiện trong source code** | Heuristic, pattern, hoặc công cụ tĩnh để dò vi phạm |
| **Cách khắc phục** | Kỹ thuật refactor/sửa cụ thể |

## 4. Thang mức độ nghiêm trọng

| Ký hiệu | Mức | Ý nghĩa |
|---|---|---|
| 🔴 | **Critical** | Có thể bị khai thác từ xa, gây mất dữ liệu/tiền, sập hệ thống, hoặc vi phạm bảo mật nghiêm trọng. Phải chặn merge. |
| 🟠 | **High** | Ảnh hưởng lớn đến bảo mật, hiệu năng ở quy mô production, hoặc khả năng bảo trì dài hạn. Nên chặn merge, xem xét từng trường hợp. |
| 🟡 | **Medium** | Ảnh hưởng rõ rệt đến chất lượng/khả năng đọc/khả năng mở rộng, nên sửa nhưng có thể merge kèm ticket theo dõi. |
| 🟢 | **Low** | Vấn đề phong cách/tối ưu nhỏ, nên cải thiện nhưng không khẩn cấp. |

## 5. Mục lục quy tắc (61 rules)

### A. Code Review (CR) — quy trình & văn hoá review
| ID | Tên rule | Mức độ |
|---|---|---|
| CR-001 | Giới hạn kích thước Pull Request/Diff | 🟡 Medium |
| CR-002 | Một PR chỉ nên có một mục đích logic | 🟡 Medium |
| CR-003 | Mọi thay đổi logic phải kèm test tự động | 🟠 High |
| CR-004 | Phản hồi review mang tính xây dựng, phân loại rõ mức độ | 🟢 Low |
| CR-005 | Reviewer phải hiểu & kiểm chứng thật sự, không "rubber-stamp" | 🟠 High |
| CR-006 | Tự động hoá kiểm tra style, dành review người cho logic/thiết kế | 🟢 Low |
| CR-007 | Thời gian phản hồi review phải nhanh | 🟡 Medium |

### B. Clean Code (CC)
| ID | Tên rule | Mức độ |
|---|---|---|
| CC-001 | Đặt tên có ý nghĩa, thể hiện rõ ý định | 🟢 Low |
| CC-002 | Hàm nhỏ, chỉ làm một việc | 🟡 Medium |
| CC-003 | Tránh lồng nhau sâu ("Never Nester") | 🟡 Medium |
| CC-004 | Hạn chế số lượng tham số hàm | 🟢 Low |
| CC-005 | Comment giải thích "tại sao", không phải "cái gì" | 🟢 Low |
| CC-006 | Không lặp code (DRY) | 🟡 Medium |
| CC-007 | Không dùng số/chuỗi "ma thuật" | 🟢 Low |
| CC-008 | Không nuốt lỗi âm thầm (silent exception swallowing) | 🟠 High |

### C. SOLID Principles
| ID | Tên rule | Mức độ |
|---|---|---|
| SOLID-001 | Single Responsibility Principle (SRP) | 🟡 Medium |
| SOLID-002 | Open/Closed Principle (OCP) | 🟡 Medium |
| SOLID-003 | Liskov Substitution Principle (LSP) | 🟠 High |
| SOLID-004 | Interface Segregation Principle (ISP) | 🟡 Medium |
| SOLID-005 | Dependency Inversion Principle (DIP) | 🟡 Medium |

### D. Security Code Review (SEC) — thực hành bảo mật tổng quát
| ID | Tên rule | Mức độ |
|---|---|---|
| SEC-001 | Không bao giờ tin dữ liệu đầu vào | 🔴 Critical |
| SEC-002 | Không hardcode secret/credential trong source | 🔴 Critical |
| SEC-003 | Nguyên tắc đặc quyền tối thiểu (Least Privilege) | 🟠 High |
| SEC-004 | Fail securely — mặc định từ chối khi có lỗi | 🔴 Critical |
| SEC-005 | Không tự chế thuật toán mã hoá/băm | 🔴 Critical |
| SEC-006 | Không log dữ liệu nhạy cảm | 🟠 High |
| SEC-007 | Quản lý & rà soát dependency bên thứ 3 | 🟠 High |

### E. OWASP Top 10:2025
| ID | Tên rule | Mức độ |
|---|---|---|
| OWASP-001 | A01:2025 – Broken Access Control (gồm cả SSRF) | 🔴 Critical |
| OWASP-002 | A02:2025 – Security Misconfiguration | 🟠 High |
| OWASP-003 | A03:2025 – Software Supply Chain Failures | 🟠 High |
| OWASP-004 | A04:2025 – Cryptographic Failures | 🔴 Critical |
| OWASP-005 | A05:2025 – Injection | 🔴 Critical |
| OWASP-006 | A06:2025 – Insecure Design | 🟠 High |
| OWASP-007 | A07:2025 – Authentication Failures | 🔴 Critical |
| OWASP-008 | A08:2025 – Software or Data Integrity Failures | 🟠 High |
| OWASP-009 | A09:2025 – Security Logging & Alerting Failures | 🟡🟠 Medium–High |
| OWASP-010 | A10:2025 – Mishandling of Exceptional Conditions | 🟠 High |

### F. Performance (PERF)
| ID | Tên rule | Mức độ |
|---|---|---|
| PERF-001 | Tránh vấn đề N+1 Query | 🟠 High |
| PERF-002 | Đánh index đúng cho cột thường xuyên truy vấn | 🟠 High |
| PERF-003 | Không tối ưu sớm khi chưa đo đạc | 🟢🟡 Low–Medium |
| PERF-004 | Song song hoá các thao tác I/O độc lập | 🟡 Medium |
| PERF-005 | Cache dữ liệu tốn kém kèm chiến lược invalidation | 🟡 Medium |
| PERF-006 | Tránh độ phức tạp thuật toán cao khi có giải pháp tuyến tính | 🟡🟠 Medium–High |
| PERF-007 | Tránh over-fetching, luôn phân trang | 🟡 Medium |
| PERF-008 | Giải phóng tài nguyên đúng cách (tránh rò rỉ) | 🟠 High |

### G. Architecture (ARCH)
| ID | Tên rule | Mức độ |
|---|---|---|
| ARCH-001 | Phân tầng, tách biệt các mối quan tâm | 🟡 Medium |
| ARCH-002 | Phụ thuộc hướng vào abstraction (Dependency Rule) | 🟡🟠 Medium–High |
| ARCH-003 | Tránh coupling chặt giữa các module/service | 🟠 High |
| ARCH-004 | Thiết kế chịu lỗi khi gọi hệ thống ngoài | 🟠 High |
| ARCH-005 | Idempotency cho các operation có thể bị retry | 🔴 Critical |
| ARCH-006 | Tránh God Object/God Class ở cấp kiến trúc | 🟠 High |
| ARCH-007 | Service nên stateless để scale ngang | 🟡🟠 Medium–High |
| ARCH-008 | Tránh circular dependency giữa các module | 🟡 Medium |

### H. Refactoring (REF)
| ID | Tên rule | Mức độ |
|---|---|---|
| REF-001 | Long Method → Extract Method | 🟡 Medium |
| REF-002 | Large Class/God Class → Extract Class | 🟡🟠 Medium–High |
| REF-003 | Duplicate Code → Extract Method/Pull Up Method | 🟡 Medium |
| REF-004 | Long Parameter List → Introduce Parameter Object | 🟢🟡 Low–Medium |
| REF-005 | Feature Envy → Move Method | 🟢🟡 Low–Medium |
| REF-006 | Conditional phức tạp theo "type" → Replace with Polymorphism | 🟡 Medium |
| REF-007 | Shotgun Surgery → Gom trách nhiệm về một nơi | 🟠 High |
| REF-008 | Speculative Generality → Đơn giản hoá (YAGNI) | 🟢🟡 Low–Medium |

---

## 6. Chi tiết quy tắc

### NHÓM A — CODE REVIEW (CR)
*Quy trình & văn hoá review, đúc kết từ Google Engineering Practices, nghiên cứu SmartBear/Cisco, và kênh Continuous Delivery.*

---

### CR-001 — Giới hạn kích thước Pull Request/Diff

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
PR/CL càng nhỏ càng được review nhanh hơn, kỹ hơn, và ít khả năng lọt bug. Nghiên cứu định lượng của SmartBear trên nhóm lập trình viên Cisco (2.500+ lượt review, 3,2 triệu dòng code) cho thấy: review hiệu quả nhất khi diff dưới 200–400 dòng, tốc độ đọc dưới 300–500 LOC/giờ, và mỗi phiên review không quá 60–90 phút — vượt ngưỡng này tỉ lệ phát hiện lỗi giảm rõ rệt. Google's Engineering Practices cũng liệt kê hàng loạt lợi ích của "Small CLs": review nhanh hơn, kỹ hơn, ít bug hơn, dễ rollback hơn, và Google cho phép reviewer từ chối thẳng một CL chỉ vì lý do "quá lớn".

**❌ Bad example:**
```text
PR #482: "Cập nhật module thanh toán"
+2,347 −891 lines, 38 files changed
(gộp: đổi provider thanh toán, refactor toàn bộ OrderService,
 sửa 3 bug không liên quan, và thêm tính năng coupon mới)
```

**✅ Good example:**
```text
PR #482: "Thêm interface PaymentProvider (không đổi hành vi)"      +180 −40, 6 files
PR #483: "Chuyển OrderService sang dùng PaymentProvider mới"       +210 −95, 8 files
PR #484: "Fix bug #391: race condition khi huỷ đơn"               +45 −12, 2 files
PR #485: "Thêm tính năng coupon giảm giá"                          +260 −0, 5 files
```

**Khi nào áp dụng:** Trước khi gửi bất kỳ Pull Request/Merge Request/CL nào để review.

**Cách phát hiện trong source code:** Đo `git diff --stat` hoặc số liệu từ hệ thống PR (GitHub/GitLab API) — cảnh báo khi tổng số dòng thay đổi > 400 hoặc số file thay đổi trải nhiều module không liên quan; đối chiếu với mô tả PR xem có > 1 mục đích được nêu hay không.

**Cách khắc phục:** Tách PR theo từng bước có thể review/merge độc lập (stacked PRs), dùng feature flag để merge phần chưa hoàn chỉnh mà không bật cho người dùng, tách "refactor không đổi hành vi" ra khỏi "thay đổi hành vi".

**Nguồn:** Google Engineering Practices – "Small CLs" (google.github.io/eng-practices/review/developer/small-cls.html); SmartBear – "Best Practices for Peer Code Review" (nghiên cứu tại Cisco Systems).

---

### CR-002 — Một PR chỉ nên có một mục đích logic

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Trộn lẫn nhiều loại thay đổi (refactor + tính năng mới + fix bug) trong cùng một PR khiến reviewer không thể tách bạch "cái gì đang thực sự thay đổi hành vi", làm review chậm và khó rollback an toàn nếu một phần gây lỗi.

**❌ Bad example:**
```text
Commit: "Fix bug đăng nhập"
- Sửa lỗi so sánh sai kiểu dữ liệu trong hàm validateSession()
- Đổi tên 40 biến từ snake_case sang camelCase trên toàn repo
- Thêm tính năng "Ghi nhớ đăng nhập"
```

**✅ Good example:**
```text
PR A: "Fix bug: validateSession so sánh sai kiểu dữ liệu (#512)"
PR B: "Refactor: chuẩn hoá naming convention sang camelCase"
PR C: "Feature: thêm tuỳ chọn Ghi nhớ đăng nhập"
```

**Khi nào áp dụng:** Khi chuẩn bị commit/PR, đặc biệt khi phát hiện "tiện thể" muốn sửa thêm thứ khác trong lúc đang code.

**Cách phát hiện trong source code:** PR description chứa nhiều liên từ "và", "ngoài ra", "tiện thể"; commit đơn lẻ động chạm nhiều module không liên quan về mặt nghiệp vụ; diff vừa có rename hàng loạt vừa có thay đổi logic.

**Cách khắc phục:** Dùng `git rebase -i` / `git add -p` để tách commit theo từng mục đích; tạo refactor PR trước, merge xong rồi mới tạo PR chứa thay đổi hành vi trên nền code đã sạch.

**Nguồn:** Google Engineering Practices – "What to look for in a code review" (google.github.io/eng-practices).

---

### CR-003 — Mọi thay đổi logic phải kèm theo test tự động

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Một thay đổi logic nghiệp vụ không có test tương ứng là chưa hoàn chỉnh: không ai (kể cả tác giả) chứng minh được nó hoạt động đúng và sẽ tiếp tục hoạt động đúng sau các thay đổi tương lai. Với bugfix, test còn đóng vai trò "chứng cứ" bug đã thực sự được sửa (regression test).

**❌ Bad example:**
```typescript
// PR thêm hàm tính giảm giá phức tạp nhưng không có file test đi kèm
function calculateBulkDiscount(unitPrice: number, qty: number): number {
  if (qty >= 100) return unitPrice * qty * 0.8;
  if (qty >= 50) return unitPrice * qty * 0.9;
  return unitPrice * qty;
}
```

**✅ Good example:**
```typescript
describe("calculateBulkDiscount", () => {
  it("không giảm giá khi số lượng < 50", () => {
    expect(calculateBulkDiscount(10, 49)).toBe(490);
  });
  it("giảm 10% khi số lượng từ 50-99", () => {
    expect(calculateBulkDiscount(10, 50)).toBe(450);
  });
  it("giảm 20% khi số lượng >= 100", () => {
    expect(calculateBulkDiscount(10, 100)).toBe(800);
  });
});
```

**Khi nào áp dụng:** Mọi PR thêm/sửa business logic; đặc biệt bắt buộc với bugfix (test phải fail trước khi sửa, pass sau khi sửa).

**Cách phát hiện trong source code:** So khớp danh sách file thay đổi trong PR với file test tương ứng (`*.test.ts`, `*.spec.ts`, `test_*.py`); kiểm tra báo cáo coverage diff của CI có giảm so với nhánh chính không; PR bugfix không có test mới nào.

**Cách khắc phục:** Yêu cầu bổ sung test trước khi approve; với bugfix, viết test tái hiện lỗi trước rồi mới sửa code (giống TDD).

**Nguồn:** Google Engineering Practices; kênh Continuous Delivery (Dave Farley, Kent Beck) về vai trò của test tự động trong review chất lượng cao.

---

### CR-004 — Phản hồi review mang tính xây dựng, phân loại rõ mức độ

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Comment review nên nhắm vào *code*, không nhắm vào *người viết*, và nên phân biệt rõ đâu là ý kiến bắt buộc phải sửa (blocking) và đâu chỉ là gợi ý (nit/optional) để tránh gây tranh cãi hoặc làm chậm merge vì hiểu nhầm mức độ nghiêm trọng.

**❌ Bad example:**
```text
"Code này viết ẩu quá, ai lại làm thế này bao giờ."
```

**✅ Good example:**
```text
"Nit: đặt tên `x` rõ nghĩa hơn được không, ví dụ `orderTotal`?
 (không blocking, tuỳ bạn)"

"Blocking: hàm này không xử lý trường hợp `items` rỗng,
 sẽ throw ở dòng 42 — cần thêm early return."
```

**Khi nào áp dụng:** Khi viết bất kỳ comment nào trong quá trình review.

**Cách phát hiện trong source code:** Khó tự động hoá hoàn toàn; có thể dùng bộ lọc từ khoá tiêu cực/công kích cá nhân trong công cụ review, hoặc kiểm tra comment có gắn nhãn mức độ (`nit:`, `blocking:`, `suggestion:`) hay không theo chuẩn "Conventional Comments".

**Cách khắc phục:** Áp dụng chuẩn gắn nhãn comment (praise/nitpick/suggestion/issue/question), luôn giải thích "tại sao" thay vì chỉ ra lệnh "phải sửa thế này".

**Nguồn:** Google Engineering Practices – "How to write code review comments"; Trisha Gee (kênh Continuous Delivery) – các buổi nói chuyện "Code Review Matters and Manners", "Code Review Best Practices".

---

### CR-005 — Reviewer phải hiểu & kiểm chứng thật sự, không "rubber-stamp"

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Approve nhanh mà không thực sự đọc hiểu logic tạo ra cảm giác an toàn giả — review chỉ có giá trị khi reviewer hiểu rõ *tại sao* thay đổi này cần thiết và tự tin nó đúng. Mức độ đào sâu nên tỉ lệ với mức độ rủi ro của vùng code (theo OWASP Code Review Guide: vùng auth/payment/data cần reviewer có chuyên môn bảo mật).

**❌ Bad example:**
```text
PR 480 dòng thay đổi logic tính tiền hoàn (refund) →
Reviewer bấm "Approve" sau 20 giây, không để lại comment nào.
```

**✅ Good example:**
```text
Reviewer đọc mô tả PR, đối chiếu với yêu cầu nghiệp vụ,
kiểm tra test case cho các trường hợp biên (refund một phần,
refund trùng lặp), chạy thử branch cục bộ trước khi approve.
```

**Khi nào áp dụng:** Mọi review, đặc biệt với code chạm vùng rủi ro cao (xác thực, thanh toán, xử lý dữ liệu người dùng).

**Cách phát hiện trong source code:** Đo thời gian giữa lúc PR mở và lúc approve so với kích thước diff (quá ngắn so với LOC là dấu hiệu rubber-stamp); PR lớn/rủi ro cao nhưng không có comment nào.

**Cách khắc phục:** Thiết lập kỳ vọng thời gian review tối thiểu tương ứng LOC (tham chiếu ngưỡng 300–500 LOC/giờ từ nghiên cứu Cisco); bắt buộc reviewer có chuyên môn phù hợp cho vùng code nhạy cảm.

**Nguồn:** SmartBear/Cisco code review study; OWASP Code Review Guide (phần "risk-based review depth").

---

### CR-006 — Tự động hoá kiểm tra style, dành review người cho logic/thiết kế

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Thời gian của reviewer con người là tài nguyên quý — không nên lãng phí vào việc bắt lỗi định dạng, thứ tự import, dấu chấm phẩy mà công cụ tự động có thể làm tốt hơn và nhất quán hơn.

**❌ Bad example:**
```text
15 comment trong 1 PR đều là: "thiếu dấu chấm phẩy dòng 12",
"thụt lề sai dòng 30", "import chưa sort theo alphabet"...
```

**✅ Good example:**
```yaml
# CI pipeline chặn PR nếu vi phạm style TRƯỚC KHI tới bước review người
- run: eslint --max-warnings=0 .
- run: prettier --check .
```

**Khi nào áp dụng:** Khi thiết lập pipeline CI/CD cho dự án.

**Cách phát hiện trong source code:** Kiểm tra repo có file cấu hình linter/formatter (`.eslintrc`, `.prettierrc`, `pyproject.toml [tool.black]`) và bước CI tương ứng hay không; nếu không có, review thủ công sẽ lặp lại các comment về style.

**Cách khắc phục:** Thêm ESLint/Prettier/Black/gofmt/Checkstyle + bước CI gate chạy trước khi cho phép request review từ người.

**Nguồn:** Google Engineering Practices – phần hướng dẫn về style trong review.

---

### CR-007 — Thời gian phản hồi review phải nhanh

**Category:** Code Review · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Review chậm chặn tiến độ của cả nhóm và tạo áp lực "merge cho xong" bỏ qua chất lượng. Google khuyến nghị: nếu không đang trong việc tập trung sâu (deep focus), reviewer nên phản hồi trong vòng một ngày làm việc; PR nhỏ nên được review trong vài giờ.

**❌ Bad example:**
```text
PR mở thứ Hai, không ai review tới thứ Sáu →
tác giả bị block 4 ngày, hoặc phải làm việc trên nhánh khác chồng chéo.
```

**✅ Good example:**
```text
Team cam kết SLA: review lần đầu trong 24h làm việc;
PR < 100 dòng ưu tiên review trong buổi.
Dùng bot nhắc nhở PR "đang chờ" quá X giờ.
```

**Khi nào áp dụng:** Khi thiết lập quy trình làm việc nhóm.

**Cách phát hiện trong source code:** Đo thời gian trung bình từ lúc PR được tạo đến comment/review đầu tiên qua API của GitHub/GitLab.

**Cách khắc phục:** Đặt SLA review rõ ràng, phân bổ lịch "review rotation", dùng bot nhắc PR chờ lâu.

**Nguồn:** Google Engineering Practices – "The Standard of Code Review" / "Speed of Code Reviews".

---

### NHÓM B — CLEAN CODE (CC)
*Đúc kết từ "Clean Code" (Robert C. Martin), "Seven Ineffective Coding Habits of Many Programmers" (Kevlin Henney), và kênh CodeAesthetic.*

---

### CC-001 — Đặt tên có ý nghĩa, thể hiện rõ ý định

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Tên biến/hàm/class phải tự nói lên nó LÀ GÌ hoặc LÀM GÌ mà không cần đọc thêm comment. Kevlin Henney chỉ ra một dấu hiệu codebase có vấn đề về naming: khi phân tích tần suất từ trong code, các từ xuất hiện nhiều nhất lại là kiểu dữ liệu chung chung (`list`, `data`, `object`, `manager`) thay vì từ vựng của domain nghiệp vụ (`Invoice`, `ShippingAddress`, `RefundPolicy`).

**❌ Bad example:**
```typescript
function calc(d: number, l: number): number {
  let r = d * l;
  if (r > 100) r = r * 0.9;
  return r;
}
```

**✅ Good example:**
```typescript
const BULK_DISCOUNT_THRESHOLD = 100;
const BULK_DISCOUNT_RATE = 0.9;

function calculateOrderTotalWithBulkDiscount(pricePerUnit: number, quantity: number): number {
  const subtotal = pricePerUnit * quantity;
  return subtotal > BULK_DISCOUNT_THRESHOLD ? subtotal * BULK_DISCOUNT_RATE : subtotal;
}
```

**Khi nào áp dụng:** Mỗi khi đặt tên biến, hàm, class, module — đặc biệt khi tên chỉ có 1 ký tự (ngoài biến đếm vòng lặp ngắn) hoặc dùng từ chung chung.

**Cách phát hiện trong source code:** Linter rule (`id-length`, `id-denylist` chặn `data/temp/obj/foo`); thống kê tần suất từ khoá trong tên biến toàn repo — tỉ lệ cao các từ kiểu dữ liệu chung chung so với từ vựng domain là dấu hiệu cảnh báo; review thủ công tên hàm không có động từ rõ ràng.

**Cách khắc phục:** Đổi tên theo ngôn ngữ nghiệp vụ (ubiquitous language), dùng chức năng "Rename Symbol" của IDE để đảm bảo đổi nhất quán toàn repo.

**Nguồn:** Kevlin Henney – "Seven Ineffective Coding Habits of Many Programmers" (DevWeek 2014 / GOTO); Robert C. Martin – "Clean Code".

---

### CC-002 — Hàm nhỏ, chỉ làm một việc

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Hàm càng dài và càng làm nhiều việc không liên quan càng khó test, khó hiểu, khó tái sử dụng. Một hàm tốt nên giữ một mức trừu tượng nhất quán — hoặc toàn bộ là các bước cấp cao (điều phối), hoặc toàn bộ là chi tiết cấp thấp, không trộn lẫn.

**❌ Bad example:**
```typescript
function processOrder(order: Order) {
  // validate (15 dòng)
  if (!order.items.length) throw new Error("empty");
  for (const item of order.items) { if (item.qty <= 0) throw new Error("invalid qty"); }
  // tính tiền (20 dòng)
  let total = 0;
  for (const item of order.items) { total += item.price * item.qty; }
  if (order.coupon) { total *= 0.9; }
  // gửi email (10 dòng) ... ghi log (10 dòng) ... tất cả trong 1 hàm 100+ dòng
}
```

**✅ Good example:**
```typescript
function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateOrderTotal(order);
  const savedOrder = saveOrder(order, total);
  sendConfirmationEmail(savedOrder);
  return savedOrder;
}
```

**Khi nào áp dụng:** Khi hàm vượt quá ~1 màn hình, hoặc tên hàm cần dùng "và" để mô tả đầy đủ việc nó làm.

**Cách phát hiện trong source code:** Đo số dòng/hàm (cảnh báo khi > 40–50 dòng), độ phức tạp cyclomatic complexity > 10 (ESLint `complexity`, SonarQube), số nhánh `if/else/switch` trong 1 hàm.

**Cách khắc phục:** Extract Method — tách từng khối logic có thể đặt tên riêng thành hàm con, lặp lại tới khi hàm gốc chỉ còn điều phối lời gọi.

**Nguồn:** Robert C. Martin – "Clean Code"; refactoring.guru – code smell "Long Method".

---

### CC-003 — Tránh lồng nhau sâu ("Never Nester")

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Mỗi tầng `if/for/switch` lồng thêm làm tăng số lượng "ngữ cảnh" người đọc phải nhớ cùng lúc. Dùng guard clause (kiểm tra điều kiện thất bại và return/continue sớm) để giữ phần thân hàm luôn ở mức lồng nông nhất có thể.

**❌ Bad example:**
```typescript
function process(data) {
  if (data) {
    if (data.type === "A") {
      for (const v of data.values) {
        if (v.isValid) {
          doSomething(v);
        }
      }
    }
  }
}
```

**✅ Good example:**
```typescript
function process(data) {
  if (!data || data.type !== "A") return;
  for (const v of data.values) {
    if (!v.isValid) continue;
    doSomething(v);
  }
}
```

**Khi nào áp dụng:** Khi một hàm có độ sâu lồng nhau vượt quá 2–3 cấp.

**Cách phát hiện trong source code:** ESLint rule `max-depth`; đo độ sâu thụt lề tối đa trong mỗi hàm (>3–4 cấp là dấu hiệu); độ phức tạp cyclomatic cao đi kèm nesting sâu.

**Cách khắc phục:** Guard clause/early return, `continue` sớm trong vòng lặp, invert điều kiện, hoặc Extract Method cho khối lồng sâu nhất.

**Nguồn:** CodeAesthetic – "Why You Shouldn't Nest Your Code" (youtube.com/watch?v=CFRhGnuXG-4).

---

### CC-004 — Hạn chế số lượng tham số hàm

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Nhiều tham số làm khó nhớ thứ tự khi gọi hàm và dễ truyền nhầm giá trị cùng kiểu. Tham số kiểu boolean điều khiển rẽ nhánh hành vi bên trong hàm ("flag argument") là dấu hiệu hàm đang làm nhiều hơn một việc.

**❌ Bad example:**
```typescript
function createUser(name, email, age, isAdmin, sendWelcomeEmail, country, referralCode) { /* ... */ }
```

**✅ Good example:**
```typescript
interface CreateUserInput {
  name: string; email: string; age: number; isAdmin: boolean;
  sendWelcomeEmail: boolean; country: string; referralCode?: string;
}
function createUser(input: CreateUserInput) { /* ... */ }
```

**Khi nào áp dụng:** Hàm/method có nhiều hơn 3 tham số, hoặc có tham số boolean rẽ nhánh hành vi.

**Cách phát hiện trong source code:** ESLint rule `max-params`; grep tham số kiểu `boolean` được dùng trong `if` ngay đầu thân hàm.

**Cách khắc phục:** Introduce Parameter Object (gom tham số thành 1 object/DTO); tách flag argument thành 2 hàm riêng biệt theo từng hành vi (ví dụ `createUser` và `createAdminUser`).

**Nguồn:** Kevlin Henney – "Seven Ineffective Coding Habits of Many Programmers" (ví dụ thực tế về hàm có tới 326 tham số).

---

### CC-005 — Comment giải thích "tại sao", không phải "cái gì"

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Comment lặp lại điều code đã thể hiện rõ là dư thừa và dễ trở nên sai lệch (outdated) theo thời gian vì không được trình biên dịch/test kiểm tra. Comment có giá trị nên giải thích *lý do* hoặc *quy tắc nghiệp vụ* mà bản thân code không thể tự nói lên.

**❌ Bad example:**
```typescript
// tăng i lên 1
i++;
// kiểm tra tuổi lớn hơn 18
if (age > 18) { /* ... */ }
```

**✅ Good example:**
```typescript
// Luật thuế hiện hành chỉ áp dụng mức cũ cho hoá đơn phát hành
// trước ngày cắt mốc — xem thông tư 78/2024, mục 3.2
if (invoice.date < LEGACY_TAX_CUTOFF_DATE) {
  applyLegacyTaxRate(invoice);
}
```

**Khi nào áp dụng:** Khi viết hoặc review bất kỳ comment nào trong code.

**Cách phát hiện trong source code:** So khớp nội dung comment với tên biến/hàm ngay bên dưới — nếu gần như trùng nghĩa 1-1 thì là comment thừa; tìm comment tham chiếu tên biến/hàm không còn tồn tại (comment "chết").

**Cách khắc phục:** Xoá comment chỉ diễn giải lại code; đổi tên biến/hàm để code tự giải thích; giữ lại/thêm comment cho quyết định nghiệp vụ, đánh đổi kỹ thuật, hoặc workaround không hiển nhiên.

**Nguồn:** Kevlin Henney – "Seven Ineffective Coding Habits of Many Programmers" (phần về thói quen dùng comment); CodeAesthetic.

---

### CC-006 — Không lặp code (DRY — Don't Repeat Yourself)

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
C�ng một logic xuất hiện ở nhiều nơi nghĩa là mỗi lần cần sửa, phải nhớ sửa hết mọi bản sao — rất dễ sót, dẫn tới hành vi không nhất quán giữa các nơi.

**❌ Bad example:**
```typescript
// file A
const tax = price * 0.1 > 500000 ? 500000 : price * 0.1;
// file B (copy-paste, có thể lệch nếu 1 nơi được sửa mà nơi kia thì không)
const taxAmount = amount * 0.1 > 500000 ? 500000 : amount * 0.1;
```

**✅ Good example:**
```typescript
// shared/tax.ts
export function calculateTax(amount: number): number {
  const TAX_RATE = 0.1;
  const TAX_CAP = 500_000;
  return Math.min(amount * TAX_RATE, TAX_CAP);
}
// dùng lại ở mọi nơi: import { calculateTax } from "shared/tax";
```

**Khi nào áp dụng:** Khi phát hiện đoạn logic giống hệt hoặc gần giống xuất hiện từ 2 lần trở lên.

**Cách phát hiện trong source code:** Công cụ phát hiện trùng lặp (`jscpd`, PMD CPD, SonarQube duplication %) chạy trong CI; review thủ công khi thấy copy-paste.

**Cách khắc phục:** Extract Method/Function dùng chung; nếu trùng lặp ở cấp class, cân nhắc Extract Superclass hoặc module dùng chung.

**Nguồn:** refactoring.guru – code smell "Duplicate Code"; Robert C. Martin – "Clean Code".

---

### CC-007 — Không dùng số/chuỗi "ma thuật" (Magic Numbers/Strings)

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟢 Low

**Nguyên tắc (Principle):**
Hằng số không tên khiến người đọc không hiểu ý nghĩa của nó là gì, và khi cần thay đổi giá trị đó ở nhiều nơi rất dễ sót.

**❌ Bad example:**
```typescript
if (order.status === 3) { shipOrder(order); }
```

**✅ Good example:**
```typescript
enum OrderStatus { Pending = 1, Paid = 2, Shipped = 3, Cancelled = 4 }
if (order.status === OrderStatus.Shipped) { /* ... */ }
```

**Khi nào áp dụng:** Khi một số/chuỗi literal mang ý nghĩa nghiệp vụ xuất hiện trong điều kiện hoặc phép tính.

**Cách phát hiện trong source code:** ESLint rule `no-magic-numbers`; grep literal số xuất hiện trong `if/switch/so sánh` (loại trừ 0, 1, -1 là các giá trị thường chấp nhận được).

**Cách khắc phục:** Trích xuất thành hằng số/enum có tên mô tả rõ ý nghĩa, đặt tập trung ở một nơi.

**Nguồn:** Robert C. Martin – "Clean Code"; refactoring.guru.

---

### CC-008 — Không nuốt lỗi âm thầm (Silent Exception Swallowing)

**Category:** Clean Code · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Khối `catch` rỗng hoặc chỉ log qua loa khiến lỗi "biến mất" trong khi hệ thống tiếp tục chạy ở trạng thái không nhất quán — đây cũng chính là gốc rễ của hạng mục OWASP A10:2025 "Mishandling of Exceptional Conditions".

**❌ Bad example:**
```typescript
try {
  await chargeCard(order);
} catch (e) {
  // bỏ qua, coi như không có gì xảy ra
}
```

**✅ Good example:**
```typescript
try {
  await chargeCard(order);
} catch (e) {
  logger.error("Charge failed", { orderId: order.id, error: e });
  throw new PaymentFailedError(order.id, { cause: e });
}
```

**Khi nào áp dụng:** Mọi khối `try/catch`, đặc biệt với thao tác I/O, thanh toán, gọi API bên ngoài.

**Cách phát hiện trong source code:** Grep khối `catch` rỗng hoặc chỉ chứa `console.log`; ESLint rule `no-empty`, Semgrep rule cho "empty catch block".

**Cách khắc phục:** Log đầy đủ ngữ cảnh (không log dữ liệu nhạy cảm — xem SEC-006), rethrow lỗi dạng domain-specific hoặc xử lý phục hồi cụ thể; không catch `Exception`/`Error` chung chung trừ khi ở boundary layer có lý do rõ ràng.

**Nguồn:** Robert C. Martin – "Clean Code" (chương xử lý lỗi); liên hệ trực tiếp OWASP Top 10:2025 A10.

---

### NHÓM C — SOLID PRINCIPLES

*Đúc kết từ video "Uncle Bob's SOLID Principles Made Easy – In Python!" (kênh ArjanCodes) và "Learn SOLID Principles with CLEAN CODE Examples" (kênh Amigoscode), đối chiếu với "Clean Architecture" của Robert C. Martin.*

---

### SOLID-001 — Single Responsibility Principle (SRP)

**Category:** SOLID · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Một class/module chỉ nên có **một lý do để thay đổi** — gắn với một nhóm người dùng/actor cụ thể. Trong "Clean Architecture", Robert C. Martin định nghĩa lại SRP chính xác hơn: "một module nên chịu trách nhiệm trước một, và chỉ một, actor".

**❌ Bad example:**
```typescript
class Invoice {
  calculateTotal() { /* nghiệp vụ kế toán */ }
  saveToDatabase() { /* hạ tầng lưu trữ — thay đổi khi đổi DB */ }
  printToPdf() { /* trình bày — thay đổi khi đổi mẫu in */ }
}
```

**✅ Good example:**
```typescript
class Invoice {
  calculateTotal() { /* chỉ nghiệp vụ */ }
}
class InvoiceRepository {
  save(invoice: Invoice) { /* chỉ lưu trữ */ }
}
class InvoicePrinter {
  printToPdf(invoice: Invoice) { /* chỉ trình bày */ }
}
```

**Khi nào áp dụng:** Khi thiết kế class/module mới, hoặc khi một class bị sửa đổi bởi nhiều nhóm/nhiều lý do không liên quan tới nhau.

**Cách phát hiện trong source code:** Soi lịch sử commit — một class thường xuyên bị sửa vì các mục đích rất khác nhau (tính toán, lưu trữ, trình bày) trong các commit riêng biệt; class có import trộn lẫn tầng hạ tầng (DB driver, HTTP client) và tầng nghiệp vụ thuần tuý; số lượng method/field cao bất thường (dấu hiệu God Class, xem thêm REF-002/ARCH-006).

**Cách khắc phục:** Extract Class tách theo từng trách nhiệm/actor liên quan, mỗi class chỉ import những gì thực sự cần cho đúng một trách nhiệm đó.

**Nguồn:** ArjanCodes – "Uncle Bob's SOLID Principles Made Easy – In Python!"; Robert C. Martin – "Clean Architecture" (định nghĩa lại SRP theo actor).

---

### SOLID-002 — Open/Closed Principle (OCP)

**Category:** SOLID · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Module nên **mở để mở rộng, đóng để sửa đổi** — thêm hành vi mới bằng cách thêm code mới, không sửa lại code đã hoạt động ổn định.

**❌ Bad example:**
```typescript
function calculateArea(shape: { type: string; radius?: number; side?: number }) {
  if (shape.type === "circle") return Math.PI * shape.radius! ** 2;
  if (shape.type === "square") return shape.side! ** 2;
  // mỗi lần thêm hình mới phải quay lại sửa hàm này
}
```

**✅ Good example:**
```typescript
interface Shape { area(): number; }
class Circle implements Shape {
  constructor(private radius: number) {}
  area() { return Math.PI * this.radius ** 2; }
}
class Square implements Shape {
  constructor(private side: number) {}
  area() { return this.side ** 2; }
}
function totalArea(shapes: Shape[]) {
  return shapes.reduce((sum, s) => sum + s.area(), 0); // không cần sửa khi thêm Shape mới
}
```

**Khi nào áp dụng:** Khi logic rẽ nhánh theo một trường "loại/kind" và danh sách loại đó còn tiếp tục mở rộng trong tương lai.

**Cách phát hiện trong source code:** Chuỗi `if/else if` hoặc `switch` dài dựa trên field kiểu enum/string `type`, đặc biệt khi logic tương tự lặp lại ở nhiều nơi mỗi khi thêm loại mới.

**Cách khắc phục:** Replace Conditional with Polymorphism (xem REF-006); áp dụng Strategy hoặc Factory pattern.

**Nguồn:** ArjanCodes – "Uncle Bob's SOLID Principles Made Easy"; Amigoscode – "Learn SOLID Principles with CLEAN CODE Examples".

---

### SOLID-003 — Liskov Substitution Principle (LSP)

**Category:** SOLID · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Một lớp con phải **thay thế được lớp cha** ở bất kỳ đâu mà không làm sai lệch hành vi mà client mong đợi từ lớp cha. Vi phạm LSP thường ẩn giấu bug runtime khó phát hiện vì code vẫn biên dịch được.

**❌ Bad example:**
```typescript
class Bird { fly() { /* ... */ } }
class Penguin extends Bird {
  fly() { throw new Error("Penguin không biết bay"); } // phá vỡ hợp đồng của Bird
}
function letAllBirdsFly(birds: Bird[]) {
  birds.forEach(b => b.fly()); // sẽ crash nếu có Penguin trong mảng
}
```

**✅ Good example:**
```typescript
interface Bird {}
interface FlyingBird extends Bird { fly(): void; }
class Sparrow implements FlyingBird { fly() { /* ... */ } }
class Penguin implements Bird {} // không hứa hẹn khả năng fly()
```

**Khi nào áp dụng:** Khi thiết kế kế thừa (inheritance) hoặc implement interface có method mà không phải mọi lớp con đều thực hiện được đầy đủ.

**Cách phát hiện trong source code:** Subclass override method của lớp cha để `throw`/no-op thay vì thực hiện đúng hành vi; nhiều đoạn code gọi hàm dùng `instanceof`/type-check đặc biệt cho một subclass cụ thể trước khi gọi method chung.

**Cách khắc phục:** Tách interface theo đúng khả năng thực tế (kết hợp với ISP – SOLID-004); ưu tiên composition thay vì inheritance khi quan hệ không thực sự là "is-a" đầy đủ.

**Nguồn:** ArjanCodes – "Uncle Bob's SOLID Principles Made Easy" (phần Liskov Substitution).

---

### SOLID-004 — Interface Segregation Principle (ISP)

**Category:** SOLID · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Không nên ép một client phải phụ thuộc vào các method mà nó không hề dùng tới. Interface nên nhỏ, chuyên biệt theo vai trò (role interface) thay vì một interface "vạn năng".

**❌ Bad example:**
```typescript
interface Worker { work(): void; eat(): void; }
class RobotWorker implements Worker {
  work() { /* ... */ }
  eat() { throw new Error("Robot không ăn"); } // buộc phải implement method vô nghĩa
}
```

**✅ Good example:**
```typescript
interface Workable { work(): void; }
interface Eatable { eat(): void; }
class RobotWorker implements Workable { work() { /* ... */ } }
class HumanWorker implements Workable, Eatable { work() {} eat() {} }
```

**Khi nào áp dụng:** Khi thiết kế interface dùng chung cho nhiều loại client có nhu cầu khác nhau.

**Cách phát hiện trong source code:** Class implement interface nhưng để trống hoặc `throw`/no-op cho một số method "cho có"; interface có nhiều method nhưng phần lớn implementer chỉ thực sự dùng 1–2 trong số đó.

**Cách khắc phục:** Tách interface lớn thành nhiều interface nhỏ theo vai trò, class chỉ implement đúng những interface phù hợp với khả năng thật của nó.

**Nguồn:** ArjanCodes – "Uncle Bob's SOLID Principles Made Easy" (phần Interface Segregation, bao gồm cách dùng composition thay thế).

---

### SOLID-005 — Dependency Inversion Principle (DIP)

**Category:** SOLID · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Module cấp cao (business logic) không nên phụ thuộc trực tiếp vào module cấp thấp (chi tiết hạ tầng); cả hai nên phụ thuộc vào một abstraction chung. Đây là nguyên tắc SOLID quan trọng nhất theo Robert C. Martin — nó trở thành "Dependency Rule" ở cấp kiến trúc trong Clean Architecture (xem ARCH-002).

**❌ Bad example:**
```typescript
class MySQLDatabase { save(data: unknown) { /* ... */ } }
class OrderService {
  private db = new MySQLDatabase(); // phụ thuộc trực tiếp implementation cụ thể
  createOrder(order: Order) { this.db.save(order); }
}
```

**✅ Good example:**
```typescript
interface Database { save(data: unknown): Promise<void>; }
class MySQLDatabase implements Database { async save(data) { /* ... */ } }
class OrderService {
  constructor(private db: Database) {} // phụ thuộc abstraction, được inject từ ngoài
  createOrder(order: Order) { return this.db.save(order); }
}
```

**Khi nào áp dụng:** Khi một class tự `new` một dependency cụ thể (DB, HTTP client, file system...) ngay bên trong constructor/method thay vì nhận nó từ bên ngoài.

**Cách phát hiện trong source code:** Grep `new ConcreteClass()` bên trong class chứa business logic; unit test cho class đó không thể mock được dependency (dấu hiệu rõ ràng của việc thiếu DIP).

**Cách khắc phục:** Dependency Injection qua constructor, định nghĩa interface/abstract class làm điểm phụ thuộc, dùng DI container nếu dự án đủ lớn để cần.

**Nguồn:** ArjanCodes – "Uncle Bob's SOLID Principles Made Easy"; Robert C. Martin – "Clean Architecture" (The Dependency Rule).

---

### NHÓM D — SECURITY CODE REVIEW (SEC)
*Thực hành bảo mật tổng quát, đúc kết từ OWASP Secure Coding Practices Quick Reference Guide, OWASP Cheat Sheet Series, OWASP DevSlop Show "Security Code Review 101", và OWASP Code Review Guide.*

---

### SEC-001 — Không bao giờ tin dữ liệu đầu vào

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Mọi dữ liệu đến từ bên ngoài trust boundary (query param, body, header, cookie, file upload, response của API bên thứ ba) đều phải được validate theo whitelist (định dạng/kiểu/độ dài mong đợi) trước khi được sử dụng.

**❌ Bad example:**
```javascript
app.get("/user", (req, res) => {
  const id = req.query.id;
  db.query(`SELECT * FROM users WHERE id = ${id}`); // tin tưởng input tuyệt đối
});
```

**✅ Good example:**
```javascript
app.get("/user", (req, res) => {
  const id = z.string().uuid().parse(req.query.id); // validate schema, ném lỗi nếu sai định dạng
  db.query("SELECT * FROM users WHERE id = $1", [id]); // truy vấn tham số hoá
});
```

**Khi nào áp dụng:** Mọi điểm nhận dữ liệu từ bên ngoài trust boundary của hệ thống.

**Cách phát hiện trong source code:** Grep các điểm dùng trực tiếp `req.query`/`req.body`/`req.params` (hoặc tương đương ở framework khác) mà không đi qua lớp validate (Zod/Joi/class-validator/Pydantic); tìm nơi input được ghép thẳng vào chuỗi truy vấn/lệnh hệ thống.

**Cách khắc phục:** Thêm schema validation ngay tại boundary (API layer), dùng cơ chế whitelist (chỉ chấp nhận định dạng đã biết) thay vì blacklist (chặn từng ký tự xấu).

**Nguồn:** OWASP Secure Coding Practices – Quick Reference Guide; liên hệ trực tiếp OWASP Top 10:2025 A05 (Injection).

---

### SEC-002 — Không hardcode secret/credential trong source code

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
API key, mật khẩu, connection string tuyệt đối không được commit vào repository — kể cả repo private, vì lịch sử git là vĩnh viễn và dễ bị lộ qua fork/leak.

**❌ Bad example:**
```javascript
const dbPassword = "P@ssw0rd123";
const stripeKey = "sk_live_51H...";
```

**✅ Good example:**
```javascript
const dbPassword = process.env.DB_PASSWORD;
const stripeKey = process.env.STRIPE_SECRET_KEY; // lấy từ secret manager (Vault, AWS Secrets Manager, GCP Secret Manager...)
```

**Khi nào áp dụng:** Mọi nơi khởi tạo kết nối tới DB/dịch vụ bên ngoài, mọi lần cấu hình API key.

**Cách phát hiện trong source code:** Công cụ secret-scanning (gitleaks, TruffleHog, GitHub Advanced Security secret scanning) chạy trong CI và trên toàn bộ lịch sử git; regex tìm pattern key đặc trưng (`sk_live_`, `AKIA`, `-----BEGIN PRIVATE KEY-----`) hoặc chuỗi entropy cao được gán trực tiếp cho biến.

**Cách khắc phục:** Xoá secret khỏi lịch sử git (BFG Repo-Cleaner/`git filter-repo`), **thu hồi và tạo lại secret đã lộ ngay lập tức**, chuyển toàn bộ sang biến môi trường/secret manager, thêm pre-commit hook chặn secret trước khi commit.

**Nguồn:** OWASP Secure Coding Practices – Quick Reference Guide ("Connection strings should not be hard coded within the application").

---

### SEC-003 — Nguyên tắc đặc quyền tối thiểu (Least Privilege)

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Tài khoản DB/service account/API token chỉ nên được cấp đúng quyền cần thiết cho công việc của nó — không dùng tài khoản admin/root cho tác vụ vận hành thông thường.

**❌ Bad example:**
```yaml
# connection config
DB_USER: root  # có full quyền DROP/ALTER/GRANT trên toàn bộ database
```

**✅ Good example:**
```yaml
DB_USER: app_readwrite  # chỉ có quyền SELECT/INSERT/UPDATE trên đúng các bảng cần dùng
# migration dùng tài khoản riêng: DB_MIGRATION_USER (có quyền DDL, không dùng cho app runtime)
```

**Khi nào áp dụng:** Khi cấu hình kết nối DB, IAM role cho service, scope của OAuth token/API key.

**Cách phát hiện trong source code:** Review file cấu hình kết nối/IAM policy tìm quyền `*`/`ALL PRIVILEGES`/vai trò admin được dùng cho tác vụ thường ngày; kiểm tra scope OAuth rộng hơn nhu cầu thực tế của ứng dụng.

**Cách khắc phục:** Tạo role/user riêng theo đúng nhu cầu (least privilege), tách tài khoản migration khỏi tài khoản runtime, review định kỳ quyền đã cấp.

**Nguồn:** OWASP Secure Coding Practices – Quick Reference Guide; liên hệ OWASP Top 10:2025 A01 (Broken Access Control).

---

### SEC-004 — Fail securely — mặc định từ chối khi có lỗi

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Khi logic kiểm tra quyền/xác thực gặp lỗi hoặc ngoại lệ không lường trước, hệ thống phải **mặc định từ chối truy cập** (fail closed) — không bao giờ "cho qua" chỉ vì tiện xử lý lỗi.

**❌ Bad example:**
```javascript
function canAccess(user, resource) {
  try {
    return checkPermission(user, resource);
  } catch (e) {
    return true; // lỗi thì... cho qua luôn?
  }
}
```

**✅ Good example:**
```javascript
function canAccess(user, resource) {
  try {
    return checkPermission(user, resource);
  } catch (e) {
    logger.error("Permission check failed", { userId: user.id, resourceId: resource.id, error: e });
    return false; // mặc định từ chối khi không chắc chắn
  }
}
```

**Khi nào áp dụng:** Logic authorization/authentication, feature flag kiểm soát quyền, mọi nhánh xử lý lỗi trong luồng bảo mật.

**Cách phát hiện trong source code:** Tìm khối `catch` trong hàm authorization/authentication trả về giá trị "cho phép" (`true`/`allow`) thay vì "từ chối".

**Cách khắc phục:** Đảo giá trị mặc định thành deny, log đầy đủ để điều tra, viết test case riêng cho nhánh lỗi để đảm bảo nó fail closed.

**Nguồn:** OWASP Secure Coding Practices; liên hệ trực tiếp OWASP Top 10:2025 A10 (Mishandling of Exceptional Conditions — hạng mục này khuyến nghị rõ "making sure systems fail closed").

---

### SEC-005 — Không tự chế thuật toán mã hoá/băm (Don't Roll Your Own Crypto)

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Luôn dùng thư viện mã hoá đã được kiểm chứng rộng rãi (bcrypt/argon2id cho mật khẩu, AES-GCM cho dữ liệu, thư viện JWT chuẩn) — tự viết thuật toán "mã hoá" gần như chắc chắn kém an toàn hơn nhiều so với chuẩn công nghiệp.

**❌ Bad example:**
```javascript
function hashPassword(pw) {
  return pw.split("").reverse().join("") + "salt123"; // "mã hoá" tự chế, dễ đảo ngược
}
```

**✅ Good example:**
```javascript
import argon2 from "argon2";
async function hashPassword(pw) {
  return argon2.hash(pw, { type: argon2.argon2id }); // thuật toán chuẩn, tự sinh salt ngẫu nhiên
}
```

**Khi nào áp dụng:** Lưu mật khẩu, ký/xác minh token, mã hoá dữ liệu nhạy cảm khi lưu trữ hoặc truyền tải.

**Cách phát hiện trong source code:** Grep thuật toán băm yếu dùng cho mật khẩu (MD5, SHA1, SHA256 trực tiếp không salt), code tự triển khai XOR/Caesar cipher/đảo chuỗi, salt cố định hoặc rỗng.

**Cách khắc phục:** Thay bằng bcrypt/argon2id cho mật khẩu; dùng thư viện chuẩn (libsodium, Web Crypto API, `jsonwebtoken` với thuật toán rõ ràng) cho mã hoá/ký số.

**Nguồn:** OWASP Top 10:2025 A04 (Cryptographic Failures); tài liệu hướng dẫn bcrypt/argon2id đã kiểm chứng rộng rãi trong cộng đồng.

---

### SEC-006 — Không log dữ liệu nhạy cảm

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Log không được chứa mật khẩu, token, số thẻ, hay PII nhạy cảm khác — hệ thống log thường được chuyển tới bên thứ ba (giám sát, phân tích) với mức kiểm soát truy cập lỏng hơn so với database chính.

**❌ Bad example:**
```javascript
logger.info(`Login attempt: email=${email}, password=${password}`);
```

**✅ Good example:**
```javascript
logger.info("Login attempt", { email: maskEmail(email) }); // không log password; mask định danh
```

**Khi nào áp dụng:** Mọi câu lệnh log trong luồng authentication, thanh toán, hoặc xử lý PII.

**Cách phát hiện trong source code:** Grep câu lệnh log có chứa biến tên `password`, `token`, `secret`, `cardNumber`, `ssn`; rule Semgrep/SAST cho "sensitive-data-logging".

**Cách khắc phục:** Loại bỏ hoặc mask dữ liệu nhạy cảm trước khi log; dùng structured logging kèm danh sách field tự động bị redact.

**Nguồn:** OWASP Top 10:2025 A09 (Security Logging & Alerting Failures).

---

### SEC-007 — Quản lý & rà soát dependency bên thứ 3

**Category:** Security Code Review · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Thư viện/framework có lỗ hổng đã biết (CVE) hoặc bị chèn mã độc trong chuỗi cung ứng là một trong những điểm tấn công phổ biến và có tác động lớn nhất hiện nay — cần rà soát khi thêm mới và theo dõi liên tục.

**❌ Bad example:**
```json
// package.json ghim phiên bản đã 3 năm không cập nhật,
// không có bước quét lỗ hổng nào trong CI
"some-lib": "1.2.0"
```

**✅ Good example:**
```yaml
# CI pipeline
- run: npm audit --audit-level=high
- uses: github/dependabot   # tự động tạo PR cập nhật khi có CVE mới
```

**Khi nào áp dụng:** Khi thêm dependency mới, khi review định kỳ, và bắt buộc trước mỗi lần release.

**Cách phát hiện trong source code:** Chạy công cụ SCA (Software Composition Analysis) — OWASP Dependency-Check, Snyk, `npm audit`/`pip-audit`, GitHub Dependabot alerts; kiểm tra dependency thiếu lockfile hoặc khai báo version dạng `*`/`latest`.

**Cách khắc phục:** Cập nhật lên phiên bản đã vá lỗi, thêm bước SCA vào pipeline CI bắt buộc pass mới được merge, thiết lập chính sách review nguồn gốc trước khi thêm dependency mới.

**Nguồn:** OWASP Top 10:2025 A03 (Software Supply Chain Failures — mở rộng từ hạng mục "Vulnerable and Outdated Components" của bản 2021).

---

### NHÓM E — OWASP TOP 10:2025
*Dựa trên danh sách chính thức OWASP Top 10:2025 (owasp.org/Top10/2025/) — công bố dạng "final" tại OWASP Global AppSec Washington D.C. tháng 11/2025, chốt bản chính thức tháng 1/2026, thay thế bản 2021. Đây là bản cập nhật đầu tiên sau 4 năm, có 2 hạng mục mới (Software Supply Chain Failures, Mishandling of Exceptional Conditions) và SSRF được gộp vào Broken Access Control.*

---

### OWASP-001 — A01:2025: Broken Access Control (bao gồm SSRF)

**Category:** OWASP · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Hệ thống phải kiểm soát đúng quyền hạn cho mọi request ở phía server — người dùng không được thao tác ngoài phạm vi được phép (ví dụ xem/sửa dữ liệu của người khác qua đổi ID trên URL — IDOR). Từ bản 2025, Server-Side Request Forgery (SSRF) được gộp vào nhóm này vì bản chất cũng là hệ thống truy cập tài nguyên vượt quá phạm vi cho phép. Đây là hạng mục đứng #1 liên tiếp qua các kỳ, chiếm khoảng 3,73% ứng dụng được kiểm thử.

**❌ Bad example:**
```javascript
app.get("/invoices/:id", requireAuth, (req, res) => {
  const invoice = db.getInvoice(req.params.id);
  res.json(invoice); // không kiểm tra invoice có thuộc về req.user hay không
});
```

**✅ Good example:**
```javascript
app.get("/invoices/:id", requireAuth, (req, res) => {
  const invoice = db.getInvoice(req.params.id);
  if (invoice.ownerId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(invoice);
});
```

**Khi nào áp dụng:** Mọi endpoint truy cập tài nguyên theo ID, mọi chức năng giới hạn theo vai trò (role), và mọi tính năng để hệ thống tự fetch một URL do người dùng cung cấp (webhook, import ảnh từ URL — nguy cơ SSRF).

**Cách phát hiện trong source code:** Endpoint dùng ID lấy trực tiếp từ request để truy vấn DB nhưng không đối chiếu với user hiện tại (mẫu hình IDOR); thiếu middleware kiểm tra role trước khi vào handler; tính năng `fetch(url)` với `url` lấy từ input người dùng mà không giới hạn domain/IP đích.

**Cách khắc phục:** Kiểm tra quyền sở hữu/role ở server cho mọi request (không chỉ ẩn nút ở UI); dùng middleware authorization tập trung theo chuẩn (RBAC/ABAC); với nguy cơ SSRF — whitelist domain được phép gọi, chặn dải IP nội bộ (RFC1918) và địa chỉ metadata của cloud (169.254.169.254).

**Nguồn:** OWASP Top 10:2025 – A01 (top10.owasp.org/2025/A01_2025-Broken_Access_Control/).

---

### OWASP-002 — A02:2025: Security Misconfiguration

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
C��u hình mặc định không an toàn — CORS mở toàn bộ, debug mode bật ở production, thiếu security header, cloud storage public không cần thiết — là nguồn lỗ hổng phổ biến hàng đầu. Hạng mục này tăng từ vị trí #5 (2021) lên #2 (2025), phản ánh việc hành vi ứng dụng ngày càng phụ thuộc nhiều vào cấu hình.

**❌ Bad example:**
```javascript
app.use(cors({ origin: "*" })); // cho phép mọi domain gọi API
app.use((err, req, res, next) => {
  res.status(500).send(err.stack); // lộ stack trace chi tiết cho người dùng cuối
});
```

**✅ Good example:**
```javascript
app.use(cors({ origin: ["https://app.example.com"], credentials: true }));
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: "Internal Server Error" }); // không lộ chi tiết ra ngoài
});
```

**Khi nào áp dụng:** Cấu hình framework, web server, cloud resource trước khi deploy production.

**Cách phát hiện trong source code:** Rà soát cấu hình CORS `origin: "*"` kèm `credentials: true`; debug/dev mode bật ở môi trường production; thiếu security header (CSP, HSTS, X-Content-Type-Options — quét bằng Mozilla Observatory/securityheaders.com); cloud storage bucket ở chế độ public không cần thiết (quét bằng công cụ CSPM).

**Cách khắc phục:** Áp dụng checklist hardening (OWASP Secure Headers Project), tách file cấu hình theo môi trường (dev/staging/production), review cấu hình cloud định kỳ bằng công cụ tự động.

**Nguồn:** OWASP Top 10:2025 – A02 (top10.owasp.org/2025/A02_2025-Security_Misconfiguration/).

---

### OWASP-003 — A03:2025: Software Supply Chain Failures

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Hạng mục **mới trong 2025**, mở rộng từ "Vulnerable and Outdated Components" (A06:2021) sang phạm vi rộng hơn: toàn bộ chuỗi cung ứng phần mềm — dependency, build system, CI/CD pipeline, hạ tầng phân phối. Đây là hạng mục có ít dữ liệu CVE nhất nhưng điểm exploit/impact trung bình cao nhất, và được cộng đồng bầu chọn là mối lo hàng đầu.

**❌ Bad example:**
```yaml
# CI pipeline tải & chạy script cài đặt không xác thực nguồn gốc
- run: curl -sSL https://example.com/install.sh | bash
- uses: some-org/some-action@main   # dùng nhánh "main" thay vì version/commit cố định
```

**✅ Good example:**
```yaml
- uses: some-org/some-action@a1b2c3d4e5f6...   # pin theo commit SHA cụ thể
- run: npm ci   # cài đúng version đã khoá trong lockfile, xác minh checksum
```

**Khi nào áp dụng:** Thiết kế CI/CD pipeline, thêm GitHub Action/dependency bên thứ ba, cấu hình registry package.

**Cách phát hiện trong source code:** Pipeline có bước `curl | bash` không pin version; GitHub Action dùng tag/branch thay vì SHA cố định; thiếu SBOM (Software Bill of Materials); CI token có quyền vượt quá nhu cầu (ví dụ quyền ghi vào toàn bộ repo).

**Cách khắc phục:** Pin version bằng hash/commit SHA, tạo & theo dõi SBOM, giới hạn quyền của CI token theo least privilege, quét image container bằng Trivy/Grype trước khi deploy.

**Nguồn:** OWASP Top 10:2025 – A03 (top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/).

---

### OWASP-004 — A04:2025: Cryptographic Failures

**Category:** OWASP · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Dữ liệu nhạy cảm khi lưu trữ (at rest) và truyền tải (in transit) phải được mã hoá bằng thuật toán đủ mạnh và triển khai đúng cách. Đây là nguyên nhân hàng đầu dẫn tới lộ dữ liệu quy mô lớn.

**❌ Bad example:**
```sql
-- lưu số thẻ tín dụng dạng plaintext trong DB
CREATE TABLE payments (id INT, card_number VARCHAR(20), cvv VARCHAR(4));
```

**✅ Good example:**
```text
Không tự lưu số thẻ — dùng dịch vụ tokenization tuân thủ PCI-DSS (Stripe, Braintree...);
chỉ lưu token đại diện. Với dữ liệu nhạy cảm khác: mã hoá AES-256-GCM ở tầng ứng dụng,
khoá quản lý qua KMS; toàn bộ kết nối enforce TLS 1.2+ kèm HSTS.
```

**Khi nào áp dụng:** Thiết kế schema lưu dữ liệu nhạy cảm (thẻ, CCCD, thông tin y tế), cấu hình transport layer cho mọi endpoint.

**Cách phát hiện trong source code:** Grep tên cột DB kiểu `card_number`, `ssn`, `cccd` không có dấu hiệu đã mã hoá/tokenize; kiểm tra server có cho phép kết nối HTTP hoặc TLS phiên bản cũ (<1.2) qua công cụ như `testssl.sh`.

**Cách khắc phục:** Áp dụng mã hoá ở tầng ứng dụng hoặc DB (transparent data encryption), enforce HTTPS-only kèm HSTS toàn site, dùng dịch vụ quản lý khoá (KMS) thay vì tự quản lý khoá mã hoá.

**Nguồn:** OWASP Top 10:2025 – A04 (top10.owasp.org/2025/A04_2025-Cryptographic_Failures/).

---

### OWASP-005 — A05:2025: Injection

**Category:** OWASP · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Dữ liệu đầu vào bị hệ thống diễn giải nhầm thành câu lệnh/mã thực thi (SQL, NoSQL, OS command, LDAP...) do ghép chuỗi trực tiếp thay vì tham số hoá đúng cách. Injection có phạm vi từ XSS (tần suất cao, tác động thấp hơn) tới SQL Injection (tần suất thấp hơn nhưng tác động rất nghiêm trọng).

**❌ Bad example:**
```javascript
db.query(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);
// input username = admin' -- sẽ vượt qua toàn bộ điều kiện password
```

**✅ Good example:**
```javascript
db.query(
  "SELECT * FROM users WHERE username = $1 AND password_hash = $2",
  [username, passwordHash]
); // truy vấn tham số hoá — driver DB tự tách biệt code và data
```

**Khi nào áp dụng:** Mọi nơi xây dựng câu lệnh SQL/NoSQL/shell command/LDAP query có ghép dữ liệu từ người dùng.

**Cách phát hiện trong source code:** Grep chuỗi SQL được nối bằng `+`/template string chứa biến ngay trong `SELECT/INSERT/UPDATE/DELETE`; gọi `exec()`/`child_process.exec()` với chuỗi input chưa qua sanitize; công cụ SAST (Semgrep, SonarQube, CodeQL) có rule injection chuyên biệt cho từng ngôn ngữ.

**Cách khắc phục:** Dùng parameterized query/prepared statement hoặc ORM có tham số hoá sẵn; escape output đúng ngữ cảnh (HTML/SQL/Shell khác nhau); dùng allowlist cho các trường hợp đặc biệt như tên cột dùng trong `ORDER BY`.

**Nguồn:** OWASP Top 10:2025 – A05 (top10.owasp.org/2025/A05_2025-Injection/); Computerphile – "Hacking Websites with SQL Injection", "Running an SQL Injection Attack".

---

### OWASP-006 — A06:2025: Insecure Design

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Lỗ hổng bắt nguồn từ việc **thiết kế** thiếu kiểm soát ngay từ đầu (không threat-modeling), khác với lỗi cài đặt (implementation bug) — ví dụ luồng nghiệp vụ không giới hạn số lần thử OTP, hoặc cho phép bỏ qua một bước bắt buộc trong quy trình thanh toán.

**❌ Bad example:**
```javascript
app.post("/verify-otp", async (req, res) => {
  const isValid = await checkOtp(req.body.userId, req.body.otp);
  res.json({ isValid }); // không giới hạn số lần thử -> brute-force OTP 6 số trong vài phút
});
```

**✅ Good example:**
```javascript
app.post("/verify-otp", rateLimiter({ max: 5, windowMinutes: 15 }), async (req, res) => {
  const isValid = await checkOtp(req.body.userId, req.body.otp);
  if (!isValid) await recordFailedAttempt(req.body.userId);
  res.json({ isValid });
});
```

**Khi nào áp dụng:** Giai đoạn thiết kế tính năng nhạy cảm (thanh toán, xác thực, đặt lại mật khẩu) — trước khi viết code.

**Cách phát hiện trong source code:** Rà soát business logic nhạy cảm thiếu rate limit/giới hạn số lần thử; thiếu tài liệu threat model cho luồng quan trọng; requirement/spec không đề cập tới rủi ro lạm dụng (abuse case).

**Cách khắc phục:** Áp dụng threat modeling (ví dụ STRIDE) ngay khi thiết kế; thêm rate limiting/anti-automation; thiết kế "secure by default" thay vì vá lỗi sau khi phát hiện bị khai thác.

**Nguồn:** OWASP Top 10:2025 – A06 (top10.owasp.org/2025/A06_2025-Insecure_Design/).

---

### OWASP-007 — A07:2025: Authentication Failures

**Category:** OWASP · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
C� chế xác thực yếu (JWT cấu hình sai, session không hết hạn, thiếu giới hạn brute-force, thông báo lỗi tiết lộ tài khoản có tồn tại hay không) cho phép kẻ tấn công giả danh người dùng hợp lệ. Hạng mục này đổi tên từ "Identification and Authentication Failures" (2021) để phản ánh chính xác hơn phạm vi 36 CWE liên quan.

**❌ Bad example:**
```javascript
// Frontend: lưu JWT ở localStorage — dễ bị đánh cắp qua XSS
localStorage.setItem("token", jwt);
// Backend: không ràng buộc thuật toán khi verify
jwt.verify(token, secret); // có thể bị tấn công kiểu "alg: none" nếu thư viện không mặc định chặn
```

**✅ Good example:**
```javascript
// Backend: gửi JWT qua httpOnly, Secure, SameSite=Strict cookie thay vì để frontend tự lưu
res.cookie("token", jwt, { httpOnly: true, secure: true, sameSite: "strict" });
jwt.verify(token, secret, { algorithms: ["RS256"] }); // ràng buộc rõ thuật toán được chấp nhận
```

**Khi nào áp dụng:** Thiết kế luồng đăng nhập, quản lý JWT/session, chính sách mật khẩu và khôi phục tài khoản.

**Cách phát hiện trong source code:** JWT được lưu ở `localStorage`/`sessionStorage` phía frontend; `jwt.verify` không truyền tham số `algorithms` cố định; endpoint login thiếu rate limit; thời gian phản hồi khác nhau rõ rệt giữa trường hợp "email không tồn tại" và "sai mật khẩu" (user enumeration qua timing).

**Cách khắc phục:** Chuyển token sang httpOnly cookie, ràng buộc tường minh thuật toán JWT được chấp nhận, thêm MFA và rate limit cho endpoint xác thực, chuẩn hoá thông báo lỗi đăng nhập (không phân biệt "sai email" hay "sai mật khẩu"), invalidate session ở server khi đổi mật khẩu/đăng xuất.

**Nguồn:** OWASP Top 10:2025 – A07 (top10.owasp.org/2025/A07_2025-Authentication_Failures/); OWASP Authentication Cheat Sheet.

---

### OWASP-008 — A08:2025: Software or Data Integrity Failures

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Hệ thống tin tưởng code/dữ liệu/bản cập nhật mà không xác minh tính toàn vẹn (chữ ký số, checksum) trước khi sử dụng — ví dụ deserialize dữ liệu không đáng tin cậy thành object có thể thực thi code, hoặc cơ chế auto-update không kiểm tra chữ ký nguồn phát hành.

**❌ Bad example:**
```python
import pickle
data = pickle.loads(request_body)  # deserialize dữ liệu không tin cậy có thể thực thi mã tuỳ ý
```

**✅ Good example:**
```python
import json
data = json.loads(request_body)  # parser an toàn, chỉ tạo ra cấu trúc dữ liệu, không thực thi code
```

**Khi nào áp dụng:** Deserialize dữ liệu từ nguồn không tin cậy, cơ chế auto-update/plugin loading, pipeline CI/CD nhận artifact từ bên ngoài.

**Cách phát hiện trong source code:** Grep sử dụng `eval()`, `pickle.loads()`, `unserialize()` (PHP), `yaml.load()` thay vì `yaml.safe_load()` trên input không tin cậy; thiếu bước kiểm tra checksum/chữ ký số khi tải file cập nhật/plugin.

**Cách khắc phục:** Dùng parser an toàn (JSON thay vì pickle/eval, `yaml.safe_load` thay vì `yaml.load`), xác minh chữ ký số trước khi thực thi code/update đến từ nguồn ngoài.

**Nguồn:** OWASP Top 10:2025 – A08 (top10.owasp.org/2025/A08_2025-Software_or_Data_Integrity_Failures/).

---

### OWASP-009 — A09:2025: Security Logging & Alerting Failures

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟡🟠 Medium–High

**Nguyên tắc (Principle):**
Thiếu log các sự kiện bảo mật quan trọng (đăng nhập thất bại liên tục, thay đổi quyền, truy cập bất thường) khiến tấn công không bị phát hiện kịp thời. Tên hạng mục được bổ sung thêm "Alerting" trong 2025 để nhấn mạnh: **có log mà không có cơ chế cảnh báo thì gần như vô giá trị** trong việc phát hiện sự cố.

**❌ Bad example:**
```javascript
app.post("/login", async (req, res) => {
  const ok = await verifyCredentials(req.body);
  if (!ok) return res.status(401).end(); // thất bại nhưng không ghi log, không có alert
  // ...
});
```

**✅ Good example:**
```javascript
app.post("/login", async (req, res) => {
  const ok = await verifyCredentials(req.body);
  securityLogger.log({ event: "login_attempt", success: ok, ip: req.ip, userId: req.body.email });
  if (!ok) return res.status(401).end();
  // Hệ thống giám sát (SIEM) alert khi phát hiện > N lần login_attempt thất bại/phút cho cùng IP/tài khoản
});
```

**Khi nào áp dụng:** Thiết kế observability cho mọi luồng bảo mật quan trọng (auth, phân quyền, thao tác nhạy cảm).

**Cách phát hiện trong source code:** Kiểm tra endpoint login/authorization có ghi log sự kiện thất bại hay không; kiểm tra có pipeline alerting thực sự (không chỉ lưu log thụ động) cho các ngưỡng bất thường.

**Cách khắc phục:** Chuẩn hoá log sự kiện bảo mật (ai, làm gì, khi nào, từ đâu) dưới dạng structured logging; thiết lập alerting rule + runbook phản ứng sự cố cho các pattern đáng ngờ.

**Nguồn:** OWASP Top 10:2025 – A09 (top10.owasp.org/2025/A09_2025-Security_Logging_and_Alerting_Failures/).

---

### OWASP-010 — A10:2025: Mishandling of Exceptional Conditions

**Category:** OWASP · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Hạng mục **hoàn toàn mới trong 2025** (24 CWE) — lỗi xảy ra khi hệ thống không xử lý đúng tình huống bất thường: race condition, exception bị nuốt rồi tiếp tục chạy như bình thường, retry vô hạn, hoặc "fail open" thay vì "fail closed". Theo giải thích chính thức từ đồng trưởng nhóm OWASP Top 10, có 3 dạng lỗi: hệ thống không ngăn được tình huống bất thường xảy ra, không phát hiện được nó đã xảy ra, hoặc phát hiện nhưng phản ứng sai.

**❌ Bad example:**
```javascript
async function chargeAndShip(order) {
  try {
    await chargeCard(order);
    await shipOrder(order);
  } catch (e) {
    console.log("có lỗi nhưng thôi bỏ qua"); // nuốt lỗi, không rõ đã charge hay đã ship chưa
  }
}
```

**✅ Good example:**
```javascript
async function chargeAndShip(order) {
  try {
    await chargeCard(order);
  } catch (e) {
    logger.error("Charge failed, huỷ giao hàng", { orderId: order.id, error: e });
    throw new PaymentFailedError(order.id); // dừng luồng, không ship khi chưa chắc chắn đã charge
  }
  await shipOrder(order); // chỉ chạy khi charge chắc chắn thành công
}
```

**Khi nào áp dụng:** Luồng nghiệp vụ nhiều bước có thể thất bại giữa chừng, xử lý concurrency/race condition, thiết kế retry logic.

**Cách phát hiện trong source code:** Khối `catch` bắt tất cả loại lỗi (`catch (e)` chung chung) rồi vẫn tiếp tục luồng "happy path"; thao tác kiểm tra-rồi-dùng (check-then-act) trên tài nguyên dùng chung không có lock/transaction; retry không giới hạn số lần hoặc không có backoff.

**Cách khắc phục:** Bắt lỗi cụ thể theo từng loại thay vì bắt chung, đảm bảo fail closed (xem SEC-004), thêm global exception handler ở boundary của ứng dụng, dùng transaction/lock cho thao tác nhạy cảm với race condition, giới hạn số lần retry kèm backoff + jitter.

**Nguồn:** OWASP Top 10:2025 – A10 (top10.owasp.org/2025/A10_2025-Mishandling_of_Exceptional_Conditions/); SC Media – tường thuật công bố tại OWASP Global AppSec 2025.

---

### NHÓM F — PERFORMANCE (PERF)
*Đúc kết từ "Premature Optimization" (kênh CodeAesthetic), các video/tài liệu đã kiểm chứng về N+1 Query và database indexing, và thực hành kỹ thuật phổ biến về async I/O, caching, resource management.*

---

### PERF-001 — Tránh vấn đề N+1 Query

**Category:** Performance · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Lặp qua một danh sách và truy vấn riêng lẻ cho từng phần tử liên quan (do cơ chế lazy loading mặc định của ORM) tạo ra N+1 lượt gọi DB thay vì 1–2 lượt — hiệu năng suy giảm gần như tuyến tính theo số lượng bản ghi, thường "chạy tốt ở dev, sập ở production" vì dev chỉ test với vài bản ghi.

**❌ Bad example:**
```javascript
const posts = await Post.findAll();
for (const post of posts) {
  post.author = await User.findById(post.authorId); // 1 query riêng cho MỖI post → N+1 query
}
```

**✅ Good example:**
```javascript
const posts = await Post.findAll({
  include: [{ model: User, as: "author" }], // JOIN 1 lần duy nhất (eager loading)
});
```

**Khi nào áp dụng:** Mọi vòng lặp có gọi DB/API bên trong, đặc biệt khi dùng ORM (Sequelize, TypeORM, Hibernate/JPA, ActiveRecord, Django ORM...).

**Cách phát hiện trong source code:** Bật query logging và đếm số query lặp lại theo cùng một pattern chỉ khác giá trị ID; APM tool (Datadog, New Relic) cảnh báo query count bất thường trên một request; review code tìm `await`/query bên trong `for`/`.map()`/`.forEach()` gọi tới ORM hoặc HTTP client.

**Cách khắc phục:** Dùng eager loading (`include`/`JOIN`) để lấy dữ liệu liên quan trong 1 lượt; batch query bằng `WHERE id IN (...)` khi không dùng ORM; dùng DataLoader pattern cho GraphQL.

**Nguồn:** "The N+1 Query Problem with Hibernate ORM" (YouTube).

---

### PERF-002 — Đánh index đúng cho cột thường xuyên truy vấn

**Category:** Performance · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Thiếu index trên cột dùng trong `WHERE/JOIN/ORDER BY` khiến DB phải quét toàn bộ bảng (full table scan) — chậm dần khi dữ liệu tăng. Ngược lại, đánh index tràn lan lại làm chậm mọi thao tác ghi (mỗi INSERT/UPDATE/DELETE phải cập nhật thêm index) — cần đánh index có chủ đích, dựa trên câu query thực tế đo được.

**❌ Bad example:**
```sql
-- Bảng orders có 10 triệu dòng, không có index trên customer_email
SELECT * FROM orders WHERE customer_email = 'alice@example.com';
-- EXPLAIN cho thấy "Seq Scan" — quét toàn bộ 10 triệu dòng
```

**✅ Good example:**
```sql
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
-- Sau khi có index, EXPLAIN ANALYZE cho thấy "Index Scan", thời gian giảm từ giây xuống mili-giây
```

**Khi nào áp dụng:** Thiết kế schema ban đầu, và khi phát hiện query chậm qua slow query log.

**Cách phát hiện trong source code:** Chạy `EXPLAIN`/`EXPLAIN ANALYZE` tìm `Seq Scan`/`Full Table Scan` trên bảng lớn; theo dõi slow query log vượt ngưỡng; đối chiếu cột dùng trong `WHERE/JOIN/ORDER BY` với danh sách index hiện có của bảng.

**Cách khắc phục:** Thêm index phù hợp (đơn cột hoặc composite theo đúng thứ tự cột dùng trong query), tránh đánh index thừa trên cột hiếm khi dùng để đọc, đo lại bằng `EXPLAIN` sau khi thêm để xác nhận cải thiện.

**Nguồn:** "Database Indexes - You Might Be Using Them Wrong" (YouTube); "Stop Adding Indexes. Do This Instead" (YouTube).

---

### PERF-003 — Không tối ưu sớm khi chưa đo đạc (Avoid Premature Optimization)

**Category:** Performance · **Mức độ nghiêm trọng:** 🟢🟡 Low–Medium

**Nguyên tắc (Principle):**
Tối ưu khi chưa có số liệu (profiling) dễ khiến code phức tạp hơn mà không cải thiện hiệu năng thực chất, đồng thời làm mất thời gian có thể dùng để sửa điểm nghẽn thật sự. Nguyên tắc: đo trước, tối ưu sau, và luôn tối ưu điểm ảnh hưởng nhiều nhất tới người dùng trước.

**❌ Bad example:**
```javascript
// Viết bit-manipulation khó đọc để "tối ưu" 1 hàm chỉ chạy vài lần/ngày,
// trong khi endpoint chính đang chậm vì N+1 query (PERF-001) chưa ai sửa
const isEven = (n) => !(n & 1);
```

**✅ Good example:**
```text
1. Dùng profiler (Chrome DevTools, py-spy, pprof, APM) đo điểm nghẽn thực sự.
2. Xác nhận đúng là hot path (chạy nhiều lần / ảnh hưởng nhiều request).
3. Chỉ khi đó mới đầu tư công sức tối ưu, kèm benchmark trước/sau để chứng minh hiệu quả.
```

**Khi nào áp dụng:** Trước khi quyết định đầu tư công sức tối ưu hiệu năng cho bất kỳ đoạn code nào.

**Cách phát hiện trong source code:** Comment kiểu "tối ưu hiệu năng" nhưng không kèm số liệu benchmark trước/sau; độ phức tạp code tăng cao ở vị trí không phải hot path theo dữ liệu profiling thực tế.

**Cách khắc phục:** Thêm bước benchmark/profiling bắt buộc trước khi tối ưu; revert tối ưu không chứng minh được lợi ích đo lường được; ưu tiên độ rõ ràng của code khi hiệu năng chưa được xác nhận là vấn đề.

**Nguồn:** CodeAesthetic – "Premature Optimization" (youtube.com/watch?v=tKbV6BpH-C8).

---

### PERF-004 — Song song hoá các thao tác I/O độc lập

**Category:** Performance · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Gọi tuần tự (`await` từng cái một) nhiều tác vụ I/O độc lập (API call, DB query không phụ thuộc dữ liệu của nhau) khiến tổng thời gian chờ cộng dồn theo tổng các lệnh gọi, thay vì chỉ bằng lệnh gọi chậm nhất nếu chạy song song.

**❌ Bad example:**
```javascript
const user = await fetchUser(id);
const orders = await fetchOrders(id);   // không phụ thuộc kết quả của fetchUser, nhưng vẫn phải chờ tuần tự
const reviews = await fetchReviews(id); // tổng thời gian = t(user) + t(orders) + t(reviews)
```

**✅ Good example:**
```javascript
const [user, orders, reviews] = await Promise.all([
  fetchUser(id), fetchOrders(id), fetchReviews(id),
]); // tổng thời gian ≈ max(t(user), t(orders), t(reviews))
```

**Khi nào áp dụng:** Khi có từ 2 lời gọi I/O độc lập trở lên, không có quan hệ dữ liệu phụ thuộc lẫn nhau (kết quả của lệnh này không phải input của lệnh kia).

**Cách phát hiện trong source code:** Nhiều dòng `await` liên tiếp gọi hàm bất đồng bộ độc lập mà không dùng kết quả của nhau; đo latency endpoint xấp xỉ tổng thời gian từng lệnh gọi cộng lại (thay vì bằng lệnh gọi chậm nhất).

**Cách khắc phục:** Gộp bằng `Promise.all` (JavaScript/TypeScript), `asyncio.gather` (Python), `CompletableFuture.allOf` (Java) khi các tác vụ thực sự độc lập với nhau.

**Nguồn:** Thực hành lập trình bất đồng bộ chuẩn theo tài liệu chính thức (MDN Web Docs – `Promise.all`), nhất quán với các nguồn về tối ưu I/O/N+1 đã dẫn ở trên.

---

### PERF-005 — Cache dữ liệu tốn kém kèm chiến lược invalidation rõ ràng

**Category:** Performance · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Tính toán/truy vấn tốn kém được lặp lại nhiều lần với cùng input nên được cache để giảm tải; nhưng cache thiếu chiến lược invalidation rõ ràng sẽ trả về dữ liệu cũ (stale data) sau khi dữ liệu gốc thay đổi — đánh đổi giữa hiệu năng và độ tươi mới của dữ liệu cần được cân nhắc có chủ đích, không phải thêm cache "cho chắc".

**❌ Bad example:**
```javascript
app.get("/leaderboard", async (req, res) => {
  const board = await computeLeaderboardFromAllData(); // tính lại từ đầu mỗi request, rất tốn kém
  res.json(board);
});
```

**✅ Good example:**
```javascript
app.get("/leaderboard", async (req, res) => {
  let board = await redis.get("leaderboard");
  if (!board) {
    board = await computeLeaderboardFromAllData();
    await redis.set("leaderboard", JSON.stringify(board), "EX", 60); // TTL 60s
  }
  res.json(board);
});
// Khi có điểm số mới: chủ động xoá/ghi đè key "leaderboard" thay vì chỉ chờ TTL hết hạn
```

**Khi nào áp dụng:** Dữ liệu tính toán tốn kém, tỉ lệ đọc nhiều/ghi ít, và ứng dụng chấp nhận được một độ trễ nhất định giữa dữ liệu gốc thay đổi và cache được cập nhật.

**Cách phát hiện trong source code:** Endpoint có thời gian phản hồi cao do tính toán lặp lại giống hệt nhau giữa các request liên tiếp; hoặc ngược lại — bug do cache trả dữ liệu cũ sau khi ghi (thiếu invalidation chủ động).

**Cách khắc phục:** Thêm cache layer (Redis/Memcached/in-memory) với TTL phù hợp với mức độ chấp nhận dữ liệu cũ; chủ động invalidate cache khi ghi dữ liệu liên quan (write-through/cache-aside tuỳ use case).

**Nguồn:** Thực hành phổ biến trong tối ưu hệ thống dữ liệu (xuất hiện xuyên suốt các tài liệu về giải quyết N+1 Query đã dẫn ở PERF-001, coi caching là một chiến lược bổ trợ).

---

### PERF-006 — Tránh độ phức tạp thuật toán cao khi có giải pháp tuyến tính

**Category:** Performance · **Mức độ nghiêm trọng:** 🟡🟠 Medium–High

**Nguyên tắc (Principle):**
Thuật toán O(n²) trở lên trên tập dữ liệu có khả năng lớn dần theo thời gian sẽ trở thành nút thắt cổ chai khi hệ thống scale — nên chọn cấu trúc dữ liệu/thuật toán phù hợp ngay từ đầu khi biết trước dữ liệu sẽ tăng trưởng.

**❌ Bad example:**
```javascript
function findDuplicates(arr) {
  const dups = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) { // O(n²)
      if (arr[i] === arr[j]) dups.push(arr[i]);
    }
  }
  return dups;
}
```

**✅ Good example:**
```javascript
function findDuplicates(arr) {
  const seen = new Set();
  const dups = new Set();
  for (const item of arr) { // O(n)
    if (seen.has(item)) dups.add(item);
    seen.add(item);
  }
  return [...dups];
}
```

**Khi nào áp dụng:** Xử lý tập dữ liệu có khả năng tăng trưởng lớn (danh sách người dùng, giao dịch...), đặc biệt khi thấy vòng lặp lồng nhau duyệt trên cùng một tập dữ liệu.

**Cách phát hiện trong source code:** Review code tìm vòng lặp lồng nhau duyệt cùng một mảng/danh sách (dấu hiệu O(n²) trở lên); benchmark với kích thước dữ liệu lớn hơn thực tế production để phát hiện suy giảm hiệu năng phi tuyến sớm.

**Cách khắc phục:** Thay tìm kiếm tuyến tính lồng nhau bằng cấu trúc dữ liệu tra cứu O(1) trung bình (HashMap/Set/Dictionary), hoặc sắp xếp trước rồi dùng kỹ thuật two-pointer.

**Nguồn:** Kiến thức thuật toán/độ phức tạp nền tảng, nhất quán với nguyên tắc "đo trước khi tối ưu" ở PERF-003 (CodeAesthetic).

---

### PERF-007 — Tránh over-fetching, luôn phân trang

**Category:** Performance · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
API/DB query trả về toàn bộ bảng hoặc dùng `SELECT *` khi client chỉ cần vài cột/vài dòng gây lãng phí băng thông, bộ nhớ, và chậm dần khi dữ liệu tăng theo thời gian — endpoint danh sách luôn cần giới hạn số lượng bản ghi trả về.

**❌ Bad example:**
```javascript
app.get("/users", async (req, res) => {
  const users = await db.query("SELECT * FROM users"); // toàn bộ cột, toàn bộ dòng, không giới hạn
  res.json(users);
});
```

**✅ Good example:**
```javascript
app.get("/users", async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = await db.query(
    "SELECT id, name, email FROM users ORDER BY id LIMIT $1 OFFSET $2",
    [limit, (page - 1) * limit]
  );
  res.json(users);
});
```

**Khi nào áp dụng:** Mọi endpoint trả về danh sách có khả năng phát triển lớn theo thời gian.

**Cách phát hiện trong source code:** Endpoint danh sách không nhận tham số phân trang; query dùng `SELECT *` trên bảng lớn; payload response API vượt ngưỡng bất thường (đo qua APM/kích thước response).

**Cách khắc phục:** Thêm phân trang (limit/offset cho dataset vừa, cursor-based cho dataset rất lớn để tránh vấn đề `OFFSET` chậm dần), chỉ `SELECT` đúng cột cần thiết.

**Nguồn:** Thực hành thiết kế RESTful API phổ biến, liên hệ với nguyên tắc "Insecure Design" (OWASP Top 10:2025 A06 — thiếu giới hạn tài nguyên cũng là một dạng thiết kế thiếu kiểm soát).

---

### PERF-008 — Giải phóng tài nguyên đúng cách (tránh rò rỉ)

**Category:** Performance · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Kết nối DB, file handle, event listener không được giải phóng sau khi dùng sẽ tích luỹ dần theo thời gian, gây rò rỉ bộ nhớ/connection pool và cuối cùng làm sập ứng dụng — đặc biệt nghiêm trọng với service chạy dài hạn (long-running process).

**❌ Bad example:**
```javascript
function readConfig() {
  const fd = fs.openSync("config.json", "r");
  const data = fs.readFileSync(fd);
  return JSON.parse(data); // quên fs.closeSync(fd) — rò rỉ file descriptor
}
```

**✅ Good example:**
```javascript
function readConfig() {
  const fd = fs.openSync("config.json", "r");
  try {
    return JSON.parse(fs.readFileSync(fd));
  } finally {
    fs.closeSync(fd); // đảm bảo luôn đóng dù có lỗi xảy ra
  }
}
```

**Khi nào áp dụng:** Mọi thao tác mở kết nối/file/subscribe event không dùng cơ chế tự động dọn dẹp (try-with-resources, `using`, context manager).

**Cách phát hiện trong source code:** Grep lệnh `open()/connect()` không có `close()`/`finally` tương ứng; theo dõi số connection trong pool hoặc memory usage tăng dần đều theo thời gian không giảm (dấu hiệu leak qua monitoring); component có `addEventListener`/subscribe nhưng thiếu cleanup tương ứng trong lifecycle (ví dụ `useEffect` không có hàm dọn dẹp trong React).

**Cách khắc phục:** Dùng try/finally hoặc cấu trúc tự động đóng tài nguyên theo ngôn ngữ (`with` của Python, try-with-resources của Java, `using` của C#), luôn cleanup listener/subscription trong lifecycle hook tương ứng.

**Nguồn:** Thực hành quản lý tài nguyên phổ biến, nhất quán với nguyên tắc "fail securely"/xử lý ngoại lệ đã dẫn ở SEC-004 và OWASP-010.

---

### NHÓM G — ARCHITECTURE (ARCH)
*Đúc kết từ "The Principles of Clean Architecture" – Robert C. Martin (GOTO Conferences), kênh CodeOpinion (Derek Comartin) về Software Architecture & Design, và video đã kiểm chứng về Circuit Breaker pattern.*

---

### ARCH-001 — Phân tầng, tách biệt các mối quan tâm (Separation of Concerns)

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Logic nghiệp vụ, truy cập dữ liệu, và trình bày (UI/API) nên tách thành các tầng riêng biệt. Controller/route handler chỉ nên điều phối, không chứa business logic hay câu SQL trực tiếp.

**❌ Bad example:**
```javascript
app.post("/orders", async (req, res) => {
  const total = req.body.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = total > 1_000_000 ? total * 0.1 : 0; // business logic ngay trong controller
  await db.query(`INSERT INTO orders (total) VALUES (${total - discount})`); // SQL ghép chuỗi ngay trong controller
  res.json({ total: total - discount });
});
```

**✅ Good example:**
```javascript
app.post("/orders", async (req, res) => {
  const order = await orderService.createOrder(req.body.items); // controller chỉ điều phối
  res.json(order);
});
// order.service.ts chứa business logic (tính tổng, áp discount)
// order.repository.ts chứa truy vấn DB tham số hoá
```

**Khi nào áp dụng:** Thiết kế controller/route handler, đặc biệt khi logic nghiệp vụ vượt quá vài dòng đơn giản.

**Cách phát hiện trong source code:** Route handler/controller có hơn 20–30 dòng logic, chứa câu SQL trực tiếp hoặc phép tính nghiệp vụ phức tạp; khó viết unit test cho business logic vì nó bị khoá chặt với đối tượng HTTP request/response.

**Cách khắc phục:** Tách theo mô hình Controller (nhận request) → Service (business logic) → Repository (truy cập dữ liệu); áp dụng theo Clean/Layered/Hexagonal Architecture tuỳ quy mô dự án.

**Nguồn:** Robert C. Martin – "The Principles of Clean Architecture" (GOTO Conferences, youtube.com/watch?v=o_TH-Y78tt4); CodeOpinion.

---

### ARCH-002 — Phụ thuộc hướng vào abstraction (The Dependency Rule)

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟡🟠 Medium–High

**Nguyên tắc (Principle):**
Mở rộng DIP (SOLID-005) lên cấp kiến trúc: các tầng chứa quy tắc nghiệp vụ cốt lõi (domain) không nên phụ thuộc trực tiếp vào framework/DB/UI cụ thể. Chi tiết cài đặt nên phụ thuộc vào business logic, không phải ngược lại — đây chính là "Dependency Rule" trong Clean Architecture của Robert C. Martin.

**❌ Bad example:**
```typescript
// order-service.ts (tầng domain) import trực tiếp ORM cụ thể
import { OrderModel } from "../infra/sequelize/OrderModel";
class OrderService {
  calculatePricing(order: OrderModel) { /* business rule bị khoá chặt với Sequelize */ }
}
```

**✅ Good example:**
```typescript
// domain/order-repository.ts — chỉ là interface, không phụ thuộc công nghệ cụ thể
interface OrderRepository { save(order: Order): Promise<void>; }
// infra/sequelize/order-repository.ts — implementation cụ thể nằm ở tầng ngoài
class SequelizeOrderRepository implements OrderRepository { /* ... */ }
```

**Khi nào áp dụng:** Thiết kế ranh giới giữa domain logic và framework/hạ tầng kỹ thuật.

**Cách phát hiện trong source code:** Business logic import trực tiếp package framework/ORM cụ thể; đổi framework/DB đòi hỏi sửa code business logic cốt lõi thay vì chỉ sửa adapter ở tầng ngoài.

**Cách khắc phục:** Định nghĩa interface/port ở tầng domain, implement adapter cụ thể ở tầng ngoài (Ports & Adapters/Hexagonal Architecture), dùng Dependency Injection để lắp ráp ở điểm khởi động ứng dụng.

**Nguồn:** Robert C. Martin – "The Principles of Clean Architecture" (GOTO Conferences).

---

### ARCH-003 — Tránh coupling chặt giữa các module/service

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Module/service phụ thuộc quá chi tiết vào cấu trúc nội bộ của nhau khiến một thay đổi nhỏ lan rộng ra toàn hệ thống. Nên giao tiếp qua interface/event có contract ổn định thay vì chia sẻ trực tiếp cấu trúc dữ liệu nội bộ.

**❌ Bad example:**
```text
Service A đọc thẳng vào bảng nội bộ của Service B (shared-database anti-pattern);
hoặc Service B publish event chứa toàn bộ entity nội bộ (50 field), khiến mọi
consumer phải sửa theo mỗi khi B đổi schema — dù chỉ dùng 2 trong 50 field đó.
```

**✅ Good example:**
```text
Service B expose event "OrderShipped" với DTO tối giản: { orderId, shippedAt }.
Service A chỉ phụ thuộc vào contract này (có version rõ ràng),
không đọc thẳng DB hay biết cấu trúc nội bộ của B.
```

**Khi nào áp dụng:** Thiết kế ranh giới giữa các service/module trong hệ thống phân tán hoặc modular monolith.

**Cách phát hiện trong source code:** Nhiều service cùng truy cập chung một database/table; message/event chứa toàn bộ entity nội bộ thay vì DTO tối giản; một thay đổi ở service này luôn kéo theo phải sửa nhiều service khác (dấu hiệu Shotgun Surgery ở cấp kiến trúc — xem REF-007).

**Cách khắc phục:** Mỗi service sở hữu dữ liệu riêng (database-per-service); giao tiếp qua API/event có contract rõ ràng kèm versioning; dùng anti-corruption layer khi tích hợp với hệ thống cũ.

**Nguồn:** CodeOpinion – nội dung về Event-Driven Architecture và coupling; Robert C. Martin – "Clean Architecture".

---

### ARCH-004 — Thiết kế chịu lỗi khi gọi hệ thống bên ngoài (Design for Failure)

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Mọi lời gọi mạng tới service khác đều có khả năng chậm hoặc thất bại. Cần timeout, retry có backoff, và circuit breaker để tránh lỗi lan truyền (cascading failure) khiến toàn hệ thống sập chỉ vì một dependency gặp sự cố.

**❌ Bad example:**
```javascript
const data = await fetch(externalApiUrl); // không timeout, không retry, không circuit breaker
// nếu externalApi bị treo, request hiện tại (và cả thread pool) có thể bị giữ vô thời hạn
```

**✅ Good example:**
```javascript
const data = await fetchWithResilience(externalApiUrl, {
  timeoutMs: 3000,
  retry: { attempts: 3, backoff: "exponential", jitter: true },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000 },
  fallback: () => cachedResponse,
});
```

**Khi nào áp dụng:** Mọi lời gọi tới service/API bên ngoài hoặc giữa các microservice trong hệ thống phân tán.

**Cách phát hiện trong source code:** Lời gọi HTTP/RPC không cấu hình timeout tường minh (dùng mặc định vô hạn của thư viện); không có cơ chế retry/circuit breaker khi gọi dependency hay bị lỗi; log incident cho thấy sự cố ở một service kéo sập toàn hệ thống (cascading failure).

**Cách khắc phục:** Thêm timeout hợp lý cho mọi lời gọi ra ngoài, retry với backoff + jitter, circuit breaker (Resilience4j/Polly/opossum tuỳ ngôn ngữ), thiết kế fallback response khi dependency không khả dụng.

**Nguồn:** "Circuit Breaker Pattern Explained: Timeouts, Retries and Fallbacks" (YouTube); kênh Continuous Delivery (Dave Farley) về thiết kế hệ thống phân tán bền vững.

---

### ARCH-005 — Idempotency cho các operation có thể bị retry

**Category:** Architecture · **Mức độ nghiêm trọng:** 🔴 Critical

**Nguyên tắc (Principle):**
Trong hệ thống phân tán, một request có thể bị gửi lặp lại (do timeout, retry tự động của client). Các operation làm thay đổi trạng thái — đặc biệt liên quan tới tiền bạc — cần đảm bảo tính idempotent: gọi nhiều lần cho cùng một kết quả như gọi một lần.

**❌ Bad example:**
```javascript
app.post("/payments", async (req, res) => {
  await chargeCard(req.body.amount); // client timeout & tự động retry -> bị charge 2 lần
  res.json({ status: "ok" });
});
```

**✅ Good example:**
```javascript
app.post("/payments", async (req, res) => {
  const key = req.headers["idempotency-key"];
  const existing = await paymentRepo.findByIdempotencyKey(key);
  if (existing) return res.json(existing); // trả lại kết quả cũ, không charge lại
  const payment = await chargeCard(req.body.amount, key);
  res.json(payment);
});
```

**Khi nào áp dụng:** API xử lý thanh toán, tạo đơn hàng, gửi thông báo, hoặc bất kỳ operation nào client có khả năng gọi lại.

**Cách phát hiện trong source code:** Endpoint `POST` tạo side-effect (charge, gửi email, tạo bản ghi) không nhận/kiểm tra idempotency key; thiếu unique constraint ở DB để chống tạo bản ghi trùng khi request bị lặp lại.

**Cách khắc phục:** Yêu cầu client gửi header `Idempotency-Key`, lưu và kiểm tra key này trước khi thực hiện side-effect, dùng unique constraint ở DB làm lớp bảo vệ cuối cùng.

**Nguồn:** Thực hành thiết kế API tiêu chuẩn trong hệ thống phân tán, nhất quán với nguồn resilience/circuit breaker đã dẫn ở ARCH-004.

---

### ARCH-006 — Tránh God Object/God Class ở cấp kiến trúc

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Một class/module "biết và làm mọi thứ" (ví dụ một class xử lý cả auth, order, notification, report...) trở thành điểm nghẽn mỗi khi cần thay đổi và là rủi ro lớn khi refactor — vi phạm SRP (SOLID-001) ở quy mô toàn hệ thống.

**❌ Bad example:**
```typescript
class SystemManager {
  login() {} logout() {} createOrder() {} calculateShipping() {}
  sendNotification() {} generateReport() {} manageInventory() {}
  // ... 50+ method bao trùm toàn bộ nghiệp vụ hệ thống
}
```

**✅ Good example:**
```typescript
class AuthService { login() {} logout() {} }
class OrderService { createOrder() {} calculateShipping() {} }
class NotificationService { sendNotification() {} }
class ReportService { generateReport() {} }
// mỗi service sở hữu một bounded context rõ ràng (theo Domain-Driven Design)
```

**Khi nào áp dụng:** Khi một module/class phát triển vượt quá phạm vi của một domain nghiệp vụ rõ ràng.

**Cách phát hiện trong source code:** Số dòng code/số method của một class vượt trội bất thường so với phần còn lại của codebase; class được import bởi gần như mọi module khác (fan-in cao bất thường); tên class chung chung kiểu `Manager`/`Handler`/`Util` chứa hàng trăm dòng logic không liên quan tới nhau.

**Cách khắc phục:** Tách theo bounded context/domain (Domain-Driven Design), áp dụng SRP ở cấp module, dùng Facade nếu cần giữ một điểm vào duy nhất nhưng uỷ quyền xử lý cho các module con chuyên biệt.

**Nguồn:** Liên hệ trực tiếp SOLID-001 ở cấp kiến trúc; CodeOpinion; Robert C. Martin – "Clean Architecture".

---

### ARCH-007 — Service nên stateless để hỗ trợ mở rộng theo chiều ngang

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟡🟠 Medium–High

**Nguyên tắc (Principle):**
Lưu trạng thái phiên (session) trong bộ nhớ in-memory của một instance server cụ thể khiến không thể scale ngang tự do — nếu load balancer định tuyến request tới một instance khác, trạng thái sẽ bị mất.

**❌ Bad example:**
```javascript
const sessions = {}; // lưu session trong biến in-memory của process hiện tại
app.post("/login", (req, res) => {
  sessions[userId] = { loggedIn: true }; // chỉ instance này biết session tồn tại
});
```

**✅ Good example:**
```javascript
// Lưu session trong store dùng chung (Redis) hoặc dùng token tự chứa thông tin (JWT)
await redisClient.set(`session:${userId}`, JSON.stringify({ loggedIn: true }), "EX", 3600);
```

**Khi nào áp dụng:** Thiết kế service chạy nhiều instance phía sau load balancer, đặc biệt trong môi trường container/Kubernetes có auto-scaling.

**Cách phát hiện trong source code:** Biến toàn cục/in-memory lưu trạng thái người dùng giữa các request trong service có nhiều instance; sự cố "mất đăng nhập ngẫu nhiên" khi scale thêm instance (dấu hiệu đang phải dùng sticky session để che giấu vấn đề).

**Cách khắc phục:** Chuyển session sang store dùng chung (Redis/DB), hoặc dùng token tự chứa thông tin (stateless JWT) kèm cơ chế thu hồi (revocation) phù hợp.

**Nguồn:** Thực hành thiết kế hệ thống phân tán phổ biến, nhất quán với nội dung kênh CodeOpinion về kiến trúc microservices.

---

### ARCH-008 — Tránh circular dependency giữa các module

**Category:** Architecture · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Module A phụ thuộc B, B lại phụ thuộc ngược lại A tạo ra vòng lặp phụ thuộc — gây khó hiểu, khó test độc lập, có thể gây lỗi thứ tự khởi tạo (initialization order), và làm tăng bundle size không cần thiết ở phía frontend.

**❌ Bad example:**
```typescript
// order.module.ts
import { getUserHistory } from "./user.module";
// user.module.ts
import { getOrderSummary } from "./order.module"; // vòng lặp phụ thuộc A ↔ B
```

**✅ Good example:**
```typescript
// shared/types.ts — module trung lập cả hai cùng phụ thuộc
export interface UserId { value: string; }
// order.module.ts và user.module.ts đều import từ shared/types.ts, không import lẫn nhau
```

**Khi nào áp dụng:** Khi thêm một import mới giữa 2 module đã có sẵn quan hệ phụ thuộc theo chiều ngược lại.

**Cách phát hiện trong source code:** Công cụ phát hiện circular dependency (`madge`, `dependency-cruiser` cho JS/TS; `ArchUnit` cho Java) chạy trong CI; cảnh báo từ bundler (webpack/rollup/esbuild) về circular import.

**Cách khắc phục:** Trích xuất phần dùng chung ra module trung lập, đảo hướng phụ thuộc bằng interface (áp dụng DIP — SOLID-005), hoặc gộp hai module quá gắn kết thành một nếu tách rời không còn ý nghĩa.

**Nguồn:** Thực hành kiến trúc phần mềm phổ biến, liên hệ trực tiếp DIP (SOLID-005).

---

### NHÓM H — REFACTORING (REF)
*Dựa trên catalog code smells & refactoring kinh điển của Martin Fowler ("Refactoring: Improving the Design of Existing Code"), bài nói "Workflows of Refactoring" (OOP2014, GOTO Conferences), và refactoring.guru — nền tảng tham chiếu đầy đủ catalog này.*

---

### REF-001 — Long Method → Extract Method

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Hàm quá dài, khó nắm trọn ý trong một lần đọc, nên được chia nhỏ thành các hàm con có tên rõ nghĩa. Đây là kỹ thuật refactor nền tảng nhất trong catalog của Fowler — hầu hết các code smell khác đều được xử lý bằng hoặc kết hợp với Extract Method.

**❌ Bad example:**
```typescript
function printInvoice(invoice) {
  console.log("=== INVOICE ===");
  let total = 0;
  for (const item of invoice.items) total += item.price * item.qty;
  console.log(`Total: ${total}`);
  console.log(`Customer: ${invoice.customer.name}`);
}
```

**✅ Good example:**
```typescript
function printInvoice(invoice) {
  printHeader();
  const total = calculateTotal(invoice.items);
  printTotal(total);
  printCustomer(invoice.customer);
}
```

**Khi nào áp dụng:** Hàm dài, thực hiện nhiều bước tuần tự có thể đặt tên riêng cho từng bước.

**Cách phát hiện trong source code:** Số dòng/hàm cao, độ phức tạp cyclomatic cao (SonarQube/ESLint `complexity`), cần cuộn màn hình để đọc hết một hàm.

**Cách khắc phục:** Chọn một đoạn code làm rõ một việc, trích xuất thành hàm mới có tên mô tả đúng "làm gì" (không phải "làm như thế nào"); lặp lại tới khi hàm gốc chỉ còn điều phối lời gọi.

**Nguồn:** Martin Fowler – "Workflows of Refactoring" (OOP2014, GOTO Conferences, youtube.com/watch?v=vqEg37e4Mkw); refactoring.guru – "Long Method"/"Extract Method".

---

### REF-002 — Large Class/God Class → Extract Class

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟡🟠 Medium–High

**Nguyên tắc (Principle):**
Một class đảm nhận quá nhiều field/method không liên quan tới nhau nên được tách thành nhiều class nhỏ hơn, mỗi class chỉ giữ một trách nhiệm — kỹ thuật refactor tương ứng trực tiếp với SOLID-001 (SRP).

**❌ Bad example:**
```typescript
class Invoice {
  calculateTotal() {}
  saveToDatabase() {}
  printToPdf() {}
  sendEmailReminder() {}
  // field/method của 4 mối quan tâm hoàn toàn khác nhau trong cùng 1 class
}
```

**✅ Good example:**
```typescript
class Invoice { calculateTotal() {} }
class InvoiceRepository { save(invoice: Invoice) {} }
class InvoicePrinter { printToPdf(invoice: Invoice) {} }
class InvoiceReminderService { sendEmailReminder(invoice: Invoice) {} }
```

**Khi nào áp dụng:** Class có số lượng field/method lớn bất thường so với phần còn lại hệ thống, hoặc field chia thành các nhóm rõ rệt chỉ dùng chung một phần method với nhau.

**Cách phát hiện trong source code:** Chỉ số LCOM (Lack of Cohesion of Methods) cao; số dòng/class hoặc số method/class vượt ngưỡng cảnh báo (rule "Large Class" của SonarQube/PMD).

**Cách khắc phục:** Nhóm các field/method liên quan lại với nhau, tạo class mới cho mỗi nhóm, dùng composition để class gốc uỷ quyền xử lý cho các class mới.

**Nguồn:** refactoring.guru – "Large Class"; liên hệ trực tiếp SOLID-001 và ARCH-006.

---

### REF-003 — Duplicate Code → Extract Method/Pull Up Method

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Đoạn code giống hệt hoặc gần giống xuất hiện ở nhiều nơi nên được gộp về một chỗ duy nhất để tránh phải nhớ sửa nhiều bản sao mỗi khi logic thay đổi (xem thêm CC-006).

**❌ Bad example:**
```typescript
class Cat { makeSound() { return this.age > 10 ? "meow (già)" : "meow"; } }
class Dog { makeSound() { return this.age > 10 ? "woof (già)" : "woof"; } } // logic "già" bị lặp
```

**✅ Good example:**
```typescript
abstract class Animal {
  protected addAgeModifier(sound: string): string {
    return this.age > 10 ? `${sound} (già)` : sound; // Pull Up Method lên lớp cha
  }
}
class Cat extends Animal { makeSound() { return this.addAgeModifier("meow"); } }
class Dog extends Animal { makeSound() { return this.addAgeModifier("woof"); } }
```

**Khi nào áp dụng:** Khi phát hiện từ 2 đoạn code trở lên có logic giống nhau (có thể chỉ khác tên biến).

**Cách phát hiện trong source code:** Công cụ phát hiện trùng lặp (`jscpd`, PMD CPD, SonarQube duplication block) chạy trong CI.

**Cách khắc phục:** Extract Method cho trùng lặp trong cùng một class; Pull Up Method lên lớp cha nếu trùng lặp giữa các subclass có chung tổ tiên; Extract Class/Module dùng chung nếu trùng lặp giữa các class không có quan hệ kế thừa.

**Nguồn:** refactoring.guru – "Duplicate Code".

---

### REF-004 — Long Parameter List → Introduce Parameter Object

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟢🟡 Low–Medium

**Nguyên tắc (Principle):**
Kỹ thuật refactor tương ứng với CC-004: khi một hàm có nhiều tham số, đặc biệt khi một nhóm tham số hay xuất hiện cùng nhau ở nhiều chữ ký hàm khác nhau (Data Clumps), nên gom chúng thành một object.

**❌ Bad example:**
```typescript
function createShipment(street, city, zipCode, country, weightKg, isFragile) {}
function validateAddress(street, city, zipCode, country) {} // cùng 1 nhóm 4 tham số lặp lại
```

**✅ Good example:**
```typescript
interface Address { street: string; city: string; zipCode: string; country: string; }
function createShipment(address: Address, weightKg: number, isFragile: boolean) {}
function validateAddress(address: Address) {}
```

**Khi nào áp dụng:** Hàm có nhiều hơn 3–4 tham số, hoặc cùng một nhóm tham số lặp lại ở chữ ký của nhiều hàm khác nhau.

**Cách phát hiện trong source code:** ESLint rule `max-params`; grep cùng một nhóm 3+ tham số (ví dụ `street, city, zipCode`) lặp lại chữ ký ở nhiều hàm.

**Cách khắc phục:** Introduce Parameter Object — tạo class/interface gom nhóm tham số liên quan, truyền một object thay vì nhiều tham số rời rạc.

**Nguồn:** refactoring.guru – "Long Parameter List"/"Data Clumps"; liên hệ CC-004.

---

### REF-005 — Feature Envy → Move Method

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟢🟡 Low–Medium

**Nguyên tắc (Principle):**
Khi một method của class A dùng dữ liệu/method của class B nhiều hơn dữ liệu của chính class A, method đó "ghen tị" với B (Feature Envy) và nên được chuyển sang class B — dấu hiệu cho thấy trách nhiệm đang bị đặt sai chỗ.

**❌ Bad example:**
```typescript
class OrderPrinter {
  printCustomerAddress(customer: Customer) {
    // toàn bộ logic bên dưới chỉ dùng dữ liệu của Customer, không dùng gì của OrderPrinter
    console.log(`${customer.street}, ${customer.city}, ${customer.zipCode}`);
  }
}
```

**✅ Good example:**
```typescript
class Customer {
  formatAddress(): string { return `${this.street}, ${this.city}, ${this.zipCode}`; }
}
class OrderPrinter {
  printCustomerAddress(customer: Customer) { console.log(customer.formatAddress()); }
}
```

**Khi nào áp dụng:** Khi một method truy cập field/method của một class khác nhiều hơn field của chính class chứa nó.

**Cách phát hiện trong source code:** Đếm số lần method truy cập field của `this` so với field của object tham số khác truyền vào — tỉ lệ nghiêng hẳn về object khác là dấu hiệu Feature Envy.

**Cách khắc phục:** Move Method sang class thực sự sở hữu dữ liệu; nếu chỉ một phần method liên quan tới dữ liệu ngoài, Extract Method phần đó trước rồi mới Move.

**Nguồn:** refactoring.guru – "Feature Envy".

---

### REF-006 — Conditional phức tạp theo "type" → Replace Conditional with Polymorphism

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟡 Medium

**Nguyên tắc (Principle):**
Kỹ thuật refactor tương ứng trực tiếp với SOLID-002 (OCP): chuỗi `switch`/`if-else` rẽ nhánh theo một trường "loại" lặp lại ở nhiều nơi trong codebase nên được thay bằng đa hình để thêm loại mới không cần sửa code cũ.

**❌ Bad example:**
```typescript
function calculateArea(shape) {
  if (shape.type === "circle") return Math.PI * shape.radius ** 2;
  if (shape.type === "square") return shape.side ** 2;
}
function calculatePerimeter(shape) {
  if (shape.type === "circle") return 2 * Math.PI * shape.radius; // cùng logic switch lặp lại lần 2
  if (shape.type === "square") return 4 * shape.side;
}
```

**✅ Good example:**
```typescript
interface Shape { area(): number; perimeter(): number; }
class Circle implements Shape {
  constructor(private radius: number) {}
  area() { return Math.PI * this.radius ** 2; }
  perimeter() { return 2 * Math.PI * this.radius; }
}
class Square implements Shape {
  constructor(private side: number) {}
  area() { return this.side ** 2; }
  perimeter() { return 4 * this.side; }
}
```

**Khi nào áp dụng:** Khi cùng một logic `switch`/`if-else` theo field `type` xuất hiện lặp lại ở từ 2 nơi trở lên trong codebase.

**Cách phát hiện trong source code:** Grep chuỗi `switch`/`if-else` dài dựa trên cùng một field enum/string xuất hiện ở nhiều file khác nhau.

**Cách khắc phục:** Định nghĩa interface chung, mỗi "loại" implement class riêng chứa hành vi tương ứng, thay lời gọi `switch` bằng lời gọi đa hình qua interface.

**Nguồn:** refactoring.guru – "Switch Statements"; liên hệ trực tiếp SOLID-002 (OCP).

---

### REF-007 — Shotgun Surgery → Gom trách nhiệm về một nơi

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟠 High

**Nguyên tắc (Principle):**
Khi một thay đổi nghiệp vụ nhỏ buộc phải sửa nhiều class/file rải rác khắp codebase, đó là dấu hiệu trách nhiệm liên quan đang bị phân mảnh sai chỗ — rủi ro cao vì rất dễ sót một chỗ cần sửa.

**❌ Bad example:**
```text
Thêm 1 loại phí vận chuyển mới đòi hỏi sửa 4 file khác nhau:
OrderController, PricingUtil, InvoiceFormatter, ReportExporter
— mỗi file đều chứa một phần logic tính phí vận chuyển.
```

**✅ Good example:**
```typescript
// Gom toàn bộ logic tính phí vận chuyển vào 1 nơi duy nhất
class ShippingFeeCalculator {
  calculate(order: Order): number { /* toàn bộ quy tắc tính phí ở đây */ }
}
// OrderController, InvoiceFormatter, ReportExporter đều chỉ gọi ShippingFeeCalculator.calculate()
```

**Khi nào áp dụng:** Khi quan sát thấy một loại thay đổi nghiệp vụ liên tục đòi hỏi sửa nhiều file không trực tiếp liên quan tới nhau.

**Cách phát hiện trong source code:** Xem lịch sử git — tìm các commit cùng một mục đích nhưng động chạm nhiều file rải rác, lặp lại nhiều lần; tự đặt câu hỏi "nếu quy tắc X đổi, cần sửa bao nhiêu file?" khi review thiết kế.

**Cách khắc phục:** Move Method/Move Field để gom logic liên quan về một nơi; cân nhắc Inline Class nếu một class chỉ còn là lớp vỏ uỷ quyền không cần thiết sau khi gom.

**Nguồn:** refactoring.guru – "Shotgun Surgery"; liên hệ ARCH-003 (coupling giữa module/service).

---

### REF-008 — Speculative Generality → Đơn giản hoá (YAGNI)

**Category:** Refactoring · **Mức độ nghiêm trọng:** 🟢🟡 Low–Medium

**Nguyên tắc (Principle):**
Thiết kế "phòng xa" cho những khả năng mở rộng chưa từng xảy ra (interface/abstract class/tham số cấu hình chỉ có đúng một cách dùng) làm code phức tạp không cần thiết mà không mang lại giá trị thực tế — vi phạm nguyên tắc YAGNI (You Aren't Gonna Need It) của Extreme Programming.

**❌ Bad example:**
```typescript
abstract class AbstractNotificationStrategyFactoryBase<T> {
  abstract create(): T;
}
// toàn bộ codebase chỉ có DUY NHẤT 1 implementation: EmailNotification,
// không có kế hoạch cụ thể nào để thêm loại thứ 2
```

**✅ Good example:**
```typescript
class EmailNotification {
  send(to: string, message: string) { /* ... */ }
}
// Chỉ thêm lớp trừu tượng (interface Notification) khi THỰC SỰ có yêu cầu
// cho loại thông báo thứ 2 (SMS, Push...), không phải trước đó.
```

**Khi nào áp dụng:** Khi review một class/interface trừu tượng chỉ có đúng một cách dùng và không có kế hoạch cụ thể mở rộng trong tương lai gần.

**Cách phát hiện trong source code:** Interface/abstract class chỉ có duy nhất 1 implementation trong toàn bộ codebase; tham số cấu hình/generic type không bao giờ được truyền giá trị khác giá trị mặc định.

**Cách khắc phục:** Collapse Hierarchy/Inline Class để loại bỏ tầng trừu tượng thừa; chỉ giữ lại lớp trừu tượng khi có từ 2 cách dùng thực tế trở lên hoặc yêu cầu rõ ràng đã được xác nhận.

**Nguồn:** refactoring.guru – "Speculative Generality"; nguyên tắc YAGNI (Extreme Programming).

---

## 7. Nguồn tham khảo đầy đủ

Tất cả các nguồn dưới đây đã được xác minh tồn tại thực tế qua tìm kiếm web tại thời điểm biên soạn (09/2026) trước khi dùng làm căn cứ xây dựng rule. Đây không phải một tập hợp video được liệt kê ngẫu nhiên — mỗi nguồn tương ứng với ít nhất một rule cụ thể ở Mục 6.

### Video & kênh YouTube

| Nguồn | Kênh/Tác giả | Áp dụng cho |
|---|---|---|
| [Why You Shouldn't Nest Your Code](https://www.youtube.com/watch?v=CFRhGnuXG-4) | CodeAesthetic (417K sub) | CC-003 |
| [Premature Optimization](https://www.youtube.com/watch?v=tKbV6BpH-C8) | CodeAesthetic | PERF-003 |
| Uncle Bob's SOLID Principles Made Easy – In Python! | ArjanCodes (Arjan Egges) | SOLID-001…005 |
| Learn SOLID Principles with CLEAN CODE Examples | Amigoscode | SOLID-002 |
| Seven Ineffective Coding Habits of Many Programmers (DevWeek 2014 / GOTO / ITT 2016) | Kevlin Henney | CC-001, CC-004, CC-005 |
| [The Principles of Clean Architecture](https://www.youtube.com/watch?v=o_TH-Y78tt4) | Robert C. Martin (Uncle Bob) – GOTO Conferences | ARCH-001, ARCH-002, ARCH-006 |
| Clean Architecture and Design (ITkonekt 2019) | Robert C. Martin | ARCH-001, ARCH-002 |
| Clean Code (video lecture series, 2011/2013) | Robert C. Martin / Clean Coders | CC-002, CC-008 |
| Kênh CodeOpinion (Derek Comartin) – Software Architecture & Design | Derek Comartin | ARCH-003, ARCH-006, ARCH-007 |
| Kênh Continuous Delivery – "Modern Software Engineering" (Dave Farley, Trisha Gee, Kevlin Henney, Kent Beck, Sam Newman, Steve Smith, Emily Bache, Daniel Terhorst-North) | Dave Farley et al. | CR-003, CR-004, CR-005, ARCH-004 |
| Code Review Best Practices / Code Review Matters and Manners | Trisha Gee | CR-004 |
| [Martin Fowler @ OOP2014 "Workflows of Refactoring"](https://www.youtube.com/watch?v=vqEg37e4Mkw) | Martin Fowler – GOTO Conferences | REF-001…008 |
| [Hacking Websites with SQL Injection](https://www.youtube.com/watch?v=_jKylhJtPmI) | Computerphile (Tom Scott) | OWASP-005 |
| [Running an SQL Injection Attack](https://www.youtube.com/watch?v=ciNHn38EyRc) | Computerphile (Dr Mike Pound) | OWASP-005, SEC-001 |
| OWASP DevSlop Show: Security Code Review 101 (với Paul Ionescu) | OWASP Foundation | SEC-001…007 |
| Kênh OWASP Foundation (ghi hình các hội nghị AppSec) | OWASP Foundation | Nhóm E, D |
| The N+1 Query Problem with Hibernate ORM | (YouTube) | PERF-001 |
| Database Indexes - You Might Be Using Them Wrong | (YouTube) | PERF-002 |
| Stop Adding Indexes. Do This Instead | (YouTube) | PERF-002 |
| Circuit Breaker Pattern Explained: Timeouts, Retries and Fallbacks | (YouTube) | ARCH-004 |

### Tài liệu kỹ thuật chính thống (dùng để xác minh & chuẩn hoá số liệu/thuật ngữ)

| Nguồn | Tổ chức | Áp dụng cho |
|---|---|---|
| [OWASP Top 10:2025](https://owasp.org/Top10/2025/) | OWASP Foundation | Toàn bộ Nhóm E |
| [OWASP Secure Coding Practices – Quick Reference Guide](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/) | OWASP Foundation | Nhóm D |
| [OWASP Secure Code Review Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html) | OWASP Cheat Sheet Series | CR-005 |
| [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/) | OWASP Foundation | CR-005 |
| [Google Engineering Practices – Code Review](https://google.github.io/eng-practices/) | Google | Toàn bộ Nhóm A |
| Best Practices for Peer Code Review (nghiên cứu tại Cisco Systems, ~2.500 review / 3,2 triệu LOC) | SmartBear | CR-001, CR-005 |
| [refactoring.guru – Catalog of Refactoring & Code Smells](https://refactoring.guru/refactoring/catalog) | dựa trên "Refactoring" của Martin Fowler | Toàn bộ Nhóm H |
| Clean Code; Clean Architecture | Robert C. Martin (sách) | Nhóm B, C, G |

> **Lưu ý về phiên bản OWASP:** OWASP Top 10 được cập nhật theo chu kỳ ~4 năm. Bản 2025 được công bố dạng "final" tại OWASP Global AppSec (Washington D.C., 11/2025) và chốt văn bản chính thức vào 01/2026, thay thế hoàn toàn bản 2021. Tài liệu này dùng bản 2025 vì đó là phiên bản mới nhất tại thời điểm biên soạn — nếu OWASP phát hành bản cập nhật mới hơn sau thời điểm này, cần đối chiếu lại `owasp.org/Top10/` trước khi dùng làm căn cứ.

---

## 8. Cách dùng bộ tri thức này cho AI Code Review Agent

Bộ rule này được thiết kế để một AI agent (hoặc con người) áp dụng theo quy trình sau khi review một đoạn diff/pull request:

1. **Xác định ngữ cảnh thay đổi**: file nào, ngôn ngữ gì, chạm vào tầng nào (controller/service/repository/DB schema/CI config...).
2. **Lọc rule liên quan theo ngữ cảnh** thay vì chạy toàn bộ 61 rule một cách máy móc — ví dụ: thay đổi ở file auth/payment nên ưu tiên quét kỹ Nhóm D (SEC) và Nhóm E (OWASP); thay đổi thêm class/interface nên quét Nhóm C (SOLID); PR tự nó (kích thước, mô tả, có test hay không) luôn quét theo Nhóm A (CR).
3. **Áp dụng phần "Cách phát hiện trong source code"** của từng rule liên quan như một heuristic/pattern để quét diff — có thể kết hợp với công cụ tĩnh thật (ESLint, SonarQube, Semgrep, gitleaks...) đã nêu trong từng rule để tăng độ chính xác, giảm false positive so với chỉ dựa vào suy luận ngôn ngữ tự nhiên.
4. **Báo cáo theo cấu trúc**: `Rule ID` vi phạm → trích đoạn code liên quan → **Mức độ nghiêm trọng** → **Cách khắc phục** cụ thể (không chỉ nói "sai" mà chỉ rõ kỹ thuật sửa, tham chiếu ví dụ Good example tương ứng).
5. **Ưu tiên xử lý theo mức độ nghiêm trọng**: 🔴 Critical (đặc biệt toàn bộ Nhóm D/E liên quan bảo mật) nên chặn merge; 🟠 High nên yêu cầu sửa trước khi merge trừ khi có lý do chính đáng; 🟡 Medium/🟢 Low có thể ghi nhận thành ticket theo dõi mà không nhất thiết chặn merge.
6. **Không suy diễn thêm nguyên tắc ngoài phạm vi đã liệt kê** — nếu gặp vấn đề không khớp rule nào ở đây, nên gắn nhãn "cần rà soát thủ công" thay vì tự bịa ra một mức độ nghiêm trọng hoặc cách khắc phục không có căn cứ.

---

*Tài liệu này tổng hợp kiến thức từ các nguồn công khai đã liệt kê ở Mục 7, được diễn giải và minh hoạ lại bằng ví dụ code gốc — không sao chép nguyên văn transcript hay mã nguồn từ bất kỳ video/tài liệu nào. Khi một chi tiết kỹ thuật có thể thay đổi theo thời gian (đặc biệt danh mục OWASP Top 10), nên đối chiếu lại nguồn chính thức trước khi áp dụng cho hệ thống production.*
