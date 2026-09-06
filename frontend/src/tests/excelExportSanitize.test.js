import { describe, it, expect } from 'vitest';
import { sanitizeExcelCell } from '../utils/excelExport';

describe('excelExport Security: sanitizeExcelCell (CWE-1236 & XSS)', () => {
  it('neutralizes dangerous formula injection prefixes (=, +, -, @)', () => {
    expect(sanitizeExcelCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeExcelCell('+12345')).toBe("'+12345");
    expect(sanitizeExcelCell('-5000')).toBe("'-5000");
    expect(sanitizeExcelCell('@HYPERLINK("http://evil.com")')).toBe("'@HYPERLINK(&quot;http://evil.com&quot;)");
    expect(sanitizeExcelCell('=CMD|\' /C calc\'!A0')).toBe("'=CMD|&#39; /C calc&#39;!A0");
  });

  it('neutralizes tab and carriage return injection prefixes', () => {
    expect(sanitizeExcelCell('\t=cmd')).toBe("'\t=cmd");
    expect(sanitizeExcelCell('\r=calc')).toBe("'\r=calc");
  });

  it('escapes HTML tags to prevent XSS in web view of xls files', () => {
    expect(sanitizeExcelCell('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sanitizeExcelCell('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(sanitizeExcelCell('Test & "Quotes" & \'Single\'')).toBe('Test &amp; &quot;Quotes&quot; &amp; &#39;Single&#39;');
  });

  it('handles safe regular strings, numbers, and null/undefined values properly', () => {
    expect(sanitizeExcelCell(null)).toBe('');
    expect(sanitizeExcelCell(undefined)).toBe('');
    expect(sanitizeExcelCell('')).toBe('');
    expect(sanitizeExcelCell('Nguyen Van A')).toBe('Nguyen Van A');
    expect(sanitizeExcelCell('6-14')).toBe('6-14');
    expect(sanitizeExcelCell(8)).toBe('8');
    expect(sanitizeExcelCell(7.84)).toBe('7.84');
  });
});
