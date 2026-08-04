import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // Yêu cầu khóa API của Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: 'Lỗi máy chủ: Chưa nhận được biến môi trường GROQ_API_KEY trên Vercel.' }, { status: 500 });
    }

    // Xây dựng System Prompt với dữ liệu gia phả
    const systemPrompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData || 'Không có dữ liệu.'}`;

    // Gọi API của Groq (Tương thích chuẩn định dạng OpenAI)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Đã cập nhật sang mô hình mới nhất được Groq hỗ trợ
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3, // Giữ ở mức thấp để AI trả lời chính xác, không bịa đặt
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Lỗi kết nối đến Groq API');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    let errorMessage = error.message || 'Lỗi không xác định';
    
    // Xử lý báo lỗi bằng tiếng Việt cho dễ hiểu
    if (errorMessage.includes('Rate limit')) {
        errorMessage = 'Hệ thống Groq đang nhận quá nhiều yêu cầu, vui lòng thử lại sau vài giây.';
    } else if (errorMessage.includes('Invalid API Key')) {
        errorMessage = 'Khóa API Groq không hợp lệ. Vui lòng kiểm tra lại cấu hình trên Vercel.';
    } else if (errorMessage.includes('decommissioned')) {
        errorMessage = 'Mô hình AI này đã bị Groq ngừng hỗ trợ, cần cập nhật mã nguồn sang mô hình mới.';
    }

    return NextResponse.json({ reply: `Hệ thống AI gián đoạn: ${errorMessage}` }, { status: 500 });
  }
}
