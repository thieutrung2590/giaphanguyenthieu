import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    // Bao phủ tất cả các trường hợp tên biến môi trường Supabase có thể có trong dự án
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const apiKey = process.env.GEMINI_API_KEY || '';

    // Kiểm tra và báo lỗi chính xác ra giao diện nếu vẫn không tìm thấy
    if (!supabaseUrl || !supabaseKey) {
      const envKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('supa'));
      throw new Error(`Không tìm thấy Key Supabase. Các biến hiện có trên Server: ${envKeys.join(', ') || 'Trống'}`);
    }

    if (!apiKey) {
      throw new Error("Chưa nhận diện được GEMINI_API_KEY.");
    }

    // Khởi tạo client
    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // Tự động tìm mô hình Gemini phù hợp
    let selectedModel = 'gemini-1.5-flash';
    try {
      const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        const availableModels = modelData.models || [];
        const validModels = availableModels.filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini')
        );

        if (validModels.length > 0) {
          const flashModel = validModels.find((m: any) => m.name.includes('flash'));
          const chosen = flashModel || validModels[0];
          selectedModel = chosen.name.replace('models/', '');
        }
      }
    } catch (fetchError) {
      console.error('Lỗi khi fetch models:', fetchError);
    }

    // Truy vấn dữ liệu từ bảng members
    const { data: members, error } = await supabase
      .from('members')
      .select('id, full_name, gender, birth_date, death_date, biography')
      .limit(100);

    if (error) {
      throw new Error(`Lỗi truy xuất cơ sở dữ liệu: ${error.message}`);
    }

    // Trích xuất ngữ cảnh
    const contextData = members && members.length > 0
      ? members.map((m: any) => 
          `- Họ tên: ${m.full_name || 'Không rõ'}, Giới tính: ${m.gender || 'Không rõ'}, Ngày sinh: ${m.birth_date || 'Không rõ'}, Ngày mất: ${m.death_date || 'Không rõ'}, Tiểu sử/Ghi chú: ${m.biography || 'Không có'}`
        ).join('\n')
      : 'Hiện tại chưa có dữ liệu thành viên nào trong gia phả.';

    // Thiết lập prompt
    const prompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}

CÂU HỎI CỦA NGƯỜI DÙNG: 
${message}`;

    // Gọi Gemini API
    const model = genAI.getGenerativeModel({ model: selectedModel });
    const result = await model.generateContent(prompt);

    return NextResponse.json({ reply: result.response.text() });
    
  } catch (error: any) {
    // Trả thẳng thông báo lỗi về trình duyệt để hiển thị trên khung chat
    return NextResponse.json(
      { reply: `Lỗi hệ thống: ${error.message || 'Không xác định'}` },
      { status: 500 }
    );
  }
}
