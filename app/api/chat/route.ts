import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: 'Lỗi máy chủ: Chưa nhận được biến môi trường GEMINI_API_KEY trên Vercel.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // FIX LỖI 429 QUOTA: Gắn cứng model 1.5-flash, bỏ quét tự động để tiết kiệm request và tránh model bị khóa limit 0
    const selectedModel = 'gemini-1.5-flash';

    const prompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData || 'Không có dữ liệu.'}

CÂU HỎI CỦA NGƯỜI DÙNG: 
${message}`;

    const model = genAI.getGenerativeModel({ model: selectedModel });
    const result = await model.generateContent(prompt);

    return NextResponse.json({ reply: result.response.text() });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Chi tiết lỗi API: ${error.message}` }, { status: 500 });
  }
}
