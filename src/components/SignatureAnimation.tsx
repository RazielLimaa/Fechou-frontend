import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface SignatureAnimationProps {
  progress: number;
  name: string;
}

export default function SignatureAnimation({ progress, name }: SignatureAnimationProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  const signaturePaths = [
    "M 5 20 C 8 12, 12 8, 16 14 C 20 20, 18 26, 22 20 C 26 14, 30 10, 36 16",
    "M 36 16 C 42 22, 40 28, 46 22 C 50 18, 54 14, 60 18 C 64 22, 62 28, 68 22",
    "M 68 22 C 74 16, 78 12, 84 18 C 88 22, 86 28, 92 24 C 96 20, 98 18, 102 20",
  ];

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg
        width="110"
        height="36"
        viewBox="0 0 110 36"
        fill="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {signaturePaths.map((path, i) => {
          const segmentStart = i / signaturePaths.length;
          const segmentEnd = (i + 1) / signaturePaths.length;
          const segmentProgress = Math.max(
            0,
            Math.min(1, (clampedProgress - segmentStart) / (segmentEnd - segmentStart))
          );

          const dashArray = 200;
          const dashOffset = dashArray * (1 - segmentProgress);

          return (
            <path
              key={i}
              d={path}
              stroke="#0A0A0A"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: dashArray,
                strokeDashoffset: dashOffset,
                transition: "stroke-dashoffset 0.05s linear",
              }}
            />
          );
        })}

        {clampedProgress > 0 && clampedProgress < 1 && (
          <circle
            cx={5 + clampedProgress * 97}
            cy={20 - Math.sin(clampedProgress * Math.PI * 3) * 4}
            r="3"
            fill="#FF5C00"
            filter="url(#glow-strong)"
          />
        )}
      </svg>

      {clampedProgress > 0.1 && clampedProgress < 0.99 && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${20 + clampedProgress * 60 + i * 3}%`,
                top: "30%",
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                background: "#FF5C00",
              }}
              animate={{
                y: [0, -10 - i * 4],
                opacity: [0.8, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
