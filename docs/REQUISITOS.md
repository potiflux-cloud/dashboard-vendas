# Documento de Requisitos: Dashboard de Vendas

## 1. Introdução

**Objetivo:** oferecer ao gestor comercial uma visão consolidada do desempenho de vendas (faturamento, ticket médio, conversão e evolução), com comparação entre períodos e acompanhamento de metas.

**Escopo:** aplicação web estática (HTML, CSS e JavaScript), sem servidor. Os dados ficam no navegador do usuário. Não inclui autenticação, múltiplos usuários nem integração com meios de pagamento.

**Público-alvo:** gestores e donos de pequenos negócios que acompanham vendas por canal e vendedor.

## 2. Atores

| Ator | Descrição |
|---|---|
| Gestor comercial | Consulta indicadores, define metas, cadastra vendas, importa e exporta dados. |
| Fonte de dados externa | Arquivo CSV ou API que fornece registros de vendas (opcional). |

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | O sistema deve permitir filtrar os dados por período (7, 30, 90 dias e 12 meses). | Alta |
| RF02 | O sistema deve permitir filtrar por vendedor e por canal de venda. | Alta |
| RF03 | O sistema deve exibir faturamento, ticket médio, taxa de conversão e pedidos pagos. | Alta |
| RF04 | O sistema deve exibir a variação de cada indicador em relação ao período anterior. | Alta |
| RF05 | O sistema deve exibir um gráfico de evolução do faturamento, com o período anterior sobreposto e detalhe ao passar o mouse. | Alta |
| RF06 | O sistema deve exibir o funil de conversão (leads, propostas, pedidos e pagos) com a taxa de passagem entre etapas. | Média |
| RF07 | O sistema deve exibir o desempenho por canal (faturamento e conversão). | Média |
| RF08 | O sistema deve exibir o ranking de vendedores com percentual da meta atingida. | Média |
| RF09 | O sistema deve listar os produtos mais vendidos, com quantidade, faturamento e participação. | Média |
| RF10 | O sistema deve listar os pedidos mais recentes, com filtro por status. | Média |
| RF11 | O sistema deve exibir o progresso da meta do período e o valor a receber (pendentes). | Alta |
| RF12 | O usuário deve poder editar a meta diária por vendedor. | Média |
| RF13 | O usuário deve poder cadastrar uma nova venda (data, produto, valor, canal, vendedor e status). | Alta |
| RF14 | O usuário deve poder remover vendas cadastradas manualmente. | Baixa |
| RF15 | O usuário deve poder importar vendas a partir de um arquivo CSV e baixar um modelo do arquivo. | Alta |
| RF16 | O usuário deve poder exportar os pedidos do período filtrado em CSV. | Média |
| RF17 | O usuário deve poder imprimir o painel ou salvá-lo em PDF. | Média |
| RF18 | O usuário deve poder alternar entre tema claro e escuro. | Baixa |
| RF19 | O sistema deve manter vendas cadastradas, dados importados e meta entre sessões. | Alta |
| RF20 | O sistema deve permitir voltar aos dados de exemplo. | Baixa |

## 4. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF01 | Desempenho | O painel deve ser recalculado e redesenhado em menos de 1 segundo ao trocar um filtro, com até 50.000 registros. |
| RNF02 | Usabilidade | A interface deve se adaptar a telas de desktop, tablet e celular. |
| RNF03 | Acessibilidade | Os controles devem ser acessíveis por teclado, com indicação visível de foco, e o gráfico deve ter descrição textual. |
| RNF04 | Segurança | Todo texto vindo de arquivo ou API deve ser escapado antes de ser exibido. Os dados não são enviados a terceiros. |
| RNF05 | Segurança | Células exportadas que iniciam com `=`, `+`, `-` ou `@` devem ser neutralizadas contra injeção de fórmulas. |
| RNF06 | Compatibilidade | Deve funcionar nas versões atuais do Chrome, Edge, Firefox e Safari. |
| RNF07 | Portabilidade | Não deve depender de bibliotecas externas nem de servidor. |
| RNF08 | Manutenibilidade | O código deve ser separado em estrutura (HTML), estilo (CSS) e comportamento (JS), com regras de negócio isoladas em funções. |
| RNF09 | Confiabilidade | Se o armazenamento do navegador estiver indisponível, o sistema deve continuar funcionando e avisar que os dados valem só na sessão. |
| RNF10 | Localização | Datas, moedas e números devem seguir o padrão pt-BR. |

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | **Faturamento** é a soma dos pedidos com status *pago*. Pedidos *pendentes* e *cancelados* não entram. |
| RN02 | **Ticket médio** é o faturamento dividido pela quantidade de pedidos pagos. Sem pedidos pagos, vale zero. |
| RN03 | **Taxa de conversão** é a quantidade de pedidos pagos dividida pelo total de leads do período. |
| RN04 | O **período anterior** tem a mesma duração do período atual e termina no dia anterior ao seu início. |
| RN05 | A variação de faturamento, ticket e pedidos é percentual. A variação da conversão é em pontos percentuais. |
| RN06 | **A receber** é a soma dos pedidos com status *pendente*. |
| RN07 | A **meta do time** é a meta diária individual multiplicada pelo número de vendedores e pelo número de dias. Com um vendedor filtrado, vale a meta individual. |
| RN08 | A meta diária deve ser maior que zero. |
| RN09 | Uma venda não pode ter data futura nem valor menor ou igual a zero. |
| RN10 | O gráfico agrupa os valores por dia (7 e 30 dias), por semana (90 dias) ou em blocos de 31 dias (12 meses). |
| RN11 | Na importação, linhas com data, canal, vendedor, etapa, status ou valor inválidos são ignoradas e contabilizadas. |
| RN12 | Os rankings de canal e de vendedor ignoram o próprio filtro, para permitir comparação. |
| RN13 | Se os dados importados forem anteriores à data atual, o período analisado termina na data mais recente dos dados. |

## 6. Casos de uso

### UC01: Cadastrar venda

- **Ator:** gestor comercial.
- **Pré-condição:** painel carregado.
- **Fluxo principal:**
  1. O gestor aciona "Nova venda".
  2. O sistema exibe o formulário com a data de hoje e o preço sugerido do produto.
  3. O gestor preenche os campos e confirma.
  4. O sistema valida os dados (RN09), grava a venda e recalcula o painel.
- **Fluxo alternativo (dados inválidos):** o sistema exibe a mensagem de erro e mantém o formulário aberto.
- **Pós-condição:** a venda aparece na lista de pedidos e nos indicadores, e permanece após recarregar a página.

### UC02: Importar vendas

- **Ator:** gestor comercial.
- **Fluxo principal:**
  1. O gestor aciona "Importar CSV" e escolhe o arquivo.
  2. O sistema valida as linhas (RN11) e informa quantas são válidas e quantas foram ignoradas.
  3. O gestor confirma a substituição dos dados atuais.
  4. O sistema grava os dados e recalcula o painel.
- **Fluxo alternativo (nenhuma linha válida):** o sistema informa o erro e sugere baixar o modelo.

## 7. Formato do arquivo de importação

CSV com separador `;` ou `,`, primeira linha com os nomes das colunas.

| Coluna | Obrigatória | Valores |
|---|---|---|
| data | Sim | `AAAA-MM-DD` ou `DD/MM/AAAA` |
| canal | Sim | Texto livre |
| vendedor | Sim | Texto livre |
| etapa | Não | `lead`, `proposta` ou `pedido` |
| produto | Para pedidos | Texto livre |
| valor | Para pedidos | Número maior que zero (`1290`, `1290,50`, `R$ 1.290,50`) |
| status | Para pedidos | `pago`, `pendente` ou `cancelado` |

## 8. Premissas e restrições

- Os dados ficam no `localStorage` do navegador, portanto não são compartilhados entre dispositivos.
- Sem backend, não há controle de acesso.
- A capacidade de armazenamento do navegador (cerca de 5 MB) limita o tamanho dos dados importados que persistem entre sessões.