import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { setStepUpPasswordPrompt, type StepUpPromptContent } from "../../service/step-up";

type PendingStepUpRequest = StepUpPromptContent & {
  resolve: (password: string | null) => void;
};

function StepUpDialog({
  pending,
  onClose,
}: {
  pending: PendingStepUpRequest | null;
  onClose: (password: string | null) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPassword("");
    setError(null);
    setSubmitting(false);
  }, [pending]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending || submitting) return;

    const normalized = password.trim();
    if (!normalized) {
      setError("Digite sua senha para continuar.");
      return;
    }

    if (normalized.length > 512) {
      setError("Não foi possível confirmar sua identidade agora. Tente novamente.");
      return;
    }

    setSubmitting(true);
    onClose(normalized);
  }, [onClose, password, pending, submitting]);

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && !submitting && onClose(null)}>
      <DialogContent className="sm:max-w-md border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-2xl tracking-tight text-white">
            {pending?.title ?? "Confirme sua identidade"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/50">
            {pending?.description ?? "Digite sua senha para continuar com esta ação sensível."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="step-up-password" className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              Senha da conta
            </label>
            <Input
              id="step-up-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              spellCheck={false}
              className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/20"
              placeholder="Digite sua senha"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <p className="text-xs leading-relaxed text-white/35">
            Esta confirmação vale apenas para esta ação. Sua senha não é armazenada no navegador.
          </p>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(null)}
              className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent text-white hover:bg-accent/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pending?.confirmLabel ?? "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StepUpDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingStepUpRequest | null>(null);

  const closePrompt = useCallback((password: string | null) => {
    setPending((current) => {
      current?.resolve(password);
      return null;
    });
  }, []);

  const promptHandler = useMemo(
    () => (content: StepUpPromptContent) =>
      new Promise<string | null>((resolve) => {
        setPending({ ...content, resolve });
      }),
    [],
  );

  useEffect(() => {
    setStepUpPasswordPrompt(promptHandler);
    return () => setStepUpPasswordPrompt(null);
  }, [promptHandler]);

  return (
    <>
      {children}
      <StepUpDialog pending={pending} onClose={closePrompt} />
    </>
  );
}
