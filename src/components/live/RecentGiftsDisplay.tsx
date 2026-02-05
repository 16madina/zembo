 import { useState, useEffect, useRef } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import type { GiftTransaction, VirtualGift } from "@/hooks/useGifts";
 
 interface DisplayedGift {
   id: string;
   transactionId: string;
   gift: VirtualGift;
   senderName: string;
   timestamp: number;
 }
 
 interface RecentGiftsDisplayProps {
   recentGifts: (GiftTransaction & { gift?: VirtualGift; sender_name?: string })[];
 }
 
 const DISPLAY_DURATION = 5000; // 5 seconds
const MAX_AGE_MS = 10000; // Only show gifts from last 10 seconds
 
 const RecentGiftsDisplay = ({ recentGifts }: RecentGiftsDisplayProps) => {
   const [displayedGifts, setDisplayedGifts] = useState<DisplayedGift[]>([]);
   const processedIdsRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());
 
   // Process new gifts and add them to display
   useEffect(() => {
     const now = Date.now();
     
     recentGifts.forEach((transaction) => {
       if (!transaction.gift) return;
       
       // Skip if already processed
       if (processedIdsRef.current.has(transaction.id)) return;
       
      // Skip old gifts (loaded from database on page load)
      const transactionTime = new Date(transaction.created_at).getTime();
      const age = now - transactionTime;
      
      // Only show gifts that were sent recently (within MAX_AGE_MS) 
      // This filters out old gifts loaded from the database
      if (age > MAX_AGE_MS) {
        processedIdsRef.current.add(transaction.id); // Mark as processed to avoid reprocessing
        return;
      }
      
       processedIdsRef.current.add(transaction.id);
       
       const newGift: DisplayedGift = {
         id: `${transaction.id}-${now}`,
         transactionId: transaction.id,
         gift: transaction.gift,
         senderName: transaction.sender_name || "Anonyme",
         timestamp: now,
       };
       
       setDisplayedGifts((prev) => [newGift, ...prev].slice(0, 5)); // Keep max 5
     });
   }, [recentGifts]);
 
   // Auto-remove gifts after duration
   useEffect(() => {
     if (displayedGifts.length === 0) return;
     
     const timer = setInterval(() => {
       const now = Date.now();
       setDisplayedGifts((prev) => 
         prev.filter((gift) => now - gift.timestamp < DISPLAY_DURATION)
       );
     }, 500);
     
     return () => clearInterval(timer);
   }, [displayedGifts.length]);
 
   // Clear old processed IDs periodically
   useEffect(() => {
     const cleanup = setInterval(() => {
       // Keep only the last 50 processed IDs
       if (processedIdsRef.current.size > 50) {
         const idsArray = Array.from(processedIdsRef.current);
         processedIdsRef.current = new Set(idsArray.slice(-30));
       }
     }, 30000);
     
     return () => clearInterval(cleanup);
   }, []);
 
   return (
     <AnimatePresence>
       {displayedGifts.slice(0, 3).map((displayedGift, index) => (
         <motion.div
           key={displayedGift.id}
           initial={{ opacity: 0, x: -50 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -50 }}
           transition={{ delay: index * 0.1 }}
           className="absolute left-4 z-30"
           style={{ bottom: `${320 + index * 50}px` }}
         >
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border">
             <span className="text-lg">{displayedGift.gift.emoji}</span>
             <span className="text-xs">
               <span className="font-semibold text-primary">
                 {displayedGift.senderName}
               </span>{" "}
               <span className="text-muted-foreground">a envoyé</span>{" "}
               <span className="font-medium text-foreground">
                 {displayedGift.gift.name}
               </span>
             </span>
           </div>
         </motion.div>
       ))}
     </AnimatePresence>
   );
 };
 
 export default RecentGiftsDisplay;