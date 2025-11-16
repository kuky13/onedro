import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Globe, Heart, Users, Target, Eye, Calendar } from "lucide-react";

// ========================================
// CONFIGURAÇÕES EDITÁVEIS - EDITE AQUI!
// ========================================

const COMPANY_INFO = {
  name: "KukySolutions",
  tagline: "Soluções Inovadoras",
  description: "Somos uma empresa especializada em desenvolvimento de software e soluções tecnológicas personalizadas. Nossa missão é transformar ideias em realidade digital, oferecendo produtos de alta qualidade que impulsionam o crescimento dos nossos clientes.",
  founded: "2023",
  location: "Brasil",
  employees: "1"
};

const COMPANY_STORY = {
  title: "Nossa História",
  content: [
    "A KukySolutions foi criada por André Ribeiro Lima para implementar soluçoes q fazem a diferença na vida das pessoas e empresas.",
    "Fundada em 2023, começamos como uma pequena startup com grandes sonhos. Nosso primeiro projeto foi um sistema de gestão para pequenas empresas locais, que rapidamente ganhou reconhecimento pela sua simplicidade e eficiência.",
    "Ao longo dos anos, expandimos nossos serviços e hoje atendemos clientes de diversos segmentos, sempre mantendo nosso compromisso com a qualidade e inovação.",
    "Nossa jornada é marcada por parcerias sólidas, projetos desafiadores e a constante busca pela excelência em tudo que fazemos."
  ]
};

const CREATOR_INFO = {
  name: "André Ribeiro Lima",
  role: "Fundador & CEO",
  bio: "Uma pessoa q ama fotografia e tecnologias no geral.",
  vision: "Acredito q todos possam ter acesso a soluções tecnológicas de qualidade.",
  achievements: [
    "Sou técnico em reparo de celulares com mais de 3mil aparelhos reparados",
    "Sou editor de videos web designer"
  ]
};

const MISSION_VISION = {
  mission: "Desenvolver soluções tecnológicas inovadoras e acessíveis que transformem a forma como as empresas operam, sempre priorizando a experiência do usuário e a eficiência dos processos.",
  vision: "Ser reconhecida como a principal referência em soluções tecnológicas personalizadas no Brasil, contribuindo para o crescimento e digitalização de empresas de todos os portes.",
  values: [
    "Inovação constante",
    "Qualidade sem compromissos",
    "Transparência em todas as relações",
    "Foco no cliente",
    "Responsabilidade social"
  ]
};

const CONTACT_INFO = {
  email: "kuky.png@gmail.com",
  phone: "+55 (64) 999489175",
  address: "Mibwieros, GO - Brasil",
  website: "kuky.pro",
  social: {
    github: "github.com/kuky13",
    instagram: "@kuky.png"
  }
};

// ========================================
// COMPONENTE PRINCIPAL - NÃO EDITAR
// ========================================

const KukySolutions = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        {/* Background com gradiente aprimorado e efeitos */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent"></div>
        </div>
        
        {/* Conteúdo do header */}
        <div className="relative text-center py-20 px-4">
          {/* Logo com animação e efeitos aprimorados */}
          <div className="mb-10">
            <div className="w-28 h-28 mx-auto relative group">
              {/* Anel de brilho animado */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/30 to-purple-600/30 blur-md group-hover:blur-lg transition-all duration-500" style={{animation: 'gentle-pulse 3s ease-in-out infinite'}}></div>
              
              <style jsx>{`
                @keyframes gentle-pulse {
                  0%, 100% {
                    opacity: 0.6;
                    transform: scale(1);
                  }
                  50% {
                    opacity: 1;
                    transform: scale(1.05);
                  }
                }
              `}</style>
              
              {/* Logo principal */}
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border border-gray-800 group-hover:border-purple-500/50 transition-all duration-300">
                <img 
                  src="/lovable-uploads/k.png" 
                  alt="KukySolutions Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          
          {/* Título com efeitos aprimorados */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent mb-4 sm:mb-6 tracking-tight sm:tracking-normal">
            {COMPANY_INFO.name}
          </h1>
          
          {/* Tagline com melhor tipografia */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            {COMPANY_INFO.tagline}
          </p>
          
          {/* Informações da empresa com design aprimorado */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-gray-400">
            <div className="flex items-center bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
              <Calendar className="w-5 h-5 mr-3 text-yellow-400" />
              <span className="text-sm md:text-base">Fundada em {COMPANY_INFO.founded}</span>
            </div>
            <div className="flex items-center bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
              <MapPin className="w-5 h-5 mr-3 text-yellow-400" />
              <span className="text-sm md:text-base">{COMPANY_INFO.location}</span>
            </div>
            <div className="flex items-center bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
              <Users className="w-5 h-5 mr-3 text-yellow-400" />
              <span className="text-sm md:text-base">{COMPANY_INFO.employees} funcionário</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Sobre a Empresa */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-primary" />
              Quem Somos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {COMPANY_INFO.description}
            </p>
          </CardContent>
        </Card>

        {/* Nossa História */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Heart className="h-6 w-6 text-primary" />
              {COMPANY_STORY.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {COMPANY_STORY.content.map((paragraph, index) => (
              <p key={index} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* Sobre o Criador */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-primary" />
              Sobre o Criador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">{CREATOR_INFO.name}</h3>
              <Badge className="mb-4">{CREATOR_INFO.role}</Badge>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {CREATOR_INFO.bio}
              </p>
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                "{CREATOR_INFO.vision}"
              </blockquote>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Principais Conquistas:</h4>
              <ul className="space-y-2">
                {CREATOR_INFO.achievements.map((achievement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Missão, Visão e Valores */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Nossa Missão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {MISSION_VISION.mission}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Nossa Visão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {MISSION_VISION.vision}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Valores */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Nossos Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MISSION_VISION.values.map((value, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Mail className="h-6 w-6 text-primary" />
              Entre em Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.phone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Localização</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Website</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.website}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t">
              <p className="text-center text-muted-foreground mb-4">
                Siga-nos nas redes sociais:
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="sm">
                  GitHub
                </Button>
                <Button variant="outline" size="sm">
                  Instagram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KukySolutions;