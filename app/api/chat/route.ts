import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // Backend bây giờ CHỈ cần quan tâm đến Gemini, không cần Supabase nữa
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: 'Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let selectedModel = 'gemini-1.5-flash';
    try {
      const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        const validModels = (modelData.models || []).filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini')
        );
        if (validModels.length > 0) {
          const flashModel = validModels.find((m: any) => m.name.includes('flash'));
          const chosen = flashModel || validModels[0];
          selectedModel = chosen.name.replace('models/', '');
        }
      }
    } catch (e) {
      console.error('Lỗi check model:', e);
    }

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
