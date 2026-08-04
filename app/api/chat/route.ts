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
    // Ưu tiên dùng SERVICE_ROLE_KEY để vượt qua RLS nếu có
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình GROQ_API_KEY trên Vercel.' }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình biến môi trường Supabase trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // BƯỚC 1: ĐỌC DỮ LIỆU TỪ SUPABASE TẠI BACKEND
    const { data: members, error: supabaseError } = await supabase
      .from('members') // Đảm bảo tên bảng trong Supabase chính xác là 'members'
      .select('id, full_name, gender, birth_date, death_date, biography')
      .limit(100);

    if (supabaseError) {
      return NextResponse.json({ reply: `Lỗi truy xuất CSDL: ${supabaseError.message}` }, { status: 500 });
    }

    // NẾU DỮ LIỆU RỖNG BÁO NGAY RA MÀN HÌNH ĐỂ DEBUG
    if (!members || members.length === 0) {
      return NextResponse.json({ reply: 'Hệ thống thông báo: Đã kết nối Supabase thành công nhưng bảng "members" đang rỗng hoặc bị chặn đọc bởi RLS (Row Level Security). Vui lòng vào Supabase tắt RLS hoặc kiểm tra lại tên bảng.' }, { status: 200 });
    }

    // BƯỚC 2: TẠO PROMPT
    const contextData = members.map((m: any) => 
        `- Họ tên: ${m.full_name || 'Không rõ'}, Giới tính: ${m.gender || 'Không rõ'}, Ngày sinh: ${m.birth_date || 'Không rõ'}, Ngày mất: ${m.death_date || 'Không rõ'}, Tiểu sử: ${m.biography || 'Không có'}`
      ).join('\n');

    const systemPrompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}`;

    // BƯỚC 3: GỌI GROQ API
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
        temperature: 0.1, // Chỉnh xuống mức cực thấp để loại bỏ hoàn toàn sự bịa đặt
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
