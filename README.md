# Dashboard de Vendas

Painel de vendas em HTML, CSS e JavaScript puro, sem bibliotecas nem servidor. Mostra faturamento, ticket médio, conversão e evolução das vendas, com regras de negócio reais.

**Demo:** https://potiflux-cloud.github.io/dashboard-vendas/

![Painel](docs/prints/painel.png)

## Funcionalidades

- **Indicadores:** faturamento, ticket médio, taxa de conversão e pagamentos recebidos, com variação contra o período anterior.
- **Gráfico de evolução** em SVG, com período anterior sobreposto e tooltip.
- **Faturamento por produto** em gráfico de rosca, com legenda e tabela de participação.
- **Meta do período** editável, com progresso e valor a receber.
- **Funil de conversão**, desempenho por canal e ranking de vendedores.
- **Filtros** por período, vendedor, canal e status.
- **Tabela de pedidos paginada** (10, 25 ou 50 por página).
- **Nova venda** e **editar pedido** pelo mesmo formulário, salvos no navegador.
- **Marcar como pago** com a **data do pagamento**: o faturamento entra no período em que o dinheiro foi recebido.
- **Remover pedidos** e **excluir dados** (só as vendas cadastradas ou tudo) para começar do zero.
- **Importar CSV** e **exportar relatório** em CSV ou PDF.
- **Tema claro e escuro**, responsivo para celular.

## Regras de negócio

| Indicador | Regra | Data usada |
|---|---|---|
| Faturamento | Soma dos pedidos pagos (pendentes e cancelados ficam de fora) | Data do **pagamento** |
| Ticket médio | Faturamento ÷ pagamentos recebidos no período | Data do **pagamento** |
| Conversão | Pedidos pagos ÷ leads que entraram no período | Data do **pedido** |
| A receber | Soma dos pedidos pendentes | Data do **pedido** |
| Funil | Leads, propostas, pedidos e pagos do mesmo grupo de leads | Data do **pedido** |
| Meta do time | Meta individual × nº de vendedores × dias | n/a |
| Comparação | Período anterior de mesma duração; conversão em pontos percentuais | n/a |

Pontos importantes:

- O pagamento não pode ser anterior ao pedido nem estar no futuro.
- Marcar como pago um pedido antigo **não altera períodos já fechados**: o valor entra no período em que foi recebido.
- Dados sem data de pagamento (CSV antigo, dados salvos antes desta versão) usam a data do pedido.

A lista completa está em [docs/REQUISITOS.md](docs/REQUISITOS.md).

## Como rodar

Não precisa instalar nada.

1. Baixe ou clone o repositório.
2. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

## Usando o painel

### Cadastrar e editar vendas

Clique em **+ Nova venda** e preencha data do pedido, produto, valor, canal, vendedor e status. Produto, canal e vendedor são campos de texto com sugestões, então dá para criar nomes novos. Quando o status é *pago*, aparece o campo **Data do pagamento**.

Na tabela de pedidos, o botão **✎** abre o mesmo formulário preenchido, e o **×** remove o pedido. Vendas cadastradas por você ganham a etiqueta *manual*.

### Marcar um pedido como pago

Na tabela de pedidos, filtre por **Pendente** e clique em **Marcar pago**. Informe a data em que o cliente pagou e confirme. O painel recalcula faturamento, ticket médio e valor a receber.

### Navegar pelos pedidos

A tabela mostra 10 pedidos por página. Use **Anterior** e **Próxima**, ou troque para 25 ou 50 por página. Mudar qualquer filtro volta para a página 1.

### Excluir dados

No card **Dados do dashboard → Zona de exclusão**:

| Botão | O que apaga |
|---|---|
| Excluir vendas cadastradas | Só as vendas lançadas pelo formulário |
| Excluir todos os dados | Dados de exemplo ou importados **e** vendas cadastradas (a meta é mantida) |

Ambos pedem confirmação e não podem ser desfeitos. Para voltar ao início, use **Usar dados de exemplo**. Dica: exporte o relatório antes de excluir.

### Usando seus dados

Clique em **Importar CSV** (use **Baixar modelo CSV** para ver o formato):

```csv
data;canal;vendedor;etapa;produto;valor;status;data_pagamento
2026-10-01;WhatsApp;Ana Lima;pedido;Plano Presence;497;pago;2026-10-04
2026-10-01;Site;Diego Melo;pedido;Landing Page;1290;pendente;
2026-10-01;Instagram;Bruno Reis;lead;;;;
```

| Coluna | Obrigatória | Valores |
|---|---|---|
| data | Sim | `AAAA-MM-DD` ou `DD/MM/AAAA` (data do pedido) |
| canal | Sim | Texto livre |
| vendedor | Sim | Texto livre |
| etapa | Não | `lead`, `proposta` ou `pedido` |
| produto | Para pedidos | Texto livre |
| valor | Para pedidos | Número maior que zero (`1290`, `1290,50`, `R$ 1.290,50`) |
| status | Para pedidos | `pago`, `pendente` ou `cancelado` |
| data_pagamento | Não | Mesmo formato de `data`. Só para pedidos pagos |

Linhas inválidas são ignoradas e contadas na confirmação da importação. Isso inclui pagamento anterior ao pedido e pagamento no futuro. O CSV exportado usa o mesmo formato, então dá para exportar e importar de volta.

Para buscar de uma API, preencha `API_URL` no `script.js`. Ela deve devolver um array JSON com as mesmas colunas. Nesse modo o painel é somente leitura: editar, marcar como pago e remover avisam que a alteração deve ser feita na origem.

## Limitações

- Os dados ficam no `localStorage` do navegador: não são compartilhados entre dispositivos e somem se o usuário limpar os dados do site.
- Cada venda cadastrada à mão entra como um lead que já converteu, o que infla a taxa de conversão. Para uma conversão real, importe um CSV com linhas `lead` e `proposta`.
- Não há desfazer: remover e excluir são definitivos.
- Não há controle de acesso nem múltiplos usuários.

## Estrutura

```
dashboard-vendas/
├── index.html      # estrutura da página
├── style.css       # tema, layout e responsivo
├── script.js       # dados, regras de negócio e renderização
├── .gitignore
├── README.md
└── docs/
    ├── REQUISITOS.md
    └── prints/
        └── painel.png
```

## Tecnologias

HTML5, CSS3 (variáveis, grid, flexbox) e JavaScript (ES2020), com gráficos em SVG gerados por código e persistência em `localStorage`.

## Próximos passos

- Backend para compartilhar dados entre dispositivos
- Autenticação e múltiplos usuários
- Metas por vendedor e por mês
- Desfazer ações e testes automatizados

## Autor

Matheus | Potiflux · [@potiflux-cloud](https://github.com/potiflux-cloud)