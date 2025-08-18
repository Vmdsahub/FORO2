import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TermsDialogProps {
  children: React.ReactNode;
}

export const TermsDialog: React.FC<TermsDialogProps> = ({ children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white border border-gray-200 shadow-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            Termos de Condições e Uso
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              1. Aceitação dos Termos
            </h3>
            <p>
              Ao acessar e usar o IA HUB, você aceita e concorda em cumprir
              estes Termos de Condições. Se você não concordar com qualquer
              parte destes termos, não deve usar nossa plataforma.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              2. Descrição do Serviço
            </h3>
            <p>
              O IA HUB é uma plataforma de fórum dedicada a discussões sobre
              inteligência artificial, machine learning e tecnologias
              relacionadas. Oferecemos um espaço para compartilhamento de
              conhecimento, dúvidas e experiências na área de IA.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              3. Registro e Conta de Usuário
            </h3>
            <p>
              Para participar ativamente do fórum, você deve criar uma conta
              fornecendo informações precisas e atualizadas. Você é responsável
              por manter a confidencialidade de sua senha e por todas as
              atividades realizadas em sua conta.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              4. Conduta do Usuário
            </h3>
            <p>
              Você concorda em usar o IA HUB de forma respeitosa e construtiva.
              É proibido:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>
                Publicar conteúdo ofensivo, discriminatório ou inapropriado
              </li>
              <li>Assediar ou intimidar outros usuários</li>
              <li>Compartilhar informações falsas ou enganosas</li>
              <li>Violar direitos de propriedade intelectual</li>
              <li>
                Usar a plataforma para spam ou atividades comerciais não
                autorizadas
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              5. Conteúdo e Propriedade Intelectual
            </h3>
            <p>
              O conteúdo que você publica no IA HUB permanece de sua
              propriedade, mas você nos concede uma licença para usar, exibir e
              distribuir esse conteúdo na plataforma. Respeitamos os direitos de
              propriedade intelectual e esperamos que você faça o mesmo.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              6. Privacidade e Dados
            </h3>
            <p>
              Coletamos e processamos seus dados pessoais de acordo com nossa
              Política de Privacidade. Usamos suas informações para fornecer e
              melhorar nossos serviços, bem como para comunicações relacionadas
              ao fórum.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">7. Newsletter</h3>
            <p>
              Ao aceitar receber nossa newsletter, você concorda em receber
              comunicações periódicas sobre novidades do IA HUB, discussões
              relevantes e conteúdo relacionado à inteligência artificial. Você
              pode cancelar a inscrição a qualquer momento.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              8. Moderação e Suspensão
            </h3>
            <p>
              Reservamos o direito de moderar conteúdo, suspender ou encerrar
              contas que violem estes termos. Podemos remover qualquer conteúdo
              que consideremos inadequado ou que viole nossas diretrizes da
              comunidade.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              9. Limitação de Responsabilidade
            </h3>
            <p>
              O IA HUB é fornecido "como está" e não garantimos que seja livre
              de erros ou interrupções. Não somos responsáveis por danos
              decorrentes do uso da plataforma ou do conteúdo gerado pelos
              usuários.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              10. Alterações nos Termos
            </h3>
            <p>
              Podemos atualizar estes termos periodicamente. Alterações
              significativas serão comunicadas aos usuários. O uso continuado da
              plataforma após as alterações constitui aceitação dos novos
              termos.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">11. Contato</h3>
            <p>
              Para dúvidas sobre estes termos ou sobre o IA HUB, entre em
              contato através de nossos canais oficiais na plataforma.
            </p>
          </div>

          <div className="border-t pt-4 mt-6">
            <p className="text-xs text-gray-500">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsDialog;
