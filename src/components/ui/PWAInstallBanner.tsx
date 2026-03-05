// @ts-nocheck
import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, Share2 } from 'lucide-react';
import { usePWASimple } from '@/hooks/usePWASimple';
import { GlassCard } from '@/components/ui/animations/micro-interactions';
import { motion, AnimatePresence } from 'framer-motion';
export const PWAInstallBanner = () => {
  const {
    isInstalled,
    isInstalling,
    platform,
    promptAvailable,
    isDismissed,
    returnedFromShare,
    installApp,
    dismissForDays
  } = usePWASimple();
  const [showOverlay, setShowOverlay] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showSecondStep, setShowSecondStep] = useState(false);
  const isIOS = platform === 'ios';
  const isDesktop = platform === 'desktop';

  // Detectar quando usuário volta do share sheet no iOS
  useEffect(() => {
    if (returnedFromShare && showOverlay && isIOS) {
      setShowSecondStep(true);
    }
  }, [returnedFromShare, showOverlay, isIOS]);
  const handleClick = async () => {
    // iOS: mostrar overlay apontando para o share
    if (isIOS) {
      setShowOverlay(true);
      setShowSecondStep(false);
      return;
    }

    // Android/Desktop: tentar instalação automática
    if (promptAvailable) {
      const result = await installApp();
      if (result.success) {
        setInstallSuccess(true);
        setTimeout(() => setLocalDismissed(true), 2000);
      } else if (result.requiresInstructions) {
        setShowOverlay(true);
      }
    } else {
      setShowOverlay(true);
    }
  };
  const handleDismiss = () => {
    setShowOverlay(false);
    setLocalDismissed(true);
    dismissForDays();
  };

  // Não mostrar se já instalado, fechado ou dismissado
  if (isInstalled || localDismissed || isDismissed) return null;
  return <>
      <div className="flex justify-end mb-6">
        
      </div>

      {/* Overlay de instalação iOS ultra-simplificado */}
      <AnimatePresence>
        {showOverlay && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 z-[9999]" onClick={() => setShowOverlay(false)}>
            {/* Fundo escuro */}
            <div className="absolute inset-0 bg-black/95" />

            {isIOS ? <>
                {/* Conteúdo iOS - UMA única instrução */}
                <motion.div initial={{
            opacity: 0,
            y: -20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.15
          }} className="absolute inset-x-0 top-[30%] flex flex-col items-center px-6" onClick={e => e.stopPropagation()}>
                  <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 text-center max-w-xs shadow-2xl">
                    {/* Ícone */}
                    <motion.div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg" animate={{
                scale: [1, 1.05, 1]
              }} transition={{
                repeat: Infinity,
                duration: 2
              }}>
                      <Share2 className="h-8 w-8 text-white" />
                    </motion.div>
                    
                    {!showSecondStep ? <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Toque no ícone
                        </h3>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </span>
                          <span className="text-gray-600 text-sm">na barra abaixo</span>
                        </div>
                      </> : <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Agora toque em
                        </h3>
                        <div className="bg-gray-100 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-semibold text-gray-800">Tela de Início</span>
                          </div>
                        </div>
                      </>}
                  </div>
                </motion.div>

                {/* Seta animada apontando para o share (centro-inferior) */}
                {!showSecondStep && <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <motion.svg animate={{
              y: [0, 16, 0]
            }} transition={{
              repeat: Infinity,
              duration: 1,
              ease: "easeInOut"
            }} className="w-14 h-14 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </motion.svg>
                    
                    {/* Destaque pulsante no botão share */}
                    <motion.div animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 1, 0.6]
            }} transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut"
            }} className="mt-2 w-16 h-16 rounded-full border-4 border-blue-400/80 bg-blue-500/20 backdrop-blur-sm" />
                  </motion.div>}
              </> : (/* Desktop/Android: Instrução simples */
        <motion.div initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="absolute inset-0 flex items-center justify-center p-6" onClick={e => e.stopPropagation()}>
                <div className="bg-background rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Download className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    Instalar One Drip
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {platform === 'desktop' ? 'Clique no ícone ⬇ na barra de endereços do navegador' : 'Toque em ⋮ no menu e selecione "Instalar app"'}
                  </p>
                  <button onClick={() => setShowOverlay(false)} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium">
                    Entendi
                  </button>
                </div>
              </motion.div>)}

            {/* Botão fechar (X) */}
            <button onClick={e => {
          e.stopPropagation();
          handleDismiss();
        }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Texto "Toque para fechar" */}
            <motion.p initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.8
        }} className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              Toque para fechar
            </motion.p>
          </motion.div>}
      </AnimatePresence>
    </>;
};