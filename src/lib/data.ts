import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];

export function useRows<T extends TableName>(table: T, opts: { select?: string; order?: string; asc?: boolean; eq?: [string, string] } = {}) {
  return useQuery({
    queryKey: [table, opts],
    queryFn: async () => {
      let q = supabase.from(table).select(opts.select ?? "*") as any;
      if (opts.eq) q = q.eq(opts.eq[0], opts.eq[1]);
      if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? false });
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSave<T extends TableName>(table: T, invalidate: TableName[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: Record<string, unknown> }) => {
      const res = id
        ? await (supabase.from(table) as any).update(values).eq("id", id)
        : await (supabase.from(table) as any).insert(values);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      [table, ...invalidate].forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message.includes("row-level security") ? "Your role is not allowed to do this." : e.message),
  });
}
