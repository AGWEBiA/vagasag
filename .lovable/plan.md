O sistema já possui funcionalidades administrativas para criação de descrição de vagas e formulários de inscrição (com perguntas personalizáveis). Vou aprimorar a interface de criação de vagas no painel administrativo para tornar esses recursos mais acessíveis e intuitivos, conforme solicitado.

### Melhorias na Criação de Vagas e Formulários:
1.  **Refinamento do Editor de Descrição**: Garantir que o campo de descrição (usando ReactQuill) esteja configurado para as melhores práticas de SEO e legibilidade, facilitando a formatação de tópicos como "Sobre a vaga", "Requisitos" e "Benefícios".
2.  **Aprimoramento do Editor de Formulário**: Melhorar a visibilidade e o fluxo do `VagaPerguntasEditor` dentro do modal de criação de vaga, permitindo que o administrador defina perguntas obrigatórias, tipos de resposta (texto, múltipla escolha, escala) e integração com IA.
3.  **Melhorias de UX no Admin**:
    *   Adição de tooltips explicativos para os campos do formulário.
    *   Melhor organização visual das seções no modal de edição.
    *   Destaque para o recurso de "Pacote Comportamental" que agiliza a criação de formulários padrão.

### Detalhes Técnicos:
*   **src/pages/Vagas.tsx**: Atualização do modal de criação/edição para melhorar a hierarquia visual.
*   **src/components/VagaPerguntasEditor.tsx**: Pequenos ajustes para facilitar a seleção de perguntas do banco e a criação de perguntas customizadas.
*   **Integração**: Os dados continuarão sendo persistidos nas tabelas `vagas`, `vaga_perguntas` e `question_bank` via Supabase.

Não são necessárias novas tabelas, pois a infraestrutura atual já suporta o que foi pedido. Vou focar em tornar a experiência de uso mais robusta para o administrador.