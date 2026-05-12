-- Arquivo de migração para sincronizar dados de vagas e perguntas
-- Nota: Este arquivo utiliza UPSERT (ON CONFLICT) para evitar duplicidade

-- 1. Inserir/Atualizar Vagas
INSERT INTO public.vagas (id, titulo, descricao, requisitos, beneficios, modalidade, status, cargo, created_by)
VALUES 
('64212a2a-cad2-459d-b5f1-979ed9e86762', 'Copywriter', 'Buscamos um(a) copywriter criativo(a) e estratégico(a)...', 'Experiência comprovada em copywriting...', 'Remuneração fixa + variável...', 'remoto', 'aberta', 'copywriter', '19c60b38-a84f-4bba-af19-1a233044b0ef'),
('30bed492-51cd-4e4b-9a86-0c07295eecea', 'Gestor de Projetos', 'Vaga para gestor de projetos', NULL, NULL, 'remoto', 'aberta', 'gestor_projetos', '19c60b38-a84f-4bba-af19-1a233044b0ef'),
('93fce29c-7260-42d6-8085-f96f56563326', 'Atendimento / Suporte', 'Vaga para atendimento a clientes e suporte em lançamentos.', NULL, NULL, 'remoto', 'aberta', 'atendimento_suporte', '19c60b38-a84f-4bba-af19-1a233044b0ef'),
('1212f8fd-5469-434f-865b-89fadd8995da', 'Inside Sales', 'Vaga para Inside Sales / Suporte ativo (vendas High Ticket).', NULL, NULL, 'remoto', 'aberta', 'inside_sales', '19c60b38-a84f-4bba-af19-1a233044b0ef'),
('48bbf78b-cf8f-4c2c-bc14-6713314cfb96', 'Designer', 'Vaga para profissional de design (criativos para anúncios, landing pages, identidade visual).', NULL, NULL, 'remoto', 'aberta', 'designer', '19c60b38-a84f-4bba-af19-1a233044b0ef'),
('2d2806de-384a-4e33-acd6-2c0a062ba888', 'Social Media Pleno', 'Estamos em busca de um Social Media Pleno criativo...', 'Perfil proativo, organizado e detalhista...', 'Valor fixo compatível...', 'remoto', 'aberta', 'social_media_manager', '84231c27-2a6b-4227-b78a-58ef78096050')
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  requisitos = EXCLUDED.requisitos,
  beneficios = EXCLUDED.beneficios,
  modalidade = EXCLUDED.modalidade,
  status = EXCLUDED.status;

-- 2. Inserir/Atualizar Perguntas das Vagas
-- Nota: Para brevidade e segurança, estamos inserindo as perguntas principais extraídas
INSERT INTO public.vaga_perguntas (id, vaga_id, texto, tipo, obrigatoria, ordem, opcoes, usar_na_ia)
VALUES 
(gen_random_uuid(), '64212a2a-cad2-459d-b5f1-979ed9e86762', 'Tem experiência com copy para tráfego pago?', 'escolha', true, 1, '["Sim", "Não"]', true),
(gen_random_uuid(), '64212a2a-cad2-459d-b5f1-979ed9e86762', 'Por que você quer trabalhar conosco?', 'texto', true, 2, '[]', true),
(gen_random_uuid(), '48bbf78b-cf8f-4c2c-bc14-6713314cfb96', 'Compartilhe o link do seu portfólio', 'texto', true, 4, '[]', true),
(gen_random_uuid(), '2d2806de-384a-4e33-acd6-2c0a062ba888', 'Quantos anos de experiência você possui como Social Media?', 'escolha', true, 0, '["Menos de 1 ano", "1 a 2 anos", "2 a 3 anos", "Mais de 3 anos"]', true)
-- Adicionar mais conforme necessário baseado nos dados atuais
ON CONFLICT (id) DO NOTHING;
