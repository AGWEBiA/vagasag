/**
 * Lista exata dos textos das perguntas comportamentais "disfarçadas" que vivem
 * no banco de perguntas (question_bank). Esses textos são usados para localizar
 * o conjunto e oferecer um atalho "Adicionar pacote comportamental" no editor
 * de perguntas da vaga.
 *
 * IMPORTANTE: estes textos devem permanecer idênticos aos inseridos via seed
 * em question_bank. Se algum texto for editado pelo usuário no painel "Banco
 * de Perguntas", a pergunta correspondente deixará de ser detectada aqui.
 */
export const PERGUNTAS_COMPORTAMENTAIS_TEXTOS: readonly string[] = [
  "Conte sobre uma situação recente em que você teve que entregar algo importante sem ter todas as informações ou recursos que precisava. Como você procedeu?",
  "Descreva um projeto em que você precisou colaborar com pessoas de áreas ou estilos muito diferentes do seu. O que funcionou bem e o que você faria diferente hoje?",
  "Imagine que você identifica um problema importante no processo da empresa, mas ele não faz parte das suas responsabilidades diretas. Como você normalmente age nessas situações? Dê um exemplo real.",
  "Conte sobre uma vez em que você cometeu um erro significativo no trabalho. O que aconteceu, como você lidou e quem ficou sabendo?",
  "Descreva uma situação em que você discordou fortemente de uma decisão da liderança ou de um colega. Como você conduziu essa divergência?",
  "Fale sobre o último aprendizado relevante que você buscou por conta própria (curso, livro, projeto pessoal). O que motivou e como aplicou?",
  "Descreva uma situação em que um colega de equipe não estava entregando o esperado e isso afetava o time. O que você fez?",
  "Conte sobre um período em que você teve muitas demandas simultâneas e sentiu que não daria conta de tudo. Como organizou e comunicou?",
  "Descreva uma vez em que você recebeu um feedback que doeu ou que você inicialmente discordou. O que fez com ele?",
  "Conte sobre uma conquista profissional que você tem orgulho — mas que envolveu outras pessoas. Como você descreveria a contribuição de cada um?",
  "Quando você está em um projeto novo, com que frequência você costuma propor melhorias ou ideias antes de ser solicitado?",
  "O quanto você se sente confortável em pedir ajuda quando está travado em uma tarefa?",
  "O quanto você se considera adaptável quando prioridades mudam de última hora?",
  "Quando há um conflito no time, qual costuma ser sua reação inicial?",
  "Em uma semana com prazos apertados e uma pessoa do time pedindo ajuda em algo não urgente, o que você normalmente faz?",
] as const;
