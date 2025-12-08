"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function FloatingToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide on scroll down, show on scroll up
    let lastScroll = 0;
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScroll && currentScroll > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScroll = currentScroll;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tools = [
    {
      icon: "💬",
      label: "Chat",
      href: "/contact",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      icon: "🚚",
      label: "Track Order",
      href: "/account/orders/",
      color: "bg-teal-500 hover:bg-teal-600",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-24 right-4 z-50 md:block hidden"
        >
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3"
            >
              {tools.map((tool, index) => (
                <motion.a
                  key={tool.label}
                  href={tool.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group relative"
                >
                  <span className="text-2xl">{tool.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{tool.label}</span>
                  {tool.badge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {tool.badge}
                    </motion.span>
                  )}
                </motion.a>
              ))}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-2 pt-2 border-t border-gray-200 text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-shadow"
              aria-label="Open quick tools"
            >
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                +
              </motion.span>
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

