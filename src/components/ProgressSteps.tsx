import { motion } from "framer-motion";

const steps = [
  { label: "DOCUMENTO", icon: "1" },
  { label: "REVISÃO", icon: "2" },
  { label: "ASSINATURA", icon: "3" },
  { label: "CONCLUÍDO", icon: "✓" },
];

interface ProgressStepsProps {
  scrollProgress: number;
}

export default function ProgressSteps({ scrollProgress }: ProgressStepsProps) {
  const activeStep = Math.min(3, Math.floor(scrollProgress * 4));

  return (
    <div className="flex items-center gap-4 font-bold tracking-tight">
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep;

        return (
          <div key={index} className="flex items-center gap-4">
            <motion.div
              className="flex flex-col items-center gap-2"
              animate={{
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex items-center justify-center rounded-full font-black"
                style={{
                  width: "44px",
                  height: "44px",
                  background: isDone
                    ? "#0A0A0A"
                    : isActive
                    ? "#FF5C00"
                    : "#F3F4F6",
                  color: isDone || isActive ? "#FFFFFF" : "#9CA3AF",
                  border: isDone
                    ? "2px solid #0A0A0A"
                    : isActive
                    ? "2px solid #FF5C00"
                    : "2px solid #E5E7EB",
                  boxShadow: isActive
                    ? "0 0 20px rgba(255,92,0,0.3)"
                    : "none",
                }}
              >
                <span style={{ fontSize: "16px" }}>{isDone ? "✓" : step.icon}</span>
              </motion.div>
              <span
                style={{
                  fontSize: "11px",
                  color: isDone
                    ? "#0A0A0A"
                    : isActive
                    ? "#FF5C00"
                    : "#9CA3AF",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                }}
              >
                {step.label}
              </span>
            </motion.div>

            {index < steps.length - 1 && (
              <motion.div
                style={{
                  width: "40px",
                  height: "3px",
                  borderRadius: "2px",
                  background: isDone
                    ? "#0A0A0A"
                    : "#E5E7EB",
                  marginBottom: "20px",
                }}
                animate={{
                  opacity: 1,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
