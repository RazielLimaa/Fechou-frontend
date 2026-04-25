import { useEffect, useState } from "react";
import { getBillingMe, type PlanInfo } from "../service/payment";

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const data = await getBillingMe();
        if (disposed) return;
        setPlan(data.plan);
        setError(null);
      } catch (err) {
        if (disposed) return;
        setPlan(null);
        setError(err);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return { plan, error, loading };
}
