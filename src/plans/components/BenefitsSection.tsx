import React from 'react';
import { Zap, Shield, Users, Award } from 'lucide-react';

// Mapeamento dos ícones disponíveis
const ICONES = {
  Zap,
  Shield, 
  Users,
  Award
};

interface Vantagem {
  icone: keyof typeof ICONES;
  titulo: string;
  descricao: string;
}

interface BenefitsSectionProps {
  mostrar: boolean;
  titulo: string;
  subtitulo: string;
  vantagens: Vantagem[];
}

export const BenefitsSection = ({ mostrar, titulo, subtitulo, vantagens }: BenefitsSectionProps) => {
  if (!mostrar) return null;

  return (
    <section className="animate-fade-in-up w-full" style={{ animationDelay: '0.2s' }}>
      {/* Container centralizado com largura máxima */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da seção - centralizado */}
        <div className="text-center mb-16">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            {titulo}
          </h3>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {subtitulo}
          </p>
        </div>
        
        {/* Grid de benefícios - centralizado e responsivo */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12 max-w-6xl">
            {vantagens.map((vantagem, index) => {
              const IconeComponente = ICONES[vantagem.icone];
              
              return (
                <div 
                  key={index}
                  className="text-center group hover:scale-105 transition-all duration-300 flex flex-col items-center"
                >
                  {/* Ícone centralizado */}
                  <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors shadow-lg">
                    <IconeComponente className="h-10 w-10 text-primary" />
                  </div>
                  
                  {/* Título centralizado */}
                  <h4 className="text-xl font-semibold mb-3 text-foreground text-center">
                    {vantagem.titulo}
                  </h4>
                  
                  {/* Descrição centralizada */}
                  <p className="text-muted-foreground text-center leading-relaxed max-w-xs">
                    {vantagem.descricao}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};