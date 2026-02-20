import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-muted-foreground truncate">
        {value}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="border-white/10 hover:bg-white/5 rounded-xl"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
