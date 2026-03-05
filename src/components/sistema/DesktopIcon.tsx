import { motion } from 'framer-motion';

interface DesktopIconProps {
  icon: any;
  label: string;
  onClick: () => void;
}

export function DesktopIcon({ icon: Icon, label, onClick }: DesktopIconProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-transform duration-200 ease-out group"
    >
      <div className="h-10 w-10 bg-primary/10 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-lg ring-1 ring-primary/20 border border-border/50">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-[11px] text-primary-foreground text-center font-medium drop-shadow-lg truncate w-full">
        {label}
      </span>
    </motion.button>
  );
}
