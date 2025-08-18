import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Clock } from "lucide-react";

interface NewsletterTopic {
  id: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  content: {
    text: string;
    images?: string[];
  };
}

const mockTopics: NewsletterTopic[] = [
  {
    id: "1",
    title: "Novidades em IA: GPT-4 Turbo e Claude 3",
    description:
      "Principais atualizações dos modelos de linguagem mais populares desta semana",
    date: "2024-01-15",
    readTime: "5 min",
    content: {
      text: "Esta semana trouxe grandes novidades no mundo da inteligência artificial. O OpenAI anunciou melhorias significativas no GPT-4 Turbo, incluindo maior velocidade de resposta e redução de custos. Paralelamente, a Anthropic lançou o Claude 3, prometendo melhor compreensão de contexto e raciocínio mais avançado.\n\nAs principais melhorias incluem:\n• Velocidade de resposta 2x mais rápida\n• Redução de 50% nos custos de API\n• Melhor compreensão de contexto longo\n• Capacidades multimodais aprimoradas\n\nEssas atualizações representam um marco importante na evolução da IA conversacional e prometem impactar significativamente o desenvolvimento de aplicações.",
      images: [],
    },
  },
  {
    id: "2",
    title: "Ferramentas de Desenvolvimento: Cursor vs VS Code",
    description:
      "Comparativo detalhado entre os editores de código mais utilizados pelos desenvolvedores",
    date: "2024-01-14",
    readTime: "8 min",
    content: {
      text: "O mercado de editores de código tem se tornado cada vez mais competitivo. Enquanto o VS Code mantém sua posição como líder, o Cursor tem ganhado popularidade entre desenvolvedores que trabalham com IA.\n\nVantagens do Cursor:\n• Integração nativa com IA para geração de código\n• Interface otimizada para pair programming com IA\n• Suporte avançado para múltiplos modelos de linguagem\n\nVantagens do VS Code:\n• Ecossistema maduro de extensões\n• Performance estável e confiável\n• Suporte robusto da Microsoft\n\nA escolha entre as ferramentas depende principalmente do workflow e necessidades específicas de cada desenvolvedor.",
      images: [],
    },
  },
  {
    id: "3",
    title: "Segurança Digital: Melhores Práticas 2024",
    description:
      "Guia completo sobre as práticas de segurança mais importantes para este ano",
    date: "2024-01-13",
    readTime: "12 min",
    content: {
      text: "A segurança digital continua sendo uma prioridade crítica para empresas e desenvolvedores. Em 2024, novas ameaças emergem constantemente, exigindo adaptação contínua das estratégias de proteção.\n\nPrincipais recomendações:\n• Implementação de autenticação multifator (MFA)\n• Uso de gerenciadores de senhas corporativos\n• Monitoramento contínuo de vulnerabilidades\n• Treinamento regular da equipe\n• Backup automático e testado regularmente\n\nA implementação dessas práticas pode reduzir significativamente o risco de incidentes de segurança e proteger dados sensíveis da organização.",
      images: [],
    },
  },
];

export default function Newsletter() {
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (topicId: string) => {
    const newOpenTopics = new Set(openTopics);
    if (newOpenTopics.has(topicId)) {
      newOpenTopics.delete(topicId);
    } else {
      newOpenTopics.add(topicId);
    }
    setOpenTopics(newOpenTopics);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold mb-2">Newsletter Semanal</h3>
        <p className="text-muted-foreground">
          Fique por dentro das principais novidades do mundo tech
        </p>
      </div>

      <div className="space-y-4">
        {mockTopics.map((topic) => (
          <Card
            key={topic.id}
            className="transition-all duration-200 hover:shadow-md"
          >
            <Collapsible>
              <CollapsibleTrigger
                onClick={() => toggleTopic(topic.id)}
                className="w-full"
              >
                <CardHeader className="hover:bg-accent/50 transition-colors duration-200 rounded-t-lg">
                  <div className="flex items-start justify-between">
                    <div className="text-left flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        {openTopics.has(topic.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        {topic.title}
                      </CardTitle>
                      <CardDescription className="text-sm mb-3">
                        {topic.description}
                      </CardDescription>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(topic.date).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {topic.readTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-6">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-line text-foreground leading-relaxed">
                      {topic.content.text}
                    </div>
                    {topic.content.images &&
                      topic.content.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {topic.content.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Imagem ${index + 1} do tópico`}
                              className="rounded-lg shadow-sm"
                            />
                          ))}
                        </div>
                      )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
