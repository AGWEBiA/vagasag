# Registro de Memória de Bugs e Soluções

Este arquivo documenta problemas encontrados, soluções implementadas e lições aprendidas para evitar regressões e loops de correção.

---

## [2026-05-13] Criação do Registro
- **Ação**: Implementação da diretriz de memória de bugs solicitada pelo usuário.
- **Status**: Ativo.

## [Histórico Recente] Funcionalidades Implementadas
- **IA na Descrição de Vagas**: Adicionada funcionalidade para gerar descrições de vagas usando IA no painel administrativo (`src/pages/AdminIA.tsx`).
- **Upload de Arquivos**: Limite aumentado para 50MB no formulário de vagas, com informação visível no campo.
- **Respostas Invisíveis**: As respostas dos candidatos (perguntas extras) não apareciam no painel admin por falta de uma política de SELECT no RLS da tabela `candidatura_respostas`.
- **Layout de Vagas**: Ajuste no espaçamento entre parágrafos e organização da descrição de vagas no portal público.
- **Painel Admin**: Melhorias na interface de criação de vagas e configuração de formulários de inscrição.


## [2026-05-14] Falha no cadastro público de candidatos — `TypeError: Load failed`
- **Sintoma**: Candidatos viam “Falha no envio: TypeError: Load failed” ao enviar inscrição pelo celular, causando perda de candidaturas.
- **Causa raiz**: O formulário público fazia `insert` em `candidaturas` com `.select("id")`. A política pública permitia gravar a candidatura, mas não permitia ler a linha recém-criada; por isso o retorno da linha era bloqueado por RLS e o envio falhava.
- **Correção aplicada**: Criada a função segura `submit_candidatura_publica`, que valida vaga aberta e campos obrigatórios, grava a candidatura e retorna apenas o UUID da inscrição. O frontend passou a usar essa função e mantém a gravação das respostas adicionais com o ID retornado.
- **Validação**: Testado via API pública com vaga real e com inserção de resposta adicional; ambos retornaram sucesso. Candidaturas de diagnóstico foram removidas depois do teste.
- **Prevenção de regressão**: Nunca voltar a usar `supabase.from("candidaturas").insert(...).select("id")` no formulário público. Se precisar do ID da candidatura, usar `submit_candidatura_publica` ou outra RPC segura que retorne apenas dados mínimos.

## [2026-05-14] Respostas do candidato apareciam como “Nenhuma resposta enviada”
- **Sintoma**: No painel admin, o bloco “Respostas do candidato” aparecia vazio mesmo quando o candidato havia preenchido as perguntas adicionais.
- **Causa raiz**: A candidatura era gravada pela função segura, mas as respostas adicionais eram enviadas em uma segunda chamada separada. Se essa segunda gravação falhasse, a candidatura ficava salva sem respostas na tabela final; as respostas permaneciam apenas no log de envio.
- **Correção aplicada**: `submit_candidatura_publica` passou a receber e gravar as respostas adicionais na mesma operação da candidatura. Também foi feita recuperação das respostas antigas que estavam nos logs de envio, incluindo o caso do print.
- **Prevenção de regressão**: Não voltar a salvar respostas adicionais públicas em uma chamada separada após criar a candidatura. A criação da candidatura e das respostas deve ser atômica na função segura.
