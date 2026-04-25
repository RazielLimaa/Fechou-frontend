import type { RefObject } from "react";

export function isHoneypotTripped(ref: RefObject<HTMLInputElement | null>) {
  return Boolean(ref.current?.value.trim());
}

export function HoneypotField({
  inputRef,
  name = "website",
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  name?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: 1,
        height: 1,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <label htmlFor={`hp-${name}`}>Nao preencha este campo</label>
      <input
        id={`hp-${name}`}
        ref={inputRef}
        type="text"
        name={name}
        autoComplete="off"
        tabIndex={-1}
        inputMode="none"
        defaultValue=""
      />
    </div>
  );
}
