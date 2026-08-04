import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình GROQ_API_KEY trên Vercel.' }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình biến môi trường Supabase trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // BƯỚC 1: Lấy dữ liệu từ bảng persons
    // Dùng select('*') để lấy toàn bộ cột, tránh lỗi "Could not find column"
    const { data: persons, error: supabaseError } = await supabase
      .from('persons')
      .select('*')
      .limit(100);

    if (supabaseError) {
      return NextResponse.json({ reply: `Lỗi truy xuất CSDL: ${supabaseError.message}` }, { status: 500 });
    }

    if (!persons || persons.length === 0) {
      return NextResponse.json({ reply: 'Hệ thống thông báo: Đã kết nối thành công nhưng bảng "persons" hiện chưa có dữ liệu.' }, { status: 200 });
    }

    // BƯỚC 2: Tự động ánh xạ dữ liệu gia phả với các trường hợp tên cột có thể xảy ra
    const contextData = persons.map((p: any) => {
        const name = p.full_name || p.name || p.ho_ten || p.title || 'Không rõ';
        const gender = p.gender || p.gioi_tinh || 'Không rõ';
        const birth = p.birth_date || p.dob || p.ngay_sinh || 'Không rõ';
        const death = p.death_date || p.ngay_mat || 'Không rõ';
        const bio = p.biography || p.tieu_su || p.ghi_chu || p.description || 'Không có';
        
        return `- Họ tên: ${name}, Giới tính: ${gender}, Ngày sinh: ${birth}, Ngày mất: ${death}, Thông tin thêm: ${bio}`;
    }).join('\n');

    const systemPrompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}`;

    // BƯỚC 3: Gọi API LLaMA 3.1 8B của Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1, // Giữ nhiệt độ AI thấp để đảm bảo không suy đoán thông tin
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Lỗi kết nối đến Groq API');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}
