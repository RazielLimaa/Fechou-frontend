import { useEffect, useState } from "react";
import { getBillingMe, type PlanInfo } from "../service/payment";

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBillingMe();
        setPlan(data.plan);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { plan, loading };
}
