import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Thiếu tham số url', { status: 400 });
  }

  // Bảo mật SSRF: Chỉ cho phép proxy ảnh từ domain Vercel Blob
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com') && parsed.hostname !== 'blob.vercel-storage.com') {
      return new NextResponse('Chỉ cho phép tải ảnh từ kho lưu trữ hợp lệ', { status: 403 });
    }
  } catch {
    return new NextResponse('URL không hợp lệ', { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new NextResponse('Thiếu biến môi trường BLOB_READ_WRITE_TOKEN', { status: 500 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return new NextResponse('Không thể tải ảnh từ kho lưu trữ private', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache ảnh trên trình duyệt lâu dài vì URL ảnh có timestamp cố định
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Lỗi khi tải ảnh private Vercel Blob:', error);
    return new NextResponse('Lỗi máy chủ nội bộ khi xử lý ảnh', { status: 500 });
  }
}
