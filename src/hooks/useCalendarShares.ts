import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ShareRole = "viewer" | "editor";

export interface AccessibleCalendar {
  ownerId: string;
  email: string;
  displayName: string | null;
  role: ShareRole | "owner";
}

export interface OutgoingShare {
  id: string;
  sharedWithId: string;
  email: string;
  displayName: string | null;
  role: ShareRole;
}

export function useCalendarShares() {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<AccessibleCalendar[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingShare[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setCalendars([]);
      setOutgoing([]);
      setLoading(false);
      return;
    }

    // Shares where I am owner -> to list outgoing
    const { data: outRows } = await supabase
      .from("calendar_shares")
      .select("id, shared_with_id, role")
      .eq("owner_id", user.id);

    // Shares where I am invited -> calendars I can access
    const { data: inRows } = await supabase
      .from("calendar_shares")
      .select("owner_id, role")
      .eq("shared_with_id", user.id);

    const otherIds = new Set<string>();
    (outRows ?? []).forEach((r) => otherIds.add(r.shared_with_id));
    (inRows ?? []).forEach((r) => otherIds.add(r.owner_id));

    let profilesById: Record<string, { email: string; display_name: string | null }> = {};
    if (otherIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", Array.from(otherIds));
      (profs ?? []).forEach((p) => {
        profilesById[p.user_id] = { email: p.email, display_name: p.display_name };
      });
    }

    setOutgoing(
      (outRows ?? []).map((r) => ({
        id: r.id,
        sharedWithId: r.shared_with_id,
        email: profilesById[r.shared_with_id]?.email ?? "—",
        displayName: profilesById[r.shared_with_id]?.display_name ?? null,
        role: r.role as ShareRole,
      })),
    );

    const myCal: AccessibleCalendar = {
      ownerId: user.id,
      email: user.email ?? "Minha agenda",
      displayName: "Minha agenda",
      role: "owner",
    };
    const shared = (inRows ?? []).map<AccessibleCalendar>((r) => ({
      ownerId: r.owner_id,
      email: profilesById[r.owner_id]?.email ?? "—",
      displayName: profilesById[r.owner_id]?.display_name ?? null,
      role: r.role as ShareRole,
    }));
    setCalendars([myCal, ...shared]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`calendar_shares_changes_${user.id}_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_shares" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const invite = useCallback(
    async (email: string, role: ShareRole) => {
      if (!user) return;
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return;
      if (cleanEmail === user.email?.toLowerCase()) {
        toast.error("Você não pode convidar a si mesmo");
        return;
      }

      const { data: foundId, error: findErr } = await supabase.rpc(
        "find_user_id_by_email",
        { _email: cleanEmail },
      );
      if (findErr) {
        toast.error("Erro ao buscar usuário");
        return;
      }
      if (!foundId) {
        toast.error("Nenhum usuário cadastrado com esse e-mail");
        return;
      }

      const { error } = await supabase
        .from("calendar_shares")
        .upsert(
          { owner_id: user.id, shared_with_id: foundId, role },
          { onConflict: "owner_id,shared_with_id" },
        );
      if (error) {
        toast.error("Falha ao compartilhar");
        return;
      }
      toast.success("Agenda compartilhada");
      reload();
    },
    [user, reload],
  );

  const updateRole = useCallback(
    async (shareId: string, role: ShareRole) => {
      const { error } = await supabase
        .from("calendar_shares")
        .update({ role })
        .eq("id", shareId);
      if (error) toast.error("Erro ao atualizar permissão");
      else reload();
    },
    [reload],
  );

  const revoke = useCallback(
    async (shareId: string) => {
      const { error } = await supabase
        .from("calendar_shares")
        .delete()
        .eq("id", shareId);
      if (error) toast.error("Erro ao remover");
      else {
        toast.success("Acesso removido");
        reload();
      }
    },
    [reload],
  );

  return { calendars, outgoing, loading, invite, updateRole, revoke, reload };
}
