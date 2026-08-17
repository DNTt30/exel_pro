import { describe, it, expect } from 'vitest';
import { employeeSchema, feedbackSchema, shiftSwapSchema } from '../schemas/validationSchemas';

describe('Zod Validation Schemas (SEC-07)', () => {
  describe('employeeSchema', () => {
    it('should validate valid 9-digit employee', () => {
      const validEmp = {
        id: '260512008',
        name: 'Nguyễn Văn A',
        dept: 'VN0485',
        type: 'STPT',
        maxH: 23
      };
      const result = employeeSchema.safeParse(validEmp);
      expect(result.success).toBe(true);
    });

    it('should reject invalid employee ID (less or more than 9 digits)', () => {
      const invalidEmp = {
        id: '12345',
        name: 'Nguyễn Văn B',
        dept: 'VN0485'
      };
      const result = employeeSchema.safeParse(invalidEmp);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('9 chữ số');
    });
  });

  describe('feedbackSchema', () => {
    it('should validate valid feedback payload', () => {
      const validFb = {
        empId: '260512008',
        dept: 'VN0485',
        date: '2026-08-17',
        issue: 'Quên chấm công',
        note: 'Đã bổ sung minh chứng',
        status: 'pending'
      };
      const result = feedbackSchema.safeParse(validFb);
      expect(result.success).toBe(true);
    });

    it('should reject feedback without issue content', () => {
      const invalidFb = {
        empId: '260512008',
        dept: 'VN0485',
        date: '2026-08-17',
        issue: 'a' // less than 3 chars
      };
      const result = feedbackSchema.safeParse(invalidFb);
      expect(result.success).toBe(false);
    });
  });

  describe('shiftSwapSchema', () => {
    it('should validate valid shift swap request', () => {
      const validSwap = {
        week: '2026-08-17',
        store: 'VN0485',
        fromEmpId: '260512008',
        fromDay: 'T2',
        fromShift: '6-14',
        toEmpId: '260716009',
        toDay: 'T3',
        toShift: '14-22',
        status: 'pending_partner'
      };
      const result = shiftSwapSchema.safeParse(validSwap);
      expect(result.success).toBe(true);
    });

    it('should reject invalid weekday', () => {
      const invalidSwap = {
        week: '2026-08-17',
        store: 'VN0485',
        fromEmpId: '260512008',
        fromDay: 'ThuHai', // invalid weekday
        fromShift: '6-14',
        toEmpId: '260716009',
        toDay: 'T3',
        toShift: '14-22'
      };
      const result = shiftSwapSchema.safeParse(invalidSwap);
      expect(result.success).toBe(false);
    });
  });
});
