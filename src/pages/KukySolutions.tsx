import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Globe, Heart, Users, Target, Eye, Github, Instagram, Award, Sparkles, Zap, ArrowLeft, CheckCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

// ========================================
// CONFIGURAÇÕES EDITÁVEIS - EDITE AQUI!
// ========================================

const COMPANY_INFO = {
  name: "KukySolutions",
  tagline: "Desenvolvendo ideias, Entregando soluções",
  description: "Somos uma empresa especializada em desenvolvimento de soluções tecnológicas personalizadas e suporte técnico. Nossa missão é transformar ideias em realidade, oferecendo serviços de alta qualidade que impulsionam o crescimento dos nossos clientes.",
  founded: "2023",
  location: "Brasil",
  employees: "1"
};
const COMPANY_STORY: { title: string; content: string[] } = {
  title: "Nossa História",
  content: [],
};
const CREATOR_INFO = {
  name: "André Ribeiro Lima",
  role: "Fundador & CEO",
  bio: "Uma pessoa que ama fotografia e tecnologias no geral.",
  vision: "Eu já pensei em desistir, mas pensei bem tô aqui.",
  achievements: ["Sou técnico em reparo de celulares com mais de 3mil aparelhos reparados", "Web designer e desenvolvedor de websites", "Filmaker e Editor de videos"]
};
const MISSION_VISION = {
  mission: "Desenvolver soluções tecnológicas inovadoras e acessíveis que transformem a forma como as empresas operam, sempre priorizando a experiência do usuário e a eficiência dos processos.",
  vision: "Ser reconhecida como a principal referência em soluções tecnológicas personalizadas no Brasil, contribuindo para o crescimento e digitalização de empresas de todos os portes.",
  values: ["Inovação constante", "Qualidade sem compromissos", "Transparência em todas as relações", "Foco no cliente", "Responsabilidade social"]
};
const CONTACT_INFO = {
  email: "kuky.png@gmail.com",
  phone: "+55 (64) 99602-8022",
  address: "Mineiros, GO - Brasil",
  website: "https://kuky.pro",
  cnpj: "64.797.431/0001-03",
  social: {
    github: "https://github.com/kuky13",
    instagram: "https://www.instagram.com/kuky.png"
  }
};

// ========================================
// COMPONENTE PRINCIPAL - PORTFÓLIO PROFISSIONAL
// ========================================

const KukySolutions = () => {
  return <div className="min-h-screen bg-background">
      {/* Header - Mobile First */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm lg:text-base">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/kukysolutions-logo.svg" alt="KukySolutions" className="h-7 w-7 lg:h-9 lg:w-9" />
            <span className="font-bold text-lg lg:text-xl text-foreground">{COMPANY_INFO.name}</span>
          </div>
          <div className="w-16" /> {/* Spacer para centralizar */}
        </div>
      </header>

      {/* Hero Section - Mobile First */}
      <section className="px-4 lg:px-8 pt-8 lg:pt-20 pb-6 lg:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="flex justify-center mb-4 lg:mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              
              <span className="text-xs lg:text-sm font-medium text-primary">Fundada em {COMPANY_INFO.founded}</span>
            </div>
          </div>

          {/* Logo Grande */}
          <div className="mb-6 lg:mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <img src="/kukysolutions-logo.svg" alt="KukySolutions Logo" className="relative w-24 h-24 lg:w-32 lg:h-32 object-contain" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-3 lg:mb-6 leading-tight">
            {COMPANY_INFO.name}
          </h1>

          {/* Tagline */}
          <p className="text-primary text-lg lg:text-2xl font-medium mb-4 lg:mb-6">
            {COMPANY_INFO.tagline}
          </p>

          {/* Descrição */}
          <p className="text-muted-foreground text-sm lg:text-lg mb-6 lg:mb-8 max-w-2xl mx-auto">
            {COMPANY_INFO.description}
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
              <MapPin className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-primary" />
              <span className="text-xs lg:text-sm text-muted-foreground">{COMPANY_INFO.location}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
              <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-primary" />
              <span className="text-xs lg:text-sm text-muted-foreground">{COMPANY_INFO.employees} funcionário</span>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Quem Somos */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <h2 className="text-xl lg:text-3xl font-bold text-foreground">Quem Somos</h2>
          </div>
          <p className="text-sm lg:text-lg text-muted-foreground leading-relaxed">
            {COMPANY_INFO.description}
          </p>
        </div>
      </section>

      {/* Seção: Nossa História */}
      <section className="px-4 lg:px-8 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <h2 className="text-xl lg:text-3xl font-bold text-foreground">{COMPANY_STORY.title}</h2>
          </div>
          <div className="space-y-4">
            {COMPANY_STORY.content.map((paragraph, index) => <p key={index} className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                {paragraph}
              </p>)}
          </div>
        </div>
      </section>

      {/* Seção: Sobre o Criador */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <h2 className="text-xl lg:text-3xl font-bold text-foreground">Sobre o Criador</h2>
          </div>

          <div className="space-y-6">
            {/* Info do Criador */}
            <div>
              <h3 className="text-lg lg:text-2xl font-bold text-foreground mb-2">{CREATOR_INFO.name}</h3>
              <span className="inline-block px-3 py-1 text-xs lg:text-sm font-medium bg-primary text-primary-foreground rounded-full">
                {CREATOR_INFO.role}
              </span>
            </div>

            <p className="text-sm lg:text-lg text-muted-foreground">
              {CREATOR_INFO.bio}
            </p>

            {/* Citação */}
            <blockquote className="border-l-4 border-primary pl-4 lg:pl-6 py-3 lg:py-4 italic text-foreground/90 bg-primary/5 rounded-r-xl">
              "{CREATOR_INFO.vision}"
            </blockquote>

            {/* Conquistas */}
            <div>
              <h4 className="text-base lg:text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Award className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                Principais Conquistas
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {CREATOR_INFO.achievements.map((achievement, index) => <div key={index} className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{achievement}</span>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Missão e Visão */}
      <section className="px-4 lg:px-8 py-8 lg:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Missão */}
            <div className="bg-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-border/30 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3 lg:mb-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
                <h3 className="text-lg lg:text-2xl font-bold text-foreground">Nossa Missão</h3>
              </div>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                {MISSION_VISION.mission}
              </p>
            </div>

            {/* Visão */}
            <div className="bg-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-border/30 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3 lg:mb-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
                <h3 className="text-lg lg:text-2xl font-bold text-foreground">Nossa Visão</h3>
              </div>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                {MISSION_VISION.vision}
              </p>
            </div>
          </div>

          {/* Valores */}
          <div className="bg-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-border/30">
            <div className="flex items-center gap-3 mb-4 lg:mb-6">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
              <h3 className="text-lg lg:text-2xl font-bold text-foreground">Nossos Valores</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {MISSION_VISION.values.map((value, index) => <div key={index} className="flex items-center gap-2 p-3 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{value}</span>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Contato */}
      <section className="px-4 lg:px-8 py-8 lg:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <h2 className="text-xl lg:text-3xl font-bold text-foreground">Entre em Contato</h2>
          </div>

          {/* Info de Contato */}
          <div className="grid sm:grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">Email</p>
                <p className="text-xs lg:text-sm text-muted-foreground break-all">{CONTACT_INFO.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">Telefone</p>
                <p className="text-xs lg:text-sm text-muted-foreground">{CONTACT_INFO.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">Localização</p>
                <p className="text-xs lg:text-sm text-muted-foreground">{CONTACT_INFO.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">Website</p>
                <a href={CONTACT_INFO.website} target="_blank" rel="noopener noreferrer" className="text-xs lg:text-sm text-primary hover:underline">
                  {CONTACT_INFO.website}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">CNPJ</p>
                <p className="text-xs lg:text-sm text-muted-foreground">{CONTACT_INFO.cnpj}</p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Siga-nos nas redes sociais</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="lg" className="gap-2 border-border hover:border-primary hover:bg-primary/10" onClick={() => window.open(CONTACT_INFO.social.github, '_blank')}>
                <Github className="h-5 w-5" />
                GitHub
              </Button>
              <Button variant="outline" size="lg" className="gap-2 border-border hover:border-primary hover:bg-primary/10" onClick={() => window.open(CONTACT_INFO.social.instagram, '_blank')}>
                <Instagram className="h-5 w-5" />
                Instagram
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 lg:px-8 py-10 lg:py-20 bg-primary/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 lg:mb-6">
            <Zap className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
          </div>
          <h2 className="text-xl lg:text-3xl font-bold text-foreground mb-2 lg:mb-4">
            Pronto para Transformar suas Ideias em Realidade?
          </h2>
          <p className="text-sm lg:text-lg text-muted-foreground mb-6 lg:mb-8 max-w-lg mx-auto">
            Entre em contato conosco e descubra como podemos ajudar sua empresa a crescer com tecnologia de ponta.
          </p>
          <Button size="lg" className="h-12 lg:h-14 px-6 lg:px-8 text-base lg:text-lg font-semibold bg-primary hover:bg-primary/90" onClick={() => window.open(`mailto:${CONTACT_INFO.email}`, '_blank')}>
            <Mail className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
            Entrar em Contato
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 lg:px-8 py-6 lg:py-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img src="/kukysolutions-logo.svg" alt="KukySolutions" className="h-6 w-6" />
            <span className="text-sm text-muted-foreground">{COMPANY_INFO.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">CNPJ: {CONTACT_INFO.cnpj}</p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY_INFO.name}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>;
};
export default KukySolutions;
