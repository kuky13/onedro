import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, Plus, Home, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface IOSInstallInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <DialogTitle className="text-center text-xl font-bold text-gray-900 mb-2">
            Instalar One Drip
          </DialogTitle>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <img 
                src="https://kukusolutions.s-ul.eu/1yO1jl0t" 
                alt="One Drip" 
                className="w-10 h-10 rounded-lg"
              />
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 px-2">
          <p className="text-center text-sm text-gray-600">
            Instale o One Drip como um app nativo no seu iPhone para uma experiência completa
          </p>
          
          <div className="space-y-4">
            <motion.div 
              className="flex items-start space-x-4 p-3 bg-blue-50 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Toque no botão Compartilhar
                </p>
                <div className="flex items-center space-x-2">
                  <Share className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-600">Na parte inferior da tela do Safari</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start space-x-4 p-3 bg-green-50 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Adicionar à Tela Inicial
                </p>
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-600">Role para baixo e toque nesta opção</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start space-x-4 p-3 bg-purple-50 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Confirmar instalação
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Toque em "Adicionar" para finalizar</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center space-x-3">
              <Home className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Pronto! 🎉
                </p>
                <p className="text-xs text-gray-600">
                  O One Drip aparecerá na sua tela inicial como um app nativo
                </p>
              </div>
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <Button 
              onClick={onClose} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all duration-300"
            >
              Entendi, vou instalar!
            </Button>
            
            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
            >
              Talvez mais tarde
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};