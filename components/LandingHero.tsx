"use client";

import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

interface LandingHeroProps {
  siteName: string;
}

export default function LandingHero({ siteName }: LandingHeroProps) {
  return (
    <>
      <motion.div
        className="max-w-5xl text-center space-y-12 w-full relative z-10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div
          className="space-y-6 sm:space-y-8 flex flex-col items-center"
          variants={fadeIn}
        >
          {/* HOÀNH PHI TRUYỀN THỐNG */}
          <motion.div 
            variants={fadeIn} 
            className="w-full flex justify-center mb-4 sm:mb-8"
          >
            <div className="relative p-2.5 md:p-3.5 bg-gradient-to-tr from-[#bd954d] via-[#e2c78d] to-[#d3b47c] shadow-[0_10px_30px_-10px_rgba(189,149,77,0.5)] rounded-sm w-full max-w-[400px] md:max-w-[550px] aspect-[4/1]">
              <div className="w-full h-full bg-[#fcebc0] border border-[#bd954d]/40 flex items-center justify-center shadow-inner relative overflow-hidden">
                {/* Viền trang trí mờ bên trong */}
                <div className="absolute inset-1 border border-[#bd954d]/20"></div>
                
                <h2 className="font-serif font-bold text-4xl md:text-5xl lg:text-[3.5rem] text-[#926e2a] drop-shadow-[2px_2px_3px_rgba(0,0,0,0.15)] tracking-widest relative z-10">
                  Họ Nguyễn Thiệu
                </h2>
              </div>
              
              {/* Trang trí góc khung */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#fcebc0]/60"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#fcebc0]/60"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#fcebc0]/60"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#fcebc0]/60"></div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-amber-800 bg-white/60 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-amber-200/50 relative overflow-hidden group"
          >
            <Sparkles className="size-4 text-amber-500" />
            Nền tảng gia phả hiện đại & bảo mật
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-serif font-bold tracking-tight leading-[1.1] max-w-4xl">
            <span className="block text-stone-900">Gia Phả</span>
            <span className="block text-amber-700">Dòng họ Nguyễn Thiệu</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-light">
            Gìn giữ và lưu truyền những giá trị, cội nguồn và truyền thống tốt
            đẹp của dòng họ cho các thế hệ mai sau.
          </p>
        </motion.div>

        <motion.div
          className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center w-full px-4 sm:px-0 relative"
