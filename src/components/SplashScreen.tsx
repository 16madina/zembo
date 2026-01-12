import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import zemboLogoGold from '@/assets/zembo-logo-gold.png';
import zemboVoice from '@/assets/sounds/zembo-voice.mp3';
import successChime from '@/assets/sounds/success-chime.mp3';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

const SplashScreen = ({ onComplete, minDuration = 2500 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const audioPlayedRef = useRef(false);

  useEffect(() => {
    // Play audio sequence on mount
    const playAudioSequence = async () => {
      if (audioPlayedRef.current) return;
      audioPlayedRef.current = true;

      try {
        // Play success chime first
        const chime = new Audio(successChime);
        chime.volume = 0.4;
        await chime.play().catch(() => {});

        // Play ZEMBO voice after a short delay
        setTimeout(() => {
          const voice = new Audio(zemboVoice);
          voice.volume = 0.7;
          voice.play().catch(() => {});
        }, 800);
      } catch (error) {
        console.log('Audio playback not available');
      }
    };

    playAudioSequence();

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />
          
          {/* Animated glow effects */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.3 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="absolute w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px]"
          />
          <motion.div
            initial={{ scale: 1, opacity: 0.2 }}
            animate={{ scale: 0.8, opacity: 0.4 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.5 }}
            className="absolute w-[300px] h-[300px] rounded-full bg-accent/30 blur-[80px]"
          />

          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Main logo with shine effect */}
            <div className="relative">
              <motion.img
                src={zemboLogoGold}
                alt="Zembo"
                className="w-64 h-auto drop-shadow-2xl"
                initial={{ filter: 'brightness(0.5)' }}
                animate={{ filter: 'brightness(1)' }}
                transition={{ duration: 1, delay: 0.3 }}
              />
              
              {/* Shine sweep effect */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, delay: 0.8, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
              />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-6 text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase"
            >
              L'amour à l'africaine
            </motion.p>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-20 flex flex-col items-center gap-4"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Bottom decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
