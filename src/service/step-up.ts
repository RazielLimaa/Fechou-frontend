import { apiFetch } from "./api";

export type StepUpScope =
  | "user.pix.update"
  | "user.pix.delete"
  | "payments.mark-paid"
  | "contracts.mark-paid"
  | "integrations.mp.api-key.register";

export type StepUpTokenResponse = {
  stepUpToken: string;
  expiresAt?: string;
};

export function requestStepUp(scope: StepUpScope, payload?: Record<string, unknown>, password?: string) {
  return apiFetch<StepUpTokenResponse>("/api/auth/step-up/request", {
    method: "POST",
    json: {
      scope,
      ...(payload ? { payload } : {}),
      ...(password ? { password } : {}),
    },
  });
}

export async function runWithStepUp<T>(
  scope: StepUpScope,
  payload: Record<string, unknown> | undefined,
  actionFn: (stepUpToken: string) => Promise<T>,
  password?: string,
): Promise<T> {
  const { stepUpToken } = await requestStepUp(scope, payload, password);
  return actionFn(stepUpToken);
}
