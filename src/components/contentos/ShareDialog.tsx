import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarShares, type ShareRole } from "@/hooks/useCalendarShares";
import { Trash2, UserPlus, Eye, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: Props) {
  const { outgoing, calendars, invite, updateRole, revoke } = useCalendarShares();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [submitting, setSubmitting] = useState(false);

  const incoming = calendars.filter((c) => c.role !== "owner");

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    await invite(email, role);
    setEmail("");
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar agenda</DialogTitle>
          <DialogDescription>
            Convide outro usuário pelo e-mail. Ele precisa ter uma conta na plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Select value={role} onValueChange={(v) => setRole(v as ShareRole)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Visualizar</SelectItem>
                <SelectItem value="editor">Editar</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={submitting}>
              <UserPlus className="w-4 h-4 mr-1" /> Convidar
            </Button>
          </div>
        </div>

        {outgoing.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Pessoas com acesso à minha agenda
            </p>
            <div className="space-y-2">
              {outgoing.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{s.email}</p>
                  </div>
                  <Select
                    value={s.role}
                    onValueChange={(v) => updateRole(s.id, v as ShareRole)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizar</SelectItem>
                      <SelectItem value="editor">Editar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => revoke(s.id)}
                    title="Remover acesso"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {incoming.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Agendas compartilhadas comigo
            </p>
            <div className="space-y-2">
              {incoming.map((c) => (
                <div
                  key={c.ownerId}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.email}</p>
                  </div>
                  <span className="text-xs flex items-center gap-1 text-muted-foreground">
                    {c.role === "editor" ? (
                      <>
                        <Pencil className="w-3 h-3" /> Editor
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Leitor
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
