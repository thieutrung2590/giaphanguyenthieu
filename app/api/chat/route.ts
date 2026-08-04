import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // Khởi tạo biến môi trường BÊN TRONG hàm POST để tránh lỗi Build
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi máy chủ: Chưa nhận được biến môi trường Supabase.' }, { status: 500 });
    }
    if (!apiKey) {
      return NextResponse.json({ reply: 'Lỗi máy chủ: Chưa nhận được biến môi trường GEMINI_API_KEY.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    // Tự động tìm mô hình Gemini
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
          selectedModel = (flashModel || validModels[0]).name.replace('models/', '');
        }
      }
    } catch (e) {
      console.error('Lỗi check model:', e);
    }

    // Truy vấn Supabase trực tiếp trên Server
    const { data: members, error } = await supabase
      .from('members')
      .select('id, full_name, gender, birth_date, death_date, biography')
      .limit(100);

    if (error) {
      return NextResponse.json({ reply: `Lỗi lấy dữ liệu gia phả: ${error.message}` }, { status: 500 });
    }

    const contextData = members && members.length > 0
      ? members.map((m: any) => 
          `- Họ tên: ${m.full_name || 'Không rõ'}, Giới tính: ${m.gender || 'Không rõ'}, Ngày sinh: ${m.birth_date || 'Không rõ'}, Ngày mất: ${m.death_date || 'Không rõ'}, Tiểu sử/Ghi chú: ${m.biography || 'Không có'}`
        ).join('\n')
      : 'Hiện tại chưa có dữ liệu thành viên nào trong gia phả.';

    const prompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}

CÂU HỎI CỦA NGƯỜI DÙNG: 
${message}`;

    const model = genAI.getGenerativeModel({ model: selectedModel });
    const result = await model.generateContent(prompt);

    return NextResponse.json({ reply: result.response.text() });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Chi tiết lỗi API: ${error.message}` }, { status: 500 });
  }
}
