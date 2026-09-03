-- Cập nhật bảng custom_events để lưu trữ thông tin ngày tháng năm Âm Lịch
ALTER TABLE public.custom_events
ADD COLUMN IF NOT EXISTS lunar_day smallint CHECK (lunar_day >= 1 AND lunar_day <= 30),
ADD COLUMN IF NOT EXISTS lunar_month smallint CHECK (lunar_month >= 1 AND lunar_month <= 12),
ADD COLUMN IF NOT EXISTS lunar_year integer,
ADD COLUMN IF NOT EXISTS is_leap_month boolean DEFAULT false;