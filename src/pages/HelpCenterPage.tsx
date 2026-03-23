import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  HelpCircle, Search, FileText, Shield, Settings, ChevronDown, ChevronRight,
  ExternalLink, MessageCircle, History, ThumbsUp, ThumbsDown, Zap, Video,
  ArrowRight, AlertCircle
} from 'lucide-react';
import { helpSections, faqItems, helpCategories, quickAccessItems } from './help-center/helpCenterData';
import { useHelpCenter } from '@/hooks/useHelpCenter';

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const {
    searchTerm, selectedCategory, setSelectedCategory,
    openSections, toggleSection, searchHistory,
    showFeedbackForm, setShowFeedbackForm, feedbackComment, setFeedbackComment,
    activeTab, setActiveTab, helpfulCounts,
    searchSuggestions, filteredSections, filteredFAQ,
    handleSearch, saveFeedback,
  } = useHelpCenter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground">Documentação</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mt-2">
            Encontre respostas, tutoriais e guias completos para aproveitar ao máximo todas as funcionalidades do OneDrip.
          </p>
        </div>

        {/* Busca */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Busque por palavras-chave, perguntas ou funcionalidades..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-6 text-lg"
              />
              {searchSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-card border rounded-lg shadow-lg">
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {searchHistory.length > 0 && searchTerm === '' && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Buscas recentes:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 5).map((item) => (
                    <Button key={item.id} variant="outline" size="sm" onClick={() => handleSearch(item.query)} className="text-xs">
                      {item.query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atalhos Rápidos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Atalhos Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {quickAccessItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Button key={idx} variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5" onClick={() => navigate(item.path)}>
                    <Icon className={`h-6 w-6 ${item.color}`} />
                    <span className="text-xs text-center">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="guides">Guias</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tutorials">Tutoriais</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {helpCategories.map((cat) => (
                <Button key={cat.id} variant={selectedCategory === cat.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat.id)} className="flex items-center gap-2">
                  {cat.icon}{cat.label}
                </Button>
              ))}
            </div>
            <div className="space-y-6 mb-12">
              {filteredSections.length === 0 && filteredFAQ.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-2">Tente usar termos diferentes ou navegue pelas categorias acima</p>
                  </CardContent>
                </Card>
              ) : (
                filteredSections.map((section) => (
                  <Card key={section.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Collapsible open={openSections.includes(section.id)} onOpenChange={() => toggleSection(section.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/20 rounded-lg">{section.icon}</div>
                              <div className="text-left">
                                <CardTitle className="text-xl">{section.title}</CardTitle>
                                <p className="text-muted-foreground mt-1">{section.description}</p>
                              </div>
                            </div>
                            {openSections.includes(section.id)
                              ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Separator className="mb-6" />
                          {section.content}
                          <div className="mt-6 flex items-center gap-4 pt-4 border-t">
                            <span className="text-sm text-muted-foreground">Esta informação foi útil?</span>
                            {(helpfulCounts[section.id] ?? 0) > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />{helpfulCounts[section.id]}
                              </Badge>
                            )}
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => saveFeedback(section.id, 'helpful')} className="flex items-center gap-1">
                                <ThumbsUp className="h-4 w-4" /> Sim
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowFeedbackForm(section.id)} className="flex items-center gap-1">
                                <ThumbsDown className="h-4 w-4" /> Não
                              </Button>
                            </div>
                          </div>
                          {showFeedbackForm === section.id && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <Label htmlFor="feedback">Como podemos melhorar?</Label>
                              <Textarea id="feedback" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Sua opinião nos ajuda muito..." className="mt-2" />
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" onClick={() => saveFeedback(section.id, 'not-helpful', feedbackComment)}>Enviar</Button>
                                <Button variant="outline" size="sm" onClick={() => { setShowFeedbackForm(null); setFeedbackComment(''); }}>Cancelar</Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="guides" className="mt-6">
            <div className="space-y-6">
              {helpSections.map((section) => (
                <Card key={section.id}>
                  <CardHeader><CardTitle className="flex items-center gap-2">{section.icon}{section.title}</CardTitle></CardHeader>
                  <CardContent>{section.content}</CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <div className="space-y-4">
              {filteredFAQ.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader><CardTitle className="text-lg">{item.question}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button variant="ghost" size="sm" onClick={() => saveFeedback(`faq-${index}`, 'helpful')}><ThumbsUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => saveFeedback(`faq-${index}`, 'not-helpful')}><ThumbsDown className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tutorials" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Tutorial: Criando seu Primeiro Orçamento</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Aprenda passo a passo como criar um orçamento profissional em minutos.</p>
                  <Button onClick={() => navigate('/worm')} className="w-full">Começar Tutorial <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Tutorial: Usando a Drippy IA</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Descubra como usar a assistente virtual para buscar orçamentos e obter ajuda.</p>
                  <Button onClick={() => navigate('/chat')} className="w-full">Começar Tutorial <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* FAQ resumido */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2"><HelpCircle className="h-6 w-6" /> Perguntas Frequentes</CardTitle>
            <p className="text-muted-foreground">Respostas rápidas para as dúvidas mais comuns</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredFAQ.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <h4 className="font-semibold text-foreground mb-2">{item.question}</h4>
                  <p className="text-muted-foreground text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Links Úteis */}
        <Card>
          <CardHeader><CardTitle className="text-2xl flex items-center gap-2"><ExternalLink className="h-6 w-6" /> Links Úteis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/terms', '_blank')}><FileText className="h-6 w-6" /><span>Termos de Uso</span></Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/privacy', '_blank')}><Shield className="h-6 w-6" /><span>Privacidade</span></Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/cookies', '_blank')}><Settings className="h-6 w-6" /><span>Cookies</span></Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/suporte', '_blank')}><MessageCircle className="h-6 w-6" /><span>Suporte</span></Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default HelpCenterPage;
