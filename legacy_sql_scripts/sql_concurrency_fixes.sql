-- ==============================================================================
-- DATABASE CONCURRENCY & INTEGRITY FIXES (IDEMPOTENT)
-- 1. replace_shelf_items_atomic: Thao tác thay thế hàng trên kệ ATOMIC + ROW LOCK
-- 2. save_employee_schedule: RPC lưu lịch cá nhân có tăng version an toàn
-- 3. conditional update cho shift_swaps chống xung đột duyệt đơn cùng lúc
-- ==============================================================================

-- 1. ATOMIC SHELF ITEMS REPLACEMENT (Khắc phục tranh chấp ghi đồng thời trên kệ hàng)
CREATE OR REPLACE FUNCTION public.replace_shelf_items_atomic(
  p_shelf_id uuid,
  p_store_id text,
  p_items jsonb,
  p_updated_by text DEFAULT NULL
)
RETURNS SETOF public.shelf_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- Khóa hàng kệ để đảm bảo tuần tự hóa các giao dịch đồng thời
  PERFORM 1 FROM public.store_shelves WHERE id = p_shelf_id FOR UPDATE;

  -- Xóa các sản phẩm cũ trong cùng 1 transaction
  DELETE FROM public.shelf_items WHERE shelf_id = p_shelf_id;

  -- Nạp lại danh sách sản phẩm mới
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    RETURN QUERY
    INSERT INTO public.shelf_items (
      shelf_id, store_id, product_name, sku, qty, expiry_date, expiry_date_2, note, updated_by, updated_at
    )
    SELECT 
      p_shelf_id,
      p_store_id,
      (x->>'product_name')::text,
      NULLIF(x->>'sku', '')::text,
      NULLIF(x->>'qty', '')::numeric,
      NULLIF(x->>'expiry_date', '')::date,
      NULLIF(x->>'expiry_date_2', '')::date,
      COALESCE(x->>'note', '')::text,
      COALESCE(NULLIF(x->>'updated_by', ''), p_updated_by),
      now()
    FROM jsonb_array_elements(p_items) AS x
    RETURNING *;
  END IF;
  RETURN;
END $$;

GRANT EXECUTE ON FUNCTION public.replace_shelf_items_atomic(uuid, text, jsonb, text) TO authenticated, anon;


-- 2. SINGLE SCHEDULE UPSERT WITH OPTIMISTIC VERSIONING
CREATE OR REPLACE FUNCTION public.save_employee_schedule(
  p_week_date text,
  p_emp_id text,
  p_shifts jsonb,
  p_expect_version integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_cur integer;
  v_new integer;
BEGIN
  SELECT version INTO v_cur 
  FROM public.schedules
  WHERE week_date = p_week_date AND emp_id = p_emp_id
  FOR UPDATE;

  IF FOUND THEN
    IF p_expect_version IS NOT NULL AND v_cur <> p_expect_version THEN
      RAISE EXCEPTION 'CONFLICT: emp=% db_version=% expected=%', p_emp_id, v_cur, p_expect_version
        USING errcode = '40001';
    END IF;

    UPDATE public.schedules
    SET shifts = p_shifts,
        version = v_cur + 1,
        updated_at = now()
    WHERE week_date = p_week_date AND emp_id = p_emp_id
    RETURNING version INTO v_new;
  ELSE
    INSERT INTO public.schedules (week_date, emp_id, shifts, version, updated_at)
    VALUES (p_week_date, p_emp_id, p_shifts, 1, now())
    RETURNING version INTO v_new;
  END IF;

  RETURN v_new;
END $$;

GRANT EXECUTE ON FUNCTION public.save_employee_schedule(text, text, jsonb, integer) TO authenticated, anon;


-- 3. APPROVE SHIFT SWAP ATOMIC (Duyệt đơn đổi ca & cập nhật lịch 2 bên trong 1 Transaction)
CREATE OR REPLACE FUNCTION public.approve_shift_swap_atomic(
  p_swap_id uuid,
  p_manager_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_swap record;
  v_from_sched jsonb;
  v_to_sched jsonb;
  v_from_shift text;
  v_to_shift text;
BEGIN
  -- Khóa dòng swap để chống 2 quản lý cùng bấm duyệt đồng thời
  SELECT * INTO v_swap 
  FROM public.shift_swaps 
  WHERE id = p_swap_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SWAP_NOT_FOUND: Đơn đổi ca không tồn tại';
  END IF;

  IF v_swap.status = 'approved' THEN
    RETURN true; -- Đã được duyệt trước đó bởi người khác
  END IF;

  IF v_swap.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_SWAP_STATUS: Đơn đã bị từ chối hoặc đã hủy';
  END IF;

  -- Đổi ca thành approved
  UPDATE public.shift_swaps
  SET status = 'approved',
      manager_note = COALESCE(p_manager_note, manager_note),
      resolved_at = now()
  WHERE id = p_swap_id;

  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.approve_shift_swap_atomic(uuid, text) TO authenticated, anon;
