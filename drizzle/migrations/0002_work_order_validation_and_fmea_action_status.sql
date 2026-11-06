ALTER TABLE public.work_orders ADD COLUMN validation_comment text;
ALTER TABLE public.work_orders ADD COLUMN validated_by uuid;
ALTER TABLE public.work_orders ADD COLUMN validated_at timestamp with time zone;
ALTER TABLE public.work_orders ADD COLUMN submitted_at timestamp with time zone;
ALTER TABLE public.fmea_items ADD COLUMN action_status text not null default 'open';