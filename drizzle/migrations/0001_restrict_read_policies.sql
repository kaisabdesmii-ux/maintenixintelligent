CREATE OR REPLACE FUNCTION public.has_any_app_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

DROP POLICY IF EXISTS "sp read" ON public.spare_parts;
CREATE POLICY "sp read" ON public.spare_parts FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "wo read" ON public.work_orders;
CREATE POLICY "wo read" ON public.work_orders FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "fm read" ON public.fmea_items;
CREATE POLICY "fm read" ON public.fmea_items FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "pp read" ON public.preventive_plans;
CREATE POLICY "pp read" ON public.preventive_plans FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "sr read" ON public.sensor_readings;
CREATE POLICY "sr read" ON public.sensor_readings FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "bd read" ON public.breakdowns;
CREATE POLICY "bd read" ON public.breakdowns FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "sm read" ON public.stock_movements;
CREATE POLICY "sm read" ON public.stock_movements FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "eq read" ON public.equipment;
CREATE POLICY "eq read" ON public.equipment FOR SELECT TO authenticated USING (public.has_any_app_role(auth.uid()));
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));