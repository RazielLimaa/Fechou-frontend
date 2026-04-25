import { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

export function ContractPreview({
  src,
  title = "Contract Preview",
  loading = false,
  baseWidth = 800,
  baseHeight = 1122,
  className,
  onLoad,
}: {
  src?: string;
  title?: string;
  loading?: boolean;
  baseWidth?: number;
  baseHeight?: number;
  className?: string;
  onLoad?: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;

    const updateScale = () => {
      const availableWidth = Math.max(stage.clientWidth - 16, 1);
      const availableHeight = Math.max(stage.clientHeight - 12, 1);
      const nextScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 0.92);
      setScale((current) => (Math.abs(current - nextScale) < 0.01 ? current : nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [baseHeight, baseWidth]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,#1d2127_0%,#121419_100%)] p-3 sm:p-4",
        className,
      )}
    >
      <div className="z-10 mx-auto mb-2.5 flex w-fit shrink-0 items-center gap-2 rounded-full border border-border/40 bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <Lock size={11} />
        Preview oficial
      </div>

      <div ref={stageRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex min-h-full w-full items-start justify-center pt-0.5">
          <div
            className="shrink-0 overflow-visible"
            style={{
              width: baseWidth * scale,
              height: baseHeight * scale,
            }}
          >
            <div
              className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_32px_90px_rgba(0,0,0,0.48)]"
              style={{
                width: baseWidth,
                height: baseHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {src ? (
                <iframe
                  src={src}
                  onLoad={onLoad}
                  className="h-full w-full border-0"
                  title={title}
                  sandbox="allow-same-origin"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-white text-sm text-zinc-500">
                  Preview aguardando resposta do backend.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/88 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Carregando preview oficial...
          </div>
        </div>
      )}
    </div>
  );
}

