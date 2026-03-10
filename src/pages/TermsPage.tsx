// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  Users,
  Shield,
  AlertTriangle,
  CreditCard,
  Gavel,
  Mail,
  Phone,
  MessageSquare,
  Lock,
  RefreshCw,
  Globe,
  CheckCircle } from
"lucide-react";
import { useNavigate } from "react-router-dom";

export const TermsPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-primary/15 to-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Main Content */}
        <Card className="backdrop-blur-sm bg-card/95 border-primary/20">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Termos de Uso e Licença de Software
            </CardTitle>
            <p className="text-muted-foreground mt-2">OneDrip - Última atualização de contrato: 01 de março de 2026

            </p>
            <p className="text-sm text-muted-foreground mt-1">KukySolutions™ | onedrip.com.br</p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Aviso Importante */}
            <section className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
              <p className="text-sm text-destructive font-medium text-center">
                IMPORTANTE: LEIA CUIDADOSAMENTE ESTES TERMOS ANTES DE INSTALAR OU USAR ESTE SITE/SOFTWARE.
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ao instalar, copiar ou usar de qualquer forma este software, você concorda em ficar vinculado aos termos
                e condições desta licença. Se você não concordar com estes termos, não instale nem use o software.
              </p>
            </section>

            {/* 1. Aceitação dos Termos */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                1. Aceitação dos Termos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e utilizar o sistema OneDrip, desenvolvido por André Ribeiro Lima (KukySolutions™), você
                concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte
                destes termos, não deve utilizar nossos serviços.
              </p>
            </section>

            {/* 2. Definições */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                2. Definições
              </h2>
              <div className="space-y-3">
                <div>
                  <strong className="text-foreground">Sistema/Plataforma:</strong>
                  <span className="text-muted-foreground ml-2">
                    O software OneDrip e todos os seus componentes, funcionalidades e serviços relacionados.
                  </span>
                </div>
                <div>
                  <strong className="text-foreground">Usuário/Licenciado:</strong>
                  <span className="text-muted-foreground ml-2">
                    Pessoa física ou jurídica que utiliza o sistema mediante licença válida.
                  </span>
                </div>
                <div>
                  <strong className="text-foreground">Proprietário/Prestador:</strong>
                  <span className="text-muted-foreground ml-2">
                    André Ribeiro Lima (KukySolutions™), desenvolvedor e proprietário do sistema.
                  </span>
                </div>
                <div>
                  <strong className="text-foreground">Cliente Autorizado:</strong>
                  <span className="text-muted-foreground ml-2">
                    Usuário que adquiriu licença válida para uso do software.
                  </span>
                </div>
                <div>
                  <strong className="text-foreground">Conteúdo:</strong>
                  <span className="text-muted-foreground ml-2">
                    Todas as informações, dados, textos, imagens e materiais inseridos no sistema.
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Concessão de Licença */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                3. Concessão de Licença
              </h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  A KukySolutions™ concede a você uma licença de uso limitada, não exclusiva e pessoal para utilizar o
                  software OneDrip de acordo com os termos desta licença.
                </p>
                <div>
                  <h3 className="font-medium mb-2">3.1 Condições da Licença</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Licença pessoal, não exclusiva e intransferível</li>
                    <li>Limitada ao território brasileiro</li>
                    <li>O uso comercial requer licenciamento específico</li>
                    <li>Válida enquanto mantida a assinatura ativa</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">3.2 Restrições Absolutas</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Não copiar, modificar ou distribuir o sistema</li>
                    <li>Não fazer engenharia reversa ou tentar acessar o código-fonte</li>
                    <li>Não sublicenciar ou transferir seus direitos de uso</li>
                    <li>Não usar o sistema para fins ilegais ou não autorizados</li>
                    <li>Não sobrecarregar ou interferir na operação do sistema</li>
                    <li>Não comercializar sem autorização expressa por escrito</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Responsabilidades do Usuário */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                4. Responsabilidades do Usuário
              </h2>
              <p className="text-muted-foreground mb-4">Como usuário do sistema, você se compromete a:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Utilizar o Software conforme sua finalidade original</li>
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Respeitar todos os direitos de propriedade intelectual</li>
                <li>Manter a integridade dos dados e funcionalidades do sistema</li>
                <li>Utilizar o Software de forma ética e responsável</li>
                <li>Preservar todas as informações de identificação e propriedade</li>
                <li>Reportar problemas de segurança ou uso indevido</li>
              </ul>
            </section>

            {/* 5. Fórum de Compartilhamento de Soluções */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                5. Fórum de Compartilhamento de Soluções
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">5.1 Responsabilidade do Conteúdo</h3>
                  <p className="text-muted-foreground mb-2">
                    Ao participar do fórum de compartilhamento de soluções, você concorda que:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>É inteiramente responsável pelo conteúdo que postar ou compartilhar</li>
                    <li>Não compartilhará informações confidenciais de clientes sem autorização</li>
                    <li>Respeitará os direitos de propriedade intelectual de terceiros</li>
                    <li>Não publicará conteúdo ofensivo, difamatório ou inadequado</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">5.2 Licença de Conteúdo</h3>
                  <p className="text-muted-foreground">
                    Ao postar soluções ou informações no fórum, você concede à KukySolutions™ e outros usuários uma
                    licença não exclusiva para usar, reproduzir e distribuir seu conteúdo dentro da plataforma.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">5.3 Moderação</h3>
                  <p className="text-muted-foreground">
                    A KukySolutions™ reserva-se o direito de moderar, editar ou remover qualquer conteúdo postado no
                    fórum sem aviso prévio.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Privacidade e Proteção de Dados */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                6. Privacidade e Proteção de Dados
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">6.1 Coleta de Dados</h3>
                  <p className="text-muted-foreground">
                    O Software pode coletar informações técnicas sobre dispositivos analisados e dados de uso para
                    melhorar o serviço. Informações pessoais de clientes não são coletadas sem consentimento.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">6.2 Proteção de Dados do Cliente</h3>
                  <p className="text-muted-foreground">
                    Você concorda em manter a confidencialidade de todos os dados de clientes acessados através do
                    Software e não divulgá-los sem autorização. O tratamento de dados pessoais segue as diretrizes da
                    Lei Geral de Proteção de Dados (LGPD).
                  </p>
                </div>
              </div>
            </section>

            {/* 7. Propriedade Intelectual */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                7. Propriedade Intelectual
              </h2>
              <p className="text-muted-foreground mb-4">
                Todos os direitos de propriedade intelectual relacionados ao Software são de titularidade exclusiva de
                André Ribeiro Lima (KukySolutions™). Esta licença concede apenas direitos de uso limitados conforme
                especificado, incluindo mas não limitado a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Código-fonte, algoritmos e arquitetura do sistema</li>
                <li>Design, interface e experiência do usuário</li>
                <li>Marca, logotipos e identidade visual</li>
                <li>Documentação técnica e materiais de treinamento</li>
                <li>Metodologias e processos desenvolvidos</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Estes estão protegidos pelas leis de direitos autorais e propriedade intelectual brasileiras.
              </p>
            </section>

            {/* 8. Disponibilidade do Serviço */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                8. Disponibilidade do Serviço
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">8.1 Uptime e Manutenção</h3>
                  <p className="text-muted-foreground">
                    Nos esforçamos para manter o sistema disponível 24/7, mas não garantimos disponibilidade
                    ininterrupta. Manutenções programadas serão comunicadas com antecedência.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">8.2 Interrupções</h3>
                  <p className="text-muted-foreground">
                    Não nos responsabilizamos por interrupções causadas por fatores externos, como falhas de internet,
                    problemas de infraestrutura ou casos de força maior.
                  </p>
                </div>
              </div>
            </section>

            {/* 9. Pagamentos e Cobrança */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                9. Pagamentos e Cobrança
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">9.1 Taxas e Pagamentos</h3>
                  <p className="text-muted-foreground">
                    Os valores e condições de pagamento estão especificados no plano contratado. Pagamentos devem ser
                    realizados nas datas acordadas.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">9.2 Atraso no Pagamento</h3>
                  <p className="text-muted-foreground">
                    O atraso no pagamento pode resultar na suspensão temporária ou cancelamento do acesso ao sistema,
                    conforme especificado no contrato.
                  </p>
                </div>
              </div>
            </section>

            {/* 10. Política de Reembolso */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                10. Política de Reembolso
              </h2>
              <p className="text-muted-foreground mb-4">
                Esta Política de Reembolso faz parte dos Termos de Uso do nosso site. Ao contratar nossos serviços ou
                adquirir nossos produtos, o usuário declara estar ciente e de acordo com as condições abaixo.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">10.1 Direito de Arrependimento</h3>
                  <p className="text-muted-foreground mb-2">
                    Conforme o artigo 49 do Código de Defesa do Consumidor, em compras realizadas pela internet o
                    usuário pode desistir da contratação no prazo de até 7 (sete) dias corridos, a contar da data da
                    aquisição.
                  </p>
                  <p className="text-muted-foreground">
                    Nesse caso, o reembolso será integral do valor pago, sem qualquer desconto.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">10.2 Reembolsos Após o Prazo de Arrependimento</h3>
                  <p className="text-muted-foreground mb-2">
                    Passado o prazo legal de 7 dias, pedidos de reembolso poderão ser aceitos a critério da empresa,
                    observadas as seguintes condições:
                  </p>
                  <p className="text-muted-foreground mb-2">
                    O valor será devolvido ao usuário descontadas as taxas administrativas cobradas pelo intermediador
                    de pagamento (Mercado Pago), atualmente equivalentes a 4,99% do valor da transação.
                  </p>
                  <p className="text-muted-foreground">
                    O prazo para processamento do reembolso pode variar conforme a forma de pagamento utilizada, podendo
                    levar até 30 dias úteis, dependendo das políticas das operadoras de cartão de crédito e instituições
                    financeiras.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">10.3 Forma de Reembolso</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>
                      <strong>Cartão de crédito:</strong> o estorno será solicitado diretamente à operadora do cartão e
                      poderá aparecer em até duas faturas subsequentes.
                    </li>
                    <li>
                      <strong>PIX ou boleto bancário:</strong> o valor será devolvido diretamente na conta bancária
                      indicada pelo usuário, dentro do prazo informado acima.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">10.4 Casos Não Reembolsáveis</h3>
                  <p className="text-muted-foreground mb-2">Não haverá reembolso em casos de:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Uso indevido da plataforma por parte do usuário</li>
                    <li>Descumprimento dos Termos de Uso</li>
                    <li>Serviços já prestados em sua totalidade</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 11. Isenção de Garantias */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                11. Isenção de Garantias
              </h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-muted-foreground text-sm uppercase font-medium">
                  O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS,
                  INCLUINDO, MAS NÃO SE LIMITANDO A, GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E
                  NÃO VIOLAÇÃO.
                </p>
              </div>
            </section>

            {/* 12. Limitação de Responsabilidade */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                12. Limitação de Responsabilidade
              </h2>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-muted-foreground text-sm uppercase font-medium">
                    EM NENHUMA CIRCUNSTÂNCIA A KUKYSOLUTIONS™ SERÁ RESPONSÁVEL POR DANOS DIRETOS, INDIRETOS,
                    INCIDENTAIS, ESPECIAIS OU CONSEQUENCIAIS RESULTANTES DO USO OU INCAPACIDADE DE USAR O SOFTWARE.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">12.1 Limitação de Danos</h3>
                  <p className="text-muted-foreground">
                    Nossa responsabilidade por danos diretos ou indiretos está limitada ao valor pago pelo usuário nos
                    últimos 12 meses, exceto em casos de dolo ou culpa grave.
                  </p>
                </div>
              </div>
            </section>

            {/* 13. Rescisão */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                13. Rescisão
              </h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">Esta licença é efetiva até ser rescindida.</p>
                <div>
                  <h3 className="font-medium mb-2">13.1 Rescisão pelo Usuário</h3>
                  <p className="text-muted-foreground">
                    Você pode rescindi-la a qualquer momento cessando o uso do Software, observando o prazo de aviso
                    prévio especificado no contrato.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">13.2 Rescisão pelo Prestador</h3>
                  <p className="text-muted-foreground">
                    A KukySolutions™ pode rescindir esta licença imediatamente em caso de violação dos termos,
                    inadimplência ou uso inadequado do sistema.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">13.3 Efeitos da Rescisão</h3>
                  <p className="text-muted-foreground">
                    Após a rescisão, seu acesso será suspenso e seus dados poderão ser removidos conforme nossa política
                    de retenção de dados.
                  </p>
                </div>
              </div>
            </section>

            {/* 14. Legislação Aplicável e Foro */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                14. Legislação Aplicável e Foro
              </h2>
              <p className="text-muted-foreground">
                Esta licença é regida pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais competentes
                do Brasil, especificamente no foro da Comarca de Goiânia/GO, com renúncia expressa a qualquer outro
                foro, por mais privilegiado que seja.
              </p>
            </section>

            {/* 15. Atualizações e Modificações */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                15. Atualizações e Modificações
              </h2>
              <p className="text-muted-foreground">
                A KukySolutions™ reserva-se o direito de modificar estes termos a qualquer momento. Alterações
                significativas serão comunicadas com antecedência de 30 dias. O uso continuado do sistema após as
                alterações constitui aceitação dos novos termos. Usuários serão notificados sobre mudanças
                significativas.
              </p>
            </section>

            {/* 16. Aceitação */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                16. Aceitação
              </h2>
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <p className="text-muted-foreground">
                  Ao clicar em "Aceito" ou "Concordo", ou ao instalar/usar o Software, você confirma que leu,
                  compreendeu e concorda em ficar vinculado a todos os termos desta licença.
                </p>
              </div>
            </section>

            {/* 17. Contato */}
            <section className="bg-muted/50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">17. Contato</h2>
              <p className="text-muted-foreground mb-4">Para questões sobre esta licença ou o Software:</p>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  <strong>Responsável:</strong> André Ribeiro Lima (KukySolutions™)
                </p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>suporte@onedrip.email</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>+55 (64) 99602-8022</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>www.onedrip.com.br</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Para dúvidas sobre estes termos ou questões legais, entre em contato conosco através dos canais acima.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                © 2026 OneDrip - KukySolutions™ | Todos os direitos reservados
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">CNPJ: 64.797.431/0001-03</p>
              <p className="text-xs text-muted-foreground mt-1">Versão 1.3.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

};