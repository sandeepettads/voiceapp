import { motion } from 'motion/react';

export function ListeningFrame() {
  return (
    <div className="relative w-[645px] h-[645px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-[560px] h-[560px] rounded-full border border-cyan-200/10"></div>
      </div>

      {/* Halo Ring (Rotating) */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{
          duration: 4.1,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-[477px] h-[477px] rounded-full border-[5px] border-transparent bg-gradient-to-r from-cyan-200 via-white via-orange-500 via-yellow-200 to-blue-300 p-[5px]">
          <div className="w-full h-full rounded-full bg-transparent"></div>
        </div>
      </motion.div>

      {/* The - O Layer (Pulsating) */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 4.4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Outer O Ring */}
        <div className="relative w-[170px] h-[170px] rounded-full border-[12px] border-orange-300/80 bg-transparent">
          {/* Inner O Fill */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 opacity-90">
            {/* Inner Hole */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-white"></div>
          </div>
        </div>
      </motion.div>

      {/* Additional glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-conic from-cyan-100/20 via-orange-100/20 to-blue-100/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}