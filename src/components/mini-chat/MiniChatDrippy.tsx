import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ChatPage from '@/pages/ChatPage';
export function MiniChatDrippy() {
  const [isOpen, setIsOpen] = useState(false);
  return <>
    {/* Floating Button */}
    <AnimatePresence>
      {!isOpen && <motion.div initial={{
        scale: 0,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} exit={{
        scale: 0,
        opacity: 0
      }} className="fixed bottom-4 right-4 z-50">

      </motion.div>}
    </AnimatePresence>

    {/* Chat Dialog */}
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden bg-background/80 backdrop-blur-2xl border-border/20 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Chat</DialogTitle>
        <ChatPage />
      </DialogContent>
    </Dialog>
  </>;
}