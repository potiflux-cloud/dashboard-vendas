# Documento de Requisitos: Dashboard de Vendas

## 1. Introdução

**Objetivo:** oferecer ao gestor comercial uma visão consolidada do desempenho de vendas (faturamento, ticket médio, conversão e evolução), com comparação entre períodos e acompanhamento de metas.

**Escopo:** aplicação web estática (HTML, CSS e JavaScript), sem servidor. Os dados ficam no navegador do usuário. Não inclui autenticação, múltiplos usuários nem integração com meios de pagamento.

**Público-alvo:** gestores e donos de pequenos negócios que acompanham vendas por canal e vendedor.

## 2. Atores

| Ator | Descrição |
|---|---|
| Gestor comercial | Consulta indicadores, define metas, cadastra e edita vendas, confirma pagamentos, importa, exporta e exclui dados. |
| Fonte de dados externa | Arquivo CSV ou API que fornece registros de vendas (opcional). |

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | O sistema deve permitir filtrar os dados por período (7, 30, 90 dias e 12 meses). | Alta |
| RF02 | O sistema deve permitir filtrar por vendedor e por canal de venda. | Alta |
| RF03 | O sistema deve exibir faturamento, ticket médio, taxa de conversão e pagamentos recebidos. | Alta |
| RF04 | O sistema deve exibir a variação de cada indicador em relação ao período anterior. | Alta |
| RF05 | O sistema deve exibir um gráfico de evolução do faturamento, com o período anterior sobreposto e detalhe ao passar o mouse. | Alta |
| RF06 | O sistema deve exibir o funil de conversão (leads, propostas, pedidos e pagos) com a taxa de passagem entre etapas. | Média |
| RF07 | O sistema deve exibir o desempenho por canal (faturamento e conversão). | Média |
| RF08 | O sistema deve exibir o ranking de vendedores com percentual da meta atingida. | Média |
| RF09 | O sistema deve exibir o faturamento por produto em gráfico de rosca e em tabela, com quantidade, valor e participação. | Média |
| RF10 | O sistema deve listar os pedidos, mais recentes primeiro, com filtro por status. | Média |
| RF11 | O sistema deve exibir o progresso da meta do período e o valor a receber (pendentes). | Alta |
| RF12 | O usuário deve poder editar a meta diária por vendedor. | Média |
| RF13 | O usuário deve poder cadastrar uma nova venda (data do pedido, produto, valor, canal, vendedor, status e, quando paga, data do pagamento). | Alta |
| RF14 | O usuário deve poder remover um pedido pela tabela, inclusive pedidos importados ou de exemplo. | Baixa |
| RF15 | O usuário deve poder importar vendas a partir de um arquivo CSV e baixar um modelo do arquivo. | Alta |
| RF16 | O usuário deve poder exportar os pedidos do período filtrado em CSV, incluindo a data do pagamento. | Média |
| RF17 | O usuário deve poder imprimir o painel ou salvá-lo em PDF. | Média |
| RF18 | O usuário deve poder alternar entre tema claro e escuro. | Baixa |
| RF19 | O sistema deve manter vendas cadastradas, dados importados, alterações, datas de pagamento e meta entre sessões. | Alta |
| RF20 | O sistema deve permitir voltar aos dados de exemplo. | Baixa |
| RF21 | O usuário deve poder marcar um pedido pendente como pago, informando a data do pagamento, e o sistema deve atualizar faturamento, ticket médio e valor a receber. | Alta |
| RF22 | O usuário deve poder excluir todas as vendas cadastradas manualmente de uma só vez. | Média |
| RF23 | O usuário deve poder excluir todos os dados (exemplo, importados e cadastrados), e o painel deve continuar funcionando vazio, aceitando novas vendas. | Média |
| RF24 | O usuário deve poder editar qualquer campo de um pedido (data, produto, valor, canal, vendedor, status e data do pagamento). | Alta |
| RF25 | O sistema deve paginar a tabela de pedidos, permitindo escolher 10, 25 ou 50 linhas por página e navegar entre as páginas. | Média |

## 4. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF01 | Desempenho | O painel deve ser recalculado e redesenhado em menos de 1 segundo ao trocar um filtro, com até 50.000 registros. |
| RNF02 | Usabilidade | A interface deve se adaptar a telas de desktop, tablet e celular. |
| RNF03 | Acessibilidade | Os controles devem ser acessíveis por teclado, com indicação visível de foco, e os gráficos devem ter descrição textual. |
| RNF04 | Segurança | Todo texto vindo de arquivo ou API deve ser escapado antes de ser exibido. Os dados não são enviados a terceiros. |
| RNF05 | Segurança | Células exportadas que iniciam com `=`, `+`, `-` ou `@` devem ser neutralizadas contra injeção de fórmulas. |
| RNF06 | Compatibilidade | Deve funcionar nas versões atuais do Chrome, Edge, Firefox e Safari. |
| RNF07 | Portabilidade | Não deve depender de bibliotecas externas nem de servidor. |
| RNF08 | Manutenibilidade | O código deve ser separado em estrutura (HTML), estilo (CSS) e comportamento (JS), com regras de negócio isoladas em funções. |
| RNF09 | Confiabilidade | Se o armazenamento do navegador estiver indisponível, o sistema deve continuar funcionando e avisar que os dados valem só na sessão. |
| RNF10 | Localização | Datas, moedas e números devem seguir o padrão pt-BR. |
| RNF11 | Usabilidade | Ações destrutivas ou que alteram valores (excluir dados, remover pedido, importar) devem pedir confirmação do usuário. |
| RNF12 | Confiabilidade | Dados salvos que estejam inválidos ou corrompidos devem ser descartados sem impedir o carregamento do painel. |
| RNF13 | Precisão | Somas de valores monetários devem ser feitas em centavos inteiros, para evitar erros de arredondamento. |

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | **Faturamento** é a soma dos pedidos com status *pago*, contados no período da **data do pagamento**. Pedidos *pendentes* e *cancelados* não entram. |
| RN02 | **Ticket médio** é o faturamento dividido pela quantidade de pagamentos recebidos no período. Sem pagamentos, vale zero. |
| RN03 | **Taxa de conversão** é a quantidade de pedidos pagos dividida pelo total de leads que entraram no período (pela data do pedido). O pagamento pode ter ocorrido depois. |
| RN04 | O **período anterior** tem a mesma duração do período atual e termina no dia anterior ao seu início. |
| RN05 | A variação de faturamento, ticket e pagamentos é percentual. A variação da conversão é em pontos percentuais. |
| RN06 | **A receber** é a soma dos pedidos com status *pendente* que entraram no período (pela data do pedido). |
| RN07 | A **meta do time** é a meta diária individual multiplicada pelo número de vendedores e pelo número de dias. Com um vendedor filtrado, vale a meta individual. |
| RN08 | A meta diária deve ser maior que zero e no máximo R$ 1.000.000. |
| RN09 | Uma venda não pode ter data de pedido futura nem valor menor ou igual a zero. Produto, canal e vendedor são obrigatórios. |
| RN10 | O gráfico de evolução agrupa os valores por dia (7 e 30 dias), por semana (90 dias) ou em blocos de 31 dias (12 meses), pela data do pagamento. |
| RN11 | Na importação, linhas com data, canal, vendedor, etapa, status, valor ou data de pagamento inválidos são ignoradas e contabilizadas. |
| RN12 | Os rankings de canal e de vendedor ignoram o próprio filtro, para permitir comparação. |
| RN13 | O período analisado termina na data mais recente dos dados (pedido ou pagamento). |
| RN14 | Somente pedidos com status *pendente* podem ser marcados como *pago* pelo botão da tabela. |
| RN15 | Ao marcar um pedido como pago, o valor deixa de compor o "a receber" e passa a compor o faturamento do período da data do pagamento, sem alterar períodos anteriores. |
| RN16 | Com dados vindos de API, o painel é somente leitura: editar, marcar como pago e remover devem ser feitos na origem. |
| RN17 | A exclusão de vendas cadastradas não afeta os dados de exemplo ou importados. A exclusão total remove ambos, mantendo apenas a meta. |
| RN18 | Excluir dados e remover pedidos não pode ser desfeito. Para recomeçar, o usuário pode restaurar os dados de exemplo. |
| RN19 | A data do pagamento é obrigatória para pedidos pagos, não pode ser anterior à data do pedido nem estar no futuro. |
| RN20 | Pedidos pagos sem data de pagamento (CSV sem a coluna ou dados salvos em versões anteriores) usam a data do pedido como data do pagamento. |
| RN21 | Pedidos pendentes ou cancelados não têm data de pagamento. Ao mudar o status de um pedido para um desses valores, a data do pagamento é removida. |
| RN22 | A tabela de pedidos exibe 10 linhas por página por padrão. Ao mudar qualquer filtro ou o tamanho da página, a tabela volta para a primeira página. |
| RN23 | A rosca de produtos exibe os 5 maiores e agrupa o restante em "Outros". A tabela exibe os 8 maiores e agrupa o restante em "Demais produtos". |

## 6. Casos de uso

### UC01: Cadastrar venda

- **Ator:** gestor comercial.
- **Pré-condição:** painel carregado.
- **Fluxo principal:**
  1. O gestor aciona "Nova venda".
  2. O sistema exibe o formulário com a data de hoje e sugestões de produto, canal e vendedor.
  3. O gestor preenche os campos. Se o status for *pago*, informa também a data do pagamento.
  4. O gestor confirma. O sistema valida os dados (RN09 e RN19), grava a venda e recalcula o painel.
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

### UC03: Marcar pedido como pago

- **Ator:** gestor comercial.
- **Pré-condição:** existe ao menos um pedido com status *pendente* no período exibido.
- **Fluxo principal:**
  1. O gestor filtra a lista de pedidos por status *Pendente*.
  2. O gestor aciona "Marcar pago" na linha do pedido.
  3. O sistema exibe o pedido e pede a data do pagamento, sugerindo a data de hoje.
  4. O gestor confirma.
  5. O sistema valida a data (RN19), altera o status para *pago*, salva a mudança e recalcula faturamento, ticket médio e valor a receber (RN15).
- **Fluxo alternativo (data inválida):** o sistema exibe o erro e mantém a janela aberta.
- **Fluxo alternativo (cancelar):** o gestor fecha a janela e nada é alterado.
- **Fluxo alternativo (dados de API):** o sistema informa que a alteração deve ser feita na origem (RN16).

### UC04: Excluir dados

- **Ator:** gestor comercial.
- **Fluxo principal:**
  1. O gestor escolhe "Excluir vendas cadastradas" ou "Excluir todos os dados".
  2. O sistema exibe o aviso do que será apagado e que a ação não pode ser desfeita (RN18).
  3. O gestor confirma.
  4. O sistema remove os dados escolhidos (RN17) e recalcula o painel.
- **Fluxo alternativo (nada a excluir):** se não houver vendas cadastradas, o sistema informa e não altera nada.
- **Pós-condição:** com todos os dados excluídos, o painel exibe "Sem dados" e permite cadastrar novas vendas ou importar um CSV.

### UC05: Editar pedido

- **Ator:** gestor comercial.
- **Pré-condição:** o pedido aparece na tabela de pedidos.
- **Fluxo principal:**
  1. O gestor aciona o botão de edição na linha do pedido.
  2. O sistema abre o formulário preenchido com os dados do pedido.
  3. O gestor altera os campos desejados e confirma.
  4. O sistema valida os dados (RN09, RN19 e RN21), grava a alteração no mesmo pedido, sem duplicá-lo, e recalcula o painel.
- **Fluxo alternativo (dados inválidos):** o sistema exibe o erro e mantém o formulário aberto.
- **Fluxo alternativo (dados de API):** o sistema informa que a alteração deve ser feita na origem (RN16).

### UC06: Navegar pelos pedidos

- **Ator:** gestor comercial.
- **Fluxo principal:**
  1. O gestor consulta a tabela de pedidos, que exibe a primeira página.
  2. O gestor aciona "Próxima" ou "Anterior", ou escolhe outro tamanho de página.
  3. O sistema exibe as linhas correspondentes e o intervalo mostrado (ex.: 11–20 de 149).
- **Regra:** os botões ficam desabilitados nos extremos e o controle some quando há uma única página (RN22).

## 7. Formato do arquivo de importação

CSV com separador `;` ou `,`, primeira linha com os nomes das colunas.

| Coluna | Obrigatória | Valores |
|---|---|---|
| data | Sim | `AAAA-MM-DD` ou `DD/MM/AAAA` (data do pedido) |
| canal | Sim | Texto livre |
| vendedor | Sim | Texto livre |
| etapa | Não | `lead`, `proposta` ou `pedido` |
| produto | Para pedidos | Texto livre |
| valor | Para pedidos | Número maior que zero (`1290`, `1290,50`, `R$ 1.290,50`) |
| status | Para pedidos | `pago`, `pendente` ou `cancelado` |
| data_pagamento | Não | Mesmo formato de `data`. Só para pedidos pagos (RN19 e RN20) |

## 8. Premissas e restrições

- Os dados ficam no `localStorage` do navegador, portanto não são compartilhados entre dispositivos e podem ser perdidos se o usuário limpar os dados do site.
- Sem backend, não há controle de acesso.
- A capacidade de armazenamento do navegador (cerca de 5 MB) limita o tamanho dos dados importados que persistem entre sessões.
- Cada venda cadastrada manualmente entra como um lead que converteu, o que eleva a taxa de conversão. Para uma conversão realista, deve-se importar também leads e propostas.
- Não há função de desfazer.