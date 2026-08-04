import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Khởi tạo Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Khởi tạo Gemini client bằng thư viện @google/generative-ai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    // 1. Truy vấn dữ liệu các thành viên từ Supabase
    const { data: members, error } = await supabase
      .from('members')
      .select('id, full_name, gender, birth_date, death_date, biography')
      .limit(100);

    if (error) {
      console.error('Supabase Query Error:', error);
      throw new Error('Không thể lấy dữ liệu từ cơ sở dữ liệu.');
    }

    // 2. Định dạng dữ liệu thành văn bản ngữ cảnh
    const contextData = members && members.length > 0
      ? members.map((m: any) => 
          `- Họ tên: ${m.full_name || 'Không rõ'}, Giới tính: ${m.gender || 'Không rõ'}, Ngày sinh: ${m.birth_date || 'Không rõ'}, Ngày mất: ${m.death_date || 'Không rõ'}, Tiểu sử/Ghi chú: ${m.biography || 'Không có'}`
        ).join('\n')
      : 'Hiện tại chưa có dữ liệu thành viên nào trong gia phả.';

    // 3. Xây dựng System Prompt với nguyên tắc ưu tiên tính chính xác
    const prompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}

CÂU HỎI CỦA NGƯỜI DÙNG: 
${message}`;

    // 4. Gọi Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });
    
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { reply: 'Xin lỗi, hệ thống đang gặp sự cố khi kết nối dữ liệu. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
