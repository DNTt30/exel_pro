import { z } from 'zod';

export const BRAND_COLORS = [
  { value: '#4338ca', label: 'Chàm' },
  { value: '#1d4ed8', label: 'Xanh dương' },
  { value: '#047857', label: 'Xanh lá' },
  { value: '#be123c', label: 'Hồng đậm' },
  { value: '#92400e', label: 'Nâu hổ phách' },
];

export const DEFAULT_BRANDING = Object.freeze({
  appName: 'Lịch Ca', organizationName: '', primaryColor: '#4338ca',
  contactEmail: '', logoDataUrl: '', revision: 0,
});

const plainText = (max) => z.string().trim().max(max).refine(value => ![...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || '<>'.includes(char)), 'Nội dung có ký tự không hợp lệ.');
export const brandingSchema = z.object({
  appName: plainText(40).pipe(z.string().min(2, 'Tên ứng dụng cần ít nhất 2 ký tự.')),
  organizationName: plainText(100),
  primaryColor: z.enum(BRAND_COLORS.map(c => c.value)),
  contactEmail: z.union([z.literal(''), z.string().trim().max(254).email('Email liên hệ không hợp lệ.')]),
  logoDataUrl: z.string().max(180000).refine(value => !value || /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value), 'Logo phải là ảnh PNG hợp lệ.'),
}).strict();

export function canConfigureWorkspace(user) {
  return user?.id === 'admin' && user?.role === 'admin';
}

export function brandingDraft(branding) {
  const { appName, organizationName, primaryColor, contactEmail, logoDataUrl } = branding;
  return { appName, organizationName, primaryColor, contactEmail, logoDataUrl };
}

export function mapBranding(row) {
  if (!row || !Number.isInteger(row.revision) || row.revision < 1) throw new Error('Cấu hình đơn vị chưa sẵn sàng.');
  return { ...brandingSchema.parse({ appName: row.app_name, organizationName: row.organization_name,
    primaryColor: row.primary_color, contactEmail: row.contact_email, logoDataUrl: row.logo_data_url }), revision: row.revision };
}

// Decode and re-encode locally: no remote image URLs, SVG or embedded metadata.
export async function readBrandLogo(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file?.type) || file.size > 2 * 1024 * 1024) {
    throw new Error('Chọn ảnh PNG, JPG hoặc WebP không quá 2 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.width || !image.height || image.width > 8000 || image.height > 8000) throw new Error('Kích thước ảnh không hợp lệ.');
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 192;
    const scale = Math.min(192 / image.width, 192 / image.height);
    const width = image.width * scale, height = image.height * scale;
    canvas.getContext('2d').drawImage(image, (192 - width) / 2, (192 - height) / 2, width, height);
    const result = canvas.toDataURL('image/png');
    if (result.length > 180000) throw new Error('Ảnh quá phức tạp. Vui lòng chọn logo đơn giản hơn.');
    return result;
  } finally { URL.revokeObjectURL(url); }
}
