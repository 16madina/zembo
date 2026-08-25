import { ReactNode, RefObject } from "react";
import { ChevronLeft } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { tapHaptics } from "@/hooks/useHaptics";

interface NativeHeaderProps {
  /** Large title shown at rest (also used as the compact centered title). */
  title: string;
  /** Optional subtitle shown under the large title. */
  subtitle?: string;
  /** Trailing actions rendered in the compact action bar. */
  actions?: ReactNode;
  /** Leading element (logo, etc.) rendered in the action bar on root screens. */
  leading?: ReactNode;
  /** Scroll container the header should react to. */
  scrollRef?: RefObject<HTMLElement>;
  /** Child-page mode: back chevron + centered title, no large title. */
  backLabel?: string;
  onBack?: () => void;
}

const NativeHeader = ({
  title,
  subtitle,
  actions,
  leading,
  scrollRef,
  backLabel,
  onBack,
}: NativeHeaderProps) => {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll(scrollRef ? { container: scrollRef } : undefined);

  // Collapse over the first 44px of scroll.
  const largeOpacity = useTransform(scrollY, [0, 28, 44], [1, 0.4, 0]);
  const largeY = useTransform(scrollY, [0, 44], [0, -10]);
  const largeScale = useTransform(scrollY, [0, 44], [1, 0.92]);
  const compactOpacity = useTransform(scrollY, [12, 44], [0, 1]);
  const hairlineOpacity = useTransform(scrollY, [0, 8], [0, 1]);

  const isChild = Boolean(onBack);

  return (
    <header className="relative flex-shrink-0 z-30">
      <motion.div
        className="absolute inset-0 glass-bar"
        style={{ opacity: isChild ? 1 : compactOpacity }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-[var(--hairline)]"
        style={{ opacity: isChild ? 1 : hairlineOpacity }}
      />

      {/* Action / compact bar — 44px content height */}
      <div className="relative flex items-center gap-2 px-4 h-11">
        {isChild ? (
          <button
            onClick={() => {
              tapHaptics.impact("LIGHT");
              onBack?.();
            }}
            className="flex items-center -ml-2 pl-1 pr-2 h-11 text-primary active:opacity-60 transition-opacity duration-100"
          >
            <ChevronLeft className="w-7 h-7 -mr-1" strokeWidth={2.2} />
            {backLabel && <span className="text-body-ios">{backLabel}</span>}
          </button>
        ) : (
          <div className="flex items-center min-w-0">{leading}</div>
        )}

        {/* Compact centered title */}
        <motion.span
          className="absolute left-1/2 -translate-x-1/2 text-body-ios font-semibold truncate max-w-[55%] text-center"
          style={{ opacity: isChild ? 1 : reduceMotion ? 0 : compactOpacity }}
        >
          {title}
        </motion.span>

        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>

      {/* Large title */}
      {!isChild && (
        <motion.div
          className="relative px-4 pb-2 origin-left"
          style={
            reduceMotion
              ? undefined
              : { opacity: largeOpacity, y: largeY, scale: largeScale }
          }
        >
          <h1 className="text-large-title text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-subhead text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </motion.div>
      )}
    </header>
  );
};

export default NativeHeader;
