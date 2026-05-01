import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getRandomQuote } from "../data/quotes";

export function DailyQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    // Get a random quote on component mount
    setQuote(getRandomQuote());
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="px-4 py-3"
    >
      <p className="text-xs text-white/30 italic leading-relaxed text-center">
        "{quote}"
      </p>
    </motion.div>
  );
}
