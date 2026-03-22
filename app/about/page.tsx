"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Info, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>

      <Link href="/dashboard" className="btn absolute top-6 left-6 z-20">
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20 relative z-10 w-full mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200 mb-8 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100/50 text-amber-700 rounded-2xl">
                <Info className="size-6" />
              </div>
              <h1 className="title">Giới thiệu Dòng họ Nguyễn Thiệu</h1>
            </div>

            <div className="max-w-none">
<p className="text-stone-600 leading-relaxed text-[15px] mb-8">
  Gia phả Dòng họ Nguyễn Thiệu được hình thành nhằm ghi chép, hệ thống và lưu giữ một cách đầy đủ, có trật tự về cội nguồn, huyết thống và sự phát triển của các thế hệ trong dòng họ qua nhiều thời kỳ lịch sử. Đây không chỉ là một tài liệu mang tính ghi chép đơn thuần mà còn là kết tinh của truyền thống, ký ức và đạo lý gia tộc, phản ánh quá trình hình thành, tồn tại và phát triển của một dòng họ trong dòng chảy chung của lịch sử dân tộc.

  Nhân vật tiêu biểu, giữ vị trí quan trọng trong việc định hình danh phận và truyền thống của dòng họ là Nguyễn Thiệu Trị (1442–1522). Ông là người làng Xuân Lôi, huyện Lập Thạch (nay thuộc tỉnh Vĩnh Phúc), đỗ tiến sĩ khoa Mậu Tuất năm 1478 dưới triều Lê sơ và từng giữ chức Thượng thư bộ Hộ. Với học vấn uyên thâm và sự nghiệp quan trường rõ ràng, ông được xem là người đặt nền tảng cho truyền thống hiếu học, trọng danh tiết và tham gia quản lý nhà nước của các thế hệ con cháu về sau. Cuộc đời và sự nghiệp của ông cũng phản ánh những biến động lịch sử đương thời, đặc biệt là giai đoạn chuyển tiếp giữa nhà Lê và nhà Mạc, qua đó ảnh hưởng nhất định đến gia tộc.

  Việc biên soạn gia phả được thực hiện trên cơ sở tổng hợp các tư liệu còn lưu giữ trong dòng họ, kết hợp với sự truyền lại qua trí nhớ của các thế hệ cao niên. Trong điều kiện nhiều biến động lịch sử, chiến tranh và sự dịch chuyển nơi cư trú của các chi phái, không ít thông tin đã bị mai một hoặc gián đoạn. Vì vậy, việc tái lập, bổ sung và hoàn thiện gia phả là một nỗ lực mang tính kế thừa và trách nhiệm, nhằm khôi phục lại bức tranh tương đối đầy đủ về sự liên kết huyết thống và lịch sử gia tộc.

  Trong truyền thống văn hóa Việt Nam, quan niệm “chim có tổ, người có tông” không chỉ là một câu nói mang tính hình tượng mà còn thể hiện ý thức sâu sắc về cội nguồn và đạo lý làm người. Gia phả vì thế giữ vai trò như một nền tảng tinh thần, giúp mỗi thành viên trong dòng họ nhận thức rõ vị trí của mình trong hệ thống gia tộc, hiểu được mối quan hệ giữa các thế hệ và nuôi dưỡng lòng hiếu kính đối với tổ tiên, ông bà và cha mẹ.

  Gia phả còn là cơ sở quan trọng để duy trì các nghi lễ truyền thống như thờ phụng tổ tiên, giỗ kỵ, tảo mộ và các hoạt động mang tính cộng đồng của dòng họ. Thông qua những dịp này, con cháu có điều kiện gặp gỡ, gắn kết và củng cố tình cảm huyết thống, đồng thời tiếp nhận những giá trị đạo đức, gia phong và kinh nghiệm sống được truyền lại từ các thế hệ đi trước. Những hoạt động đó không chỉ mang ý nghĩa tâm linh mà còn góp phần tạo nên sự ổn định và bền vững trong đời sống gia đình và xã hội.

  Trải qua nhiều thế hệ, cùng với sự phát triển của xã hội và sự thay đổi về điều kiện sống, nhiều chi nhánh trong dòng họ đã phân tán, sinh sống ở nhiều vùng miền khác nhau. Điều này đặt ra yêu cầu cần có một hệ thống lưu trữ thông tin rõ ràng, chính xác để các thế hệ sau có thể nhận biết và kết nối lại với nhau. Gia phả, trong ý nghĩa đó, trở thành cầu nối giữa quá khứ, hiện tại và tương lai, giúp duy trì sự liên tục của dòng họ không chỉ về mặt huyết thống mà còn về mặt tinh thần và văn hóa.

  Việc xây dựng và cập nhật gia phả không phải là công việc của riêng một cá nhân hay một chi phái, mà là trách nhiệm chung của toàn thể con cháu trong dòng họ. Mỗi thế hệ có nghĩa vụ tiếp tục bổ sung, chỉnh lý những thông tin mới phát sinh, đồng thời bảo tồn những giá trị cốt lõi đã được hình thành từ trước. Chỉ khi có sự tham gia và ý thức trách nhiệm chung, gia phả mới có thể phản ánh trung thực và đầy đủ lịch sử phát triển của dòng họ.

  Gia phả Dòng họ Nguyễn Thiệu vì vậy không chỉ là một tài liệu lưu trữ mà còn là một di sản tinh thần quý giá, thể hiện bản sắc, truyền thống và sức mạnh đoàn kết của cả dòng tộc. Việc gìn giữ và phát huy giá trị của gia phả chính là cách thiết thực để mỗi thế hệ con cháu thể hiện lòng tri ân đối với tổ tiên, đồng thời góp phần xây dựng nền tảng vững chắc cho sự phát triển lâu dài của dòng họ trong tương lai.
</p>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Tuyên bố từ chối trách nhiệm & Quyền riêng tư
                </h2>
              </div>

              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-[14.5px] leading-relaxed">
                <p className="font-bold text-stone-800 mb-4 bg-white py-2 px-3 rounded-lg border border-stone-200 shadow-sm inline-block">
                  Dự án đang trong quá trình triển khai
                </p>

                <ul className="space-y-4 text-stone-600 list-disc pl-5">
                  <li>
                    <strong className="text-stone-800">
                      Tự lưu trữ hoàn toàn (Self-hosted):
                    </strong>{" "}
                    Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên,
                    ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ{" "}
                    <strong className="text-stone-800">
                      trong tài khoản Supabase của chính bạn
                    </strong>
                    . Tác giả dự án không có quyền truy cập vào database đó.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Không thu thập dữ liệu:
                    </strong>{" "}
                    Không có analytics, không có tracking, không có telemetry,
                    không có bất kỳ hình thức thu thập thông tin người dùng nào
                    được tích hợp trong mã nguồn.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Bạn kiểm soát dữ liệu của bạn:
                    </strong>{" "}
                    Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn
                    trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có
                    thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.
                  </li>
                  <li>
                    <strong className="text-stone-800">Demo công khai:</strong>{" "}
                    Trang web tại{" "}
                    <code className="bg-white border border-stone-200 px-1 py-0.5 rounded text-[13px] text-amber-700">
                      honguyenthieu.vn
                    </code>{" "}
                    sử dụng dữ liệu thật của các thành viên Dòng họ.
                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Liên hệ & Góp ý
                </h2>
              </div>

              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                Nếu bạn có bất kỳ thắc mắc, đề xuất tính năng, báo lỗi khi sử
                dụng phần mềm, hoặc muốn thảo luận thì xin vui lòng liên hệ
                mail, số điện thoại:{` `}
                <a
                  href="mailto:giaphaos@homielab.com"
                  className="font-semibold text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 mt-2"
                >
                  0973.525.248
                  nguyentrung2590@gmail.com
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
