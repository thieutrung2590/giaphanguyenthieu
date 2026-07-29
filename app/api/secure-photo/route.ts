import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');
  const expires = searchParams.get('expires');
  const signature = searchParams.get('signature');

  if (!imageUrl || !expires || !signature) {
    return new NextResponse('Thiếu tham số bảo mật', { status: 400 });
  }

  // 1. KIỂM TRA HẾT HẠN
  // So sánh thời gian hiện tại với thời gian hết hạn trong URL
  if (Date.now() > parseInt(expires, 10)) {
    return new NextResponse('Đường link này đã hết hạn. Vui lòng tải lại trang.', { status: 403 });
  }

  // 2. KIỂM TRA CHỮ KÝ (Chống người dùng tự sửa URL hoặc sửa thời gian)
  const secret = process.env.BLOB_READ_WRITE_TOKEN || 'default-secret-key';
  const dataToSign = `${imageUrl}:${expires}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new NextResponse('Chữ ký không hợp lệ hoặc đã bị giả mạo', { status: 403 });
  }

  // 3. NẾU HỢP LỆ -> LẤY ẢNH TỪ VERCEL BLOB VÀ TRẢ VỀ
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!response.ok) {
      return new NextResponse('Không thể tải ảnh từ hệ thống lưu trữ', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        // Chỉ lưu cache tối đa 15 phút (bằng đúng thời gian sống của token)
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (error) {
    console.error('Lỗi API Proxy:', error);
    return new NextResponse('Lỗi máy chủ nội bộ', { status: 500 });
  }
}
