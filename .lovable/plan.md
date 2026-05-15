O objetivo é modernizar a interface do painel administrativo e do portal, focando em responsividade (especialmente para o viewport do usuário), acessibilidade e estética "moderna" (usando tokens semânticos, Glassmorphism, e animações suaves).

### Alterações propostas:

1.  **Refinamento Visual do AppShell (Navegação)**:
    *   Aprimorar a barra lateral com efeitos de Glassmorphism (`backdrop-blur`).
    *   Melhorar os estados de `hover` e `active` dos NavLinks com gradientes sutis em vez de cores sólidas.
    *   Garantir que a navegação seja totalmente colapsável/responsiva em telas menores.

2.  **Modernização de Cards e Superfícies**:
    *   Atualizar o arquivo `index.css` e `tailwind.config.ts` (se necessário) para incluir sombras mais suaves e bordas mais arredondadas (estilo Apple/SaaS moderno).
    *   Substituir bordas pesadas por variações de opacidade (`border-white/10`).

3.  **Aprimoramento do Painel de Candidaturas (InboxCandidaturas.tsx)**:
    *   Implementar um layout mais fluido que utilize melhor o espaço horizontal.
    *   Adicionar micro-interações (animações de entrada com Framer Motion/Lucide).
    *   Melhorar o contraste de leitura nas seções de "Respostas do Candidato" e "Experiência Profissional".

4.  **Acessibilidade (A11y)**:
    *   Verificar contrastes de cores nos Badges de status.
    *   Garantir que todos os botões interativos tenham tamanhos de toque (touch targets) adequados para mobile.
    *   Adicionar estados de `focus` visíveis e claros.

5.  **Responsividade**:
    *   Ajustar os breakpoints do grid no dashboard e nas listagens para evitar quebras em resoluções intermediárias (como a do usuário de 865px).
    *   Otimizar modais para preencherem melhor a tela em dispositivos móveis.

### Detalhes Técnicos:
*   Uso intensivo de classes utilitárias do Tailwind como `bg-background/80`, `backdrop-blur-md`, `transition-all`.
*   Padronização de cores usando as variáveis HSL já existentes, mas com ajustes de saturação para um look mais "premium".
