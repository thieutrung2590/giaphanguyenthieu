// File: components/AddPersonForm.tsx
'use client'

import { addPersonAction } from "@/app/actions";
import { useRef } from "react";

export default function AddPersonForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      action={async (formData) => {
        await addPersonAction(formData);
        formRef.current?.reset(); // Xóa trắng form sau khi thêm xong
      }} 
      ref={formRef}
      className="flex gap-2 my-4"
    >
      <input 
        type="text" 
        name="full_name" 
        placeholder="VD: Nguyễn Thiệu Trung..." 
        required 
        className="border p-2 rounded"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Thêm thành viên
      </button>
    </form>
  );
}
