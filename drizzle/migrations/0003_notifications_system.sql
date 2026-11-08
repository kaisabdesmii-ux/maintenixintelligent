CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  link text,
  actor_name text,
  equipment_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ntf read own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ntf mark read own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_supervisors(_type text, _title text, _description text, _priority text, _link text, _actor text, _equipment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, description, priority, link, actor_name, equipment_id)
  SELECT ur.user_id, _type, _title, _description, _priority, _link, _actor, _equipment_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'maintenance_manager')
    AND ur.user_id IS DISTINCT FROM auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_breakdown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE eq_name text;
BEGIN
  SELECT name INTO eq_name FROM public.equipment WHERE id = NEW.equipment_id;
  PERFORM public.notify_supervisors(
    'breakdown_new',
    'New breakdown: ' || COALESCE(eq_name, 'equipment'),
    NEW.reference || ' — ' || NEW.description,
    CASE WHEN NEW.severity IN ('critical','high') OR NEW.priority IN ('critical','high') THEN 'critical' ELSE 'medium' END,
    '/breakdowns', NEW.reporter_name, NEW.equipment_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_breakdown AFTER INSERT ON public.breakdowns FOR EACH ROW EXECUTE FUNCTION public.trg_notify_breakdown();

CREATE OR REPLACE FUNCTION public.trg_notify_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE eq_name text; pr text; tp text; tt text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT name INTO eq_name FROM public.equipment WHERE id = NEW.equipment_id;
  IF NEW.status = 'awaiting_validation' THEN
    tp := 'validation_request'; tt := 'Validation requested: ' || NEW.number; pr := 'high';
  ELSIF NEW.status = 'completed' THEN
    tp := 'intervention_done'; tt := 'Intervention completed: ' || NEW.number; pr := 'medium';
  ELSIF NEW.status = 'validated' THEN
    tp := 'wo_validated'; tt := 'Work order validated: ' || NEW.number; pr := 'low';
  ELSE
    tp := 'wo_status'; tt := 'Work order ' || NEW.number || ' → ' || NEW.status; pr := 'low';
  END IF;
  PERFORM public.notify_supervisors(tp, tt, COALESCE(eq_name, '') || ' — ' || NEW.description, pr, '/work-orders', NEW.assigned_technician, NEW.equipment_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_work_order AFTER UPDATE OF status ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.trg_notify_work_order();

CREATE OR REPLACE FUNCTION public.trg_notify_sensor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE eq_name text;
BEGIN
  IF COALESCE(NEW.temperature, 0) >= 85 OR COALESCE(NEW.vibration, 0) >= 4.5 THEN
    SELECT name INTO eq_name FROM public.equipment WHERE id = NEW.equipment_id;
    PERFORM public.notify_supervisors(
      'critical_reading',
      'Critical reading: ' || COALESCE(eq_name, 'equipment'),
      'Temp ' || COALESCE(NEW.temperature::text, '—') || ' °C, vibration ' || COALESCE(NEW.vibration::text, '—') || ' mm/s',
      'critical', '/predictive', NULL, NEW.equipment_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_sensor AFTER INSERT ON public.sensor_readings FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sensor();

CREATE OR REPLACE FUNCTION public.trg_notify_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity <= 0 AND OLD.quantity > 0 THEN
    PERFORM public.notify_supervisors('stock_out', 'Out of stock: ' || NEW.designation, NEW.reference || ' — quantity 0', 'critical', '/inventory', NULL, NULL);
  ELSIF NEW.quantity <= NEW.min_stock AND OLD.quantity > OLD.min_stock THEN
    PERFORM public.notify_supervisors('stock_low', 'Low stock: ' || NEW.designation, NEW.reference || ' — ' || NEW.quantity || ' left (min ' || NEW.min_stock || ')', 'high', '/inventory', NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_stock AFTER UPDATE OF quantity ON public.spare_parts FOR EACH ROW EXECUTE FUNCTION public.trg_notify_stock();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;