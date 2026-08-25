import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

export const TAB_ROUTES = ["/", "/discover", "/rooms", "/messages", "/profile"];

export const isTabRoute = (pathname: string) => TAB_ROUTES.includes(pathname);

const IOS_EASE = [0.32, 0.72, 0, 1] as const;

type Mode = "push" | "pop" | "tab";

const variants = {
  initial: (mode: Mode) => {
    if (mode === "tab") return { opacity: 0, x: 0 };
    if (mode === "push") return { opacity: 1, x: "100%" };
    return { opacity: 0.6, x: "-25%" };
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: IOS_EASE },
  },
  exit: (mode: Mode) => {
    if (mode === "tab") {
      return { opacity: 0, x: 0, transition: { duration: 0.12, ease: "linear" as const } };
    }
    if (mode === "push") {
      return { opacity: 0.6, x: "-25%", transition: { duration: 0.3, ease: IOS_EASE } };
    }
    return { opacity: 1, x: "100%", transition: { duration: 0.3, ease: IOS_EASE } };
  },
};

/** Tracks navigation history to know whether we pushed or popped. */
const useNavMode = (pathname: string): Mode => {
  const stack = useRef<string[]>([pathname]);
  const prev = useRef<string>(pathname);

  return useMemo<Mode>(() => {
    const previous = prev.current;
    prev.current = pathname;

    if (previous === pathname) return "tab";

    if (isTabRoute(pathname) && isTabRoute(previous)) {
      stack.current = [pathname];
      return "tab";
    }

    const existingIndex = stack.current.lastIndexOf(pathname);
    if (existingIndex >= 0 && existingIndex < stack.current.length - 1) {
      stack.current = stack.current.slice(0, existingIndex + 1);
      return "pop";
    }

    stack.current.push(pathname);
    return "push";
  }, [pathname]);
};

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const mode = useNavMode(location.pathname);
  const [dragEnabled, setDragEnabled] = useState(false);

  const isChild = !isTabRoute(location.pathname);
  const swipeable = isChild && !reduceMotion;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!swipeable) return;
    setDragEnabled(e.clientX <= 24);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragEnabled(false);
    const threshold = window.innerWidth * 0.35;
    if (info.offset.x > threshold || info.velocity.x > 700) {
      navigate(-1);
    }
  };

  if (reduceMotion) {
    return (
      <div className="absolute inset-0" key={location.pathname}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="sync" custom={mode} initial={false}>
      <motion.div
        key={location.pathname}
        custom={mode}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute inset-0 bg-background will-change-transform"
        onPointerDown={handlePointerDown}
        drag={dragEnabled ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.9 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
