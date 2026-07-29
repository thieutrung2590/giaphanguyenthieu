import crypto from 'crypto';

// Hàm tạo link xem ảnh hết hạn sau một khoảng thời gian (mặc định 15 phút)
export function generateSignedUrl(url: string, expiresInMinutes = 15) {
  // 1. Tính toán thời điểm hết hạn (tính bằng mili-giây)
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  
  // 2. Sử dụng BLOB_READ_WRITE_TOKEN làm chìa khóa bí mật để ký
  const secret = process.env.BLOB_READ_WRITE_TOKEN || 'default-secret-key';
  
  // 3. Tạo chữ ký mã hóa (HMAC SHA-256) từ URL và thời gian hết hạn
  const dataToSign = `${url}:${expires}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');

  // 4. Trả về đường link trỏ tới API của chúng ta kèm theo các thông số bảo mật
  return `/api/secure-photo?url=${encodeURIComponent(url)}&expires=${expires}&signature=${signature}`;
}
