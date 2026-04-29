import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div className="flex flex-col items-center px-4" key="overview">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-4"
        initial={{ opacity: 0, scale: 0.85 }}
        transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 rounded-full blur-3xl opacity-40 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 scale-110" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="PMC Solutions AI"
          className="relative drop-shadow-[0_0_30px_rgba(99,102,241,0.6)]"
          height={180}
          src="/images/PMC_Solutions_AI_small.png"
          width={180}
        />
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-semibold text-2xl tracking-tight text-foreground md:text-3xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        PMC Solutions AI
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center text-muted-foreground/80 text-sm"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        Pose une question, génère du code, ou explore tes idées.
      </motion.div>
    </div>
  );
};
