"use server";

import { getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export async function addDonation(formData: FormData) {
  const supabase = await getSupabase();
  
  const donor_name = formData.get("donor_name") as string;
  const amount = parseInt(formData.get("amount") as string, 10);
  const donation_date = formData.get("donation_date") as string;
  const note = formData.get("note") as string;

  const { error } = await supabase.from("donations").insert([
    { donor_name, amount, donation_date, note }
  ]);

  if (error) {
    return { error: error.message };
  }

  // Yêu cầu Next.js tải lại dữ liệu mới nhất cho trang này
  revalidatePath("/dashboard/donations");
  return { success: true };
}
// Thêm vào file actions.ts hiện có
export async function addExpense(formData: FormData) {
  const supabase = await getSupabase();
  
  const description = formData.get("description") as string;
  const amount = parseInt(formData.get("amount") as string, 10);
  const expense_date = formData.get("expense_date") as string;
  const note = formData.get("note") as string;

  const { error } = await supabase.from("expenses").insert([
    { description, amount, expense_date, note }
  ]);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/donations");
  return { success: true };
}
