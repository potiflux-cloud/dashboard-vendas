/* =========================================================
   Dashboard de vendas
   ========================================================= */

/* ---------- Utilitários ---------- */
const $ = id => document.getElementById(id);
const DIA = 864e5; // 1 dia em milissegundos

const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pc  = v => (v * 100).toFixed(1).replace('.', ',') + '%';
const nf  = v => v.toLocaleString('pt-BR');

// Escapa texto antes de colocar em innerHTML (dados importados não são confiáveis)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Data <-> texto "AAAA-MM-DD" (sempre no fuso local)
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// Aceita "2026-10-15" ou "15/10/2026"
function parseData(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/), d = null;
  if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d && !isNaN(d) ? d : null;
}

// Aceita "1290", "1290.50", "1.290,50" e "R$ 1.290,50"
function parseValor(s) {
  s = String(s ?? '').replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
}

/* ---------- Armazenamento no navegador (localStorage) ---------- */
const store = {
  get(k, padrao) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignora */ } }
};

/* ---------- Configuração ---------- */
const API_URL = '';   // Opcional. Ex.: 'https://seu-servidor.com/api/vendas' (JSON no mesmo formato do CSV)
const STATUS = ['pago', 'pendente', 'cancelado'];
const ETAPAS = new Map([['lead', 0], ['proposta', 1], ['pedido', 2]]);
let META_VEND = store.get('dv_meta', 500); // meta individual por dia (editável na tela)

/* ---------- Dados de exemplo ---------- */
const VEND_EX = ['Ana Lima', 'Bruno Reis', 'Carla Dias', 'Diego Melo'];

// w = peso (quanto cada canal traz de leads)
// q = chance de virar proposta | o = chance de virar pedido, dado que teve proposta
const CANAL_EX = {
  'WhatsApp':   { w: 34, q: .70, o: .50 },
  'Instagram':  { w: 28, q: .55, o: .42 },
  'Google Ads': { w: 16, q: .50, o: .38 },
  'Indicação':  { w: 10, q: .85, o: .68 },
  'Site':       { w: 12, q: .45, o: .35 }
};

// [nome, preço base, peso de popularidade]
const PROD = [
  ['Plano Presence', 497, 40],
  ['Landing Page', 1290, 28],
  ['Agente de IA', 2490, 22],
  ['Plano Growth', 3990, 10]
];
const PRECO = Object.fromEntries(PROD.map(p => [p[0], p[1]]));

const HOJE_REAL = new Date();
HOJE_REAL.setHours(0, 0, 0, 0);

function gerar() {
  let s = 42; // semente fixa: sempre gera os mesmos dados
  const R = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (arr, w) => {
    let t = w.reduce((a, b) => a + b, 0) * R(), i = 0;
    while ((t -= w[i]) > 0) i++;
    return arr[i];
  };

  const nomesCanal = Object.keys(CANAL_EX);
  const out = [];

  for (let d = 729; d >= 0; d--) {
    const dt = new Date(HOJE_REAL.getTime() - d * DIA);
    const dow = dt.getDay();
    const cresc = 1 + (729 - d) / 729 * .5;
    const n = Math.round((dow % 6 ? 15 : 6) * cresc * (.8 + R() * .4));

    for (let i = 0; i < n; i++) {
      const canal = pick(nomesCanal, nomesCanal.map(c => CANAL_EX[c].w));
      const c = CANAL_EX[canal];
      const vend = VEND_EX[Math.floor(R() * 4)];

      let stage = 0;
      if (R() < c.q) { stage = 1; if (R() < c.o) stage = 2; }

      const lead = { date: dt, canal, vend, stage, status: null, valor: 0, prod: '' };

      if (stage === 2) {
        const p = pick(PROD, PROD.map(x => x[2]));
        lead.prod = p[0];
        lead.valor = Math.round(p[1] * (.92 + R() * .16));
        const r = R();
        lead.status = r < .8 ? 'pago' : r < .9 ? 'pendente' : 'cancelado';
      }
      out.push(lead);
    }
  }
  return out;
}

/* ---------- Estado da aplicação ---------- */
let base = [];      // dados de exemplo, CSV ou API
let manuais = [];   // vendas cadastradas pelo formulário
let DATA = [];      // base + manuais (é o que a tela usa)
let fonte = 'exemplo'; // 'exemplo' | 'csv' | 'api' | 'vazio'
let hoje = HOJE_REAL;  // data final do período (última data dos dados)
let vendedores = [], canais = [], produtos = [];

/* ---------- Conversão de linhas (CSV / API) em leads ---------- */
// Colunas: data, canal, vendedor, etapa (lead|proposta|pedido), produto, valor, status
function linhaParaLead(o) {
  const date = parseData(o.data);
  const canal = String(o.canal || '').trim();
  const vend = String(o.vendedor || '').trim();
  if (!date || !canal || !vend) return null;

  const et = String(o.etapa || '').trim().toLowerCase();
  const stage = et ? ETAPAS.get(et) : (o.status ? 2 : 0);
  if (stage === undefined) return null;

  const l = { date, canal, vend, stage, status: null, valor: 0, prod: '' };
  if (stage === 2) {
    const status = String(o.status || '').trim().toLowerCase();
    const valor = parseValor(o.valor);
    if (!STATUS.includes(status) || !(valor > 0)) return null;
    l.status = status;
    l.valor = valor;
    l.prod = String(o.produto || '').trim() || 'Sem produto';
  }
  return l;
}

function parseCSV(txt) {
  txt = txt.replace(/^\uFEFF/, '');
  const primeira = txt.split(/\r?\n/)[0];
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let linha = [], cel = '', aspas = false;

  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else aspas = false; }
      else cel += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      linha.push(cel); cel = '';
      if (linha.some(x => x.trim() !== '')) linhas.push(linha);
      linha = [];
    } else cel += c;
  }
  linha.push(cel);
  if (linha.some(x => x.trim() !== '')) linhas.push(linha);
  return linhas;
}

function csvParaLeads(txt) {
  const linhas = parseCSV(txt);
  if (linhas.length < 2) return { leads: [], ignoradas: 0 };
  const cab = linhas[0].map(h => h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const leads = [];
  let ignoradas = 0;
  linhas.slice(1).forEach(l => {
    const o = {};
    cab.forEach((h, i) => { o[h] = l[i]; });
    const lead = linhaParaLead(o);
    if (lead) leads.push(lead); else ignoradas++;
  });
  return { leads, ignoradas };
}

/* ---------- Salvar e carregar (datas viram texto no localStorage) ---------- */
const serializar = l => ({
  date: iso(l.date), canal: l.canal, vend: l.vend, stage: l.stage,
  status: l.status, valor: l.valor, prod: l.prod,
  ...(l.manual ? { manual: true, mid: l.mid } : {})
});
const hidratar = o => ({ ...o, date: daISO(o.date) });

async function carregarBase() {
  if (API_URL) {
    try {
      const r = await fetch(API_URL);
      const leads = (await r.json()).map(linhaParaLead).filter(Boolean);
      if (leads.length) { fonte = 'api'; return leads; }
    } catch (e) { console.warn('API indisponível, usando dados locais.', e); }
  }
  const salvo = store.get('dv_base', null);
  if (Array.isArray(salvo)) {            // lista vazia = usuário excluiu os dados
    fonte = salvo.length ? store.get('dv_fonte', 'csv') : 'vazio'; // NOVO: lembra se era exemplo ou CSV
    return salvo.map(hidratar);
  }
  fonte = 'exemplo';
  return gerar();
}

/* ---------- Monta tudo a partir de base + manuais ---------- */
function preencher(id, lista, todos) {
  const el = $(id), atual = el.value;
  el.innerHTML = `<option value="">${todos}</option>` + lista.map(x => `<option>${esc(x)}</option>`).join('');
  if (lista.includes(atual)) el.value = atual;
}
const opcoes = (id, lista) => { $(id).innerHTML = lista.map(x => `<option value="${esc(x)}">`).join(''); };

function montar() {
  DATA = base.concat(manuais);
  DATA.forEach((l, i) => { l.id = 2001 + i; });
  hoje = DATA.length ? new Date(DATA.reduce((m, l) => (l.date > m ? l.date : m), DATA[0].date)) : HOJE_REAL;

  vendedores = [...new Set(DATA.map(l => l.vend))].sort();
  canais = [...new Set(DATA.map(l => l.canal))].sort();
  produtos = [...new Set([...PROD.map(p => p[0]), ...DATA.filter(l => l.prod).map(l => l.prod)])].sort();

  preencher('fVend', vendedores, 'Todos os vendedores');
  preencher('fCanal', canais, 'Todos os canais');
  opcoes('dlProd', produtos);
  opcoes('dlCanal', canais);
  opcoes('dlVend', vendedores);

  const nome = { exemplo: 'Dados de exemplo', csv: 'Dados importados (CSV)', api: 'Dados da API' }[fonte];
  let txt;
  if (!DATA.length) txt = 'Sem dados. Cadastre uma venda ou importe um CSV.';
  else if (fonte === 'vazio') txt = `${nf(manuais.length)} venda(s) cadastrada(s)`;
  else txt = `${nome} · ${nf(base.length)} registros` + (manuais.length ? ` + ${nf(manuais.length)} venda(s) cadastrada(s)` : '');
  $('fonte').textContent = txt;

  render();
}

/* ---------- Regras de negócio ---------- */
function agg(list) {
  const pagos = list.filter(l => l.status === 'pago');
  const fat = pagos.reduce((soma, l) => soma + l.valor, 0);
  return {
    leads: list.length,
    props: list.filter(l => l.stage >= 1).length,
    pedidos: list.filter(l => l.stage >= 2).length,
    pagos: pagos.length,
    fat,                                                // faturamento
    ticket: pagos.length ? fat / pagos.length : 0,      // ticket médio
    conv: list.length ? pagos.length / list.length : 0, // conversão
    pend: list.filter(l => l.status === 'pendente').reduce((s, l) => s + l.valor, 0)
  };
}

// off = 0 período atual | off = 1 período anterior
function periodo(len, off) {
  const ini = new Date(hoje.getTime() - ((off + 1) * len - 1) * DIA);
  const fim = new Date(ini.getTime() + (len - 1) * DIA);
  return { ini, fim };
}

function filtrar(len, off, vend, canal) {
  const { ini, fim } = periodo(len, off);
  return DATA.filter(l =>
    l.date >= ini && l.date <= fim &&
    (!vend || l.vend === vend) &&
    (!canal || l.canal === canal)
  );
}

function delta(atual, anterior, tipo) {
  if (tipo === 'pp') { // pontos percentuais (usado na conversão)
    const x = (atual - anterior) * 100;
    return { t: (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + ' p.p.', up: x >= 0 };
  }
  if (!anterior) return { t: '—', up: true };
  const x = (atual - anterior) / anterior * 100;
  return { t: (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + '%', up: x >= 0 };
}

/* ---------- KPIs ---------- */
function kpi(rotulo, valor, d, destaque) {
  return `<div class="card kpi${destaque ? ' main' : ''}">
    <div class="l">${rotulo}</div>
    <div class="v">${valor}</div>
    <div class="d ${d.up ? 'up' : 'dn'}">${d.up ? '▲' : '▼'} ${d.t} <span>vs. período anterior</span></div>
  </div>`;
}

/* ---------- Série do gráfico ---------- */
// Quantos dias cada ponto representa: 7 e 30 dias = diário, 90 = semanal, 12 meses = ~mensal
const K = { 7: 1, 30: 1, 90: 7, 365: 31 };

function serie(list, len, off) {
  const k = K[len];
  const ini = periodo(len, off).ini;
  const n = Math.ceil(len / k);
  const v = Array(n).fill(0);
  const lab = [];

  list.forEach(l => {
    if (l.status === 'pago') {
      const i = Math.floor(Math.round((l.date - ini) / DIA) / k);
      v[i] += l.valor;
    }
  });
  for (let i = 0; i < n; i++) lab.push(new Date(ini.getTime() + i * k * DIA));
  return { v, lab, k };
}

/* ---------- Desenho do gráfico ---------- */
const G = { W: 760, H: 270, L: 62, B: 28, T: 10, R: 12 };

// Teto "redondo" do eixo Y (1, 2, 4, 8 ou 10 vezes uma potência de 10)
function topo(cur, prev) {
  const max = Math.max(...cur.v, ...prev.v, 100);
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 8 ? 8 : 10) * p;
}

function linha(cur, prev) {
  const n = cur.v.length, top = topo(cur, prev);
  const x = i => G.L + (n === 1 ? 0 : i * (G.W - G.L - G.R) / (n - 1));
  const y = v => G.T + (G.H - G.T - G.B) * (1 - v / top);
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');

  let g = '';
  for (let i = 0; i <= 4; i++) {
    const v = top * i / 4;
    g += `<line x1="${G.L}" x2="${G.W - G.R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>
          <text x="${G.L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mut)">${v >= 1000 ? (v / 1000).toLocaleString('pt-BR') + ' mil' : v}</text>`;
  }
  const passo = Math.ceil(n / 7);
  for (let i = 0; i < n; i += passo) {
    g += `<text x="${x(i)}" y="${G.H - 8}" text-anchor="middle" font-size="11" fill="var(--mut)">${cur.lab[i].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>`;
  }

  const area = path(cur.v) + `L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  return `<svg viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="Evolução do faturamento">
    ${g}
    <path d="${area}" fill="var(--ac)" opacity=".1"/>
    <path d="${path(prev.v)}" fill="none" stroke="var(--prev)" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="${path(cur.v)}" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-linejoin="round"/>
    <line id="gl" y1="${G.T}" y2="${G.H - G.B}" stroke="var(--mut)" opacity="0"/>
    <circle id="gd" r="5" fill="var(--ac)" stroke="var(--card)" stroke-width="2" opacity="0"/>
  </svg>`;
}

function hover(cur, prev) {
  const box = $('chart'), svg = box.querySelector('svg'), tip = $('tip');
  const n = cur.v.length, top = topo(cur, prev), k = cur.k;
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  box.onmousemove = e => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * G.W;
    const passo = (G.W - G.L - G.R) / Math.max(n - 1, 1);
    const i = Math.max(0, Math.min(n - 1, Math.round((px - G.L) / passo)));
    const cx = G.L + i * passo;
    const cy = G.T + (G.H - G.T - G.B) * (1 - cur.v[i] / top);

    $('gl').setAttribute('x1', cx); $('gl').setAttribute('x2', cx); $('gl').setAttribute('opacity', .4);
    $('gd').setAttribute('cx', cx); $('gd').setAttribute('cy', cy); $('gd').setAttribute('opacity', 1);

    const fim = new Date(cur.lab[i].getTime() + (k - 1) * DIA);
    tip.innerHTML = `<b>${k > 1 ? fmt(cur.lab[i]) + ' a ' + fmt(fim) : fmt(cur.lab[i])}</b><br>
      Atual: ${brl(cur.v[i])}<br>Anterior: ${brl(prev.v[i])}`;
    tip.style.left = (cx / G.W * r.width) + 'px';
    tip.style.top = (cy / G.H * r.height) + 'px';
    tip.style.opacity = 1;
  };
  box.onmouseleave = () => {
    tip.style.opacity = 0;
    $('gl').setAttribute('opacity', 0);
    $('gd').setAttribute('opacity', 0);
  };
}

/* ---------- Render: redesenha a tela inteira ---------- */
function render() {
  const len = +$('fPer').value, vend = $('fVend').value, canal = $('fCanal').value;
  const atual = filtrar(len, 0, vend, canal);
  const anterior = filtrar(len, 1, vend, canal);
  const a = agg(atual), b = agg(anterior), p = periodo(len, 0);

  $('periodo').textContent =
    p.ini.toLocaleDateString('pt-BR') + ' a ' + p.fim.toLocaleDateString('pt-BR') +
    (vend ? ' · ' + vend : '') + (canal ? ' · ' + canal : '');

  /* KPIs */
  $('kpis').innerHTML =
    kpi('Faturamento',       brl(a.fat),    delta(a.fat, b.fat), true) +
    kpi('Ticket médio',      brl(a.ticket), delta(a.ticket, b.ticket)) +
    kpi('Taxa de conversão', pc(a.conv),    delta(a.conv, b.conv, 'pp')) +
    kpi('Pedidos pagos',     nf(a.pagos),   delta(a.pagos, b.pagos));

  /* Gráfico */
  const sc = serie(atual, len, 0), sp = serie(anterior, len, 1);
  $('chart').innerHTML = linha(sc, sp) + '<div id="tip"></div>';
  hover(sc, sp);

  /* Meta do período: time = meta individual x nº de vendedores (mínimo 1) */
  const metaDia = vend ? META_VEND : META_VEND * Math.max(vendedores.length, 1);
  const metaTot = metaDia * len;
  const pct = a.fat / metaTot;
  $('metaRef').textContent = `${brl(metaDia)} por dia · ${len} dias`;
  $('metaV').textContent = pc(pct);
  $('metaB').style.width = Math.min(pct * 100, 100) + '%';
  $('metaB').className = pct >= 1 ? 'ok' : '';
  $('metaT').textContent = `${brl(a.fat)} de ${brl(metaTot)}` +
    (pct >= 1 ? ' · meta batida' : ' · faltam ' + brl(metaTot - a.fat));

  /* A receber */
  $('pend').textContent = brl(a.pend);

  /* Funil */
  const fv = [['Leads', a.leads], ['Propostas', a.props], ['Pedidos', a.pedidos], ['Pagos', a.pagos]];
  $('funil').innerHTML = fv.map((f, i) => {
    const sobreTotal = a.leads ? f[1] / a.leads * 100 : 0;
    const etapa = i ? pc(fv[i - 1][1] ? f[1] / fv[i - 1][1] : 0) : '100%';
    return `<div><span>${f[0]}</span>
      <span class="bar"><b style="width:${sobreTotal}%"></b></span>
      <small>${nf(f[1])} · ${etapa}</small></div>`;
  }).join('');

  /* Canais (ignora o filtro de canal) */
  const semCanal = filtrar(len, 0, vend, '');
  const porCanal = canais
    .map(c => ({ n: c, ...agg(semCanal.filter(x => x.canal === c)) }))
    .sort((x, y) => y.fat - x.fat);
  const maxC = Math.max(...porCanal.map(c => c.fat), 1);
  $('canais').innerHTML = porCanal.length
    ? porCanal.map(c =>
        `<div class="row"><span class="n">${esc(c.n)}</span>
          <span class="bar"><b style="width:${c.fat / maxC * 100}%"></b></span>
          <span class="f">${brl(c.fat)}</span><span class="c">${pc(c.conv)}</span></div>`
      ).join('')
    : '<p class="empty">Sem dados.</p>';

  /* Vendedores (ignora o filtro de vendedor) */
  const semVend = filtrar(len, 0, '', canal);
  const porVend = vendedores
    .map(v => ({ n: v, ...agg(semVend.filter(x => x.vend === v)) }))
    .sort((x, y) => y.fat - x.fat);
  $('vends').innerHTML = porVend.length
    ? porVend.map(v => {
        const m = v.fat / (META_VEND * len);
        return `<div class="row"><span class="n">${esc(v.n.split(' ')[0])}</span>
          <span class="bar"><b class="${m >= 1 ? 'ok' : ''}" style="width:${Math.min(m * 100, 100)}%"></b></span>
          <span class="f">${brl(v.fat)}</span><span class="c">${Math.round(m * 100)}%</span></div>`;
      }).join('')
    : '<p class="empty">Sem dados.</p>';

  /* Produtos */
  const pr = {};
  atual.filter(l => l.status === 'pago').forEach(l => {
    pr[l.prod] = pr[l.prod] || { q: 0, f: 0 };
    pr[l.prod].q++;
    pr[l.prod].f += l.valor;
  });
  const lista = Object.entries(pr).sort((x, y) => y[1].f - x[1].f);
  $('prods').innerHTML =
    '<tr><th>Produto</th><th class="r">Vendas</th><th class="r">Faturamento</th><th class="r">Participação</th></tr>' +
    (lista.length
      ? lista.map(([nome, v]) => `<tr><td>${esc(nome)}</td><td class="r">${nf(v.q)}</td><td class="r">${brl(v.f)}</td><td class="r">${pc(a.fat ? v.f / a.fat : 0)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty">Sem vendas no período.</td></tr>');

  /* Pedidos */
  const st = $('fStatus').value;
  const todos = atual
    .filter(l => l.stage >= 2 && (!st || l.status === st))
    .sort((x, y) => y.date - x.date || y.id - x.id);
  const ped = todos.slice(0, 10);
  $('pedInfo').textContent = `Mostrando ${ped.length} de ${nf(todos.length)}`;
  $('pedidos').innerHTML =
    '<tr><th>Pedido</th><th>Data</th><th>Produto</th><th>Canal</th><th>Vendedor</th><th class="r">Valor</th><th>Status</th><th></th></tr>' +
    (ped.length
      ? ped.map(l => `<tr>
          <td>#${l.id}${l.manual ? ' <span class="tag man">manual</span>' : ''}</td>
          <td>${l.date.toLocaleDateString('pt-BR')}</td>
          <td>${esc(l.prod)}</td><td>${esc(l.canal)}</td><td>${esc(l.vend)}</td>
          <td class="r">${brl(l.valor)}</td>
          <td><span class="tag ${l.status}">${l.status[0].toUpperCase() + l.status.slice(1)}</span></td>
          <td class="r">
            ${l.status === 'pendente' ? `<button class="pay" type="button" data-pay="${l.id}">Marcar pago</button>` : ''}
            ${l.manual ? `<button class="x" type="button" data-del="${l.mid}" title="Remover venda" aria-label="Remover venda">×</button>` : ''}
          </td>
        </tr>`).join('')
      : '<tr><td colspan="8" class="empty">Nenhum pedido com esses filtros.</td></tr>');
}

/* =========================================================
   Nova venda
   ========================================================= */
// Preenche o valor com o preço base, se o produto for conhecido
function ajustaPreco() {
  const p = PRECO[$('vProd').value.trim()];
  if (p) $('vValor').value = p;
}

$('btnVenda').addEventListener('click', () => {
  $('vData').value = iso(HOJE_REAL);
  $('vData').max = iso(HOJE_REAL);
  $('vStatus').value = 'pago';
  ['vProd', 'vCanal', 'vVend', 'vValor'].forEach(id => { $(id).value = ''; });
  $('vErro').textContent = '';
  $('dlg').showModal();
});
$('vProd').addEventListener('input', ajustaPreco);
$('vCancel').addEventListener('click', () => $('dlg').close());

$('formVenda').addEventListener('submit', e => {
  e.preventDefault();
  const data = daISO($('vData').value);
  const valor = Number($('vValor').value);
  // Se já existe um nome igual (ignorando maiúsculas), reaproveita o existente
  const casa = (lista, v) => lista.find(x => x.toLowerCase() === v.toLowerCase()) || v;
  const prod = casa(produtos, $('vProd').value.trim());
  const canal = casa(canais, $('vCanal').value.trim());
  const vend = casa(vendedores, $('vVend').value.trim());

  if (!$('vData').value || data > HOJE_REAL) { $('vErro').textContent = 'A data não pode ser futura.'; return; }
  if (!prod || !canal || !vend) { $('vErro').textContent = 'Preencha produto, canal e vendedor.'; return; }
  if (!(valor > 0)) { $('vErro').textContent = 'Informe um valor maior que zero.'; return; }

  manuais.push({
    mid: Date.now(), manual: true, date: data,
    canal, vend, stage: 2, status: $('vStatus').value,
    valor: Number(valor.toFixed(2)), prod
  });
  if (!store.set('dv_manual', manuais.map(serializar))) alert('Não foi possível salvar no navegador. A venda vale só nesta sessão.');
  $('dlg').close();
  montar();
});

// NOVO: ações da tabela de pedidos: marcar como pago e remover venda cadastrada
$('pedidos').addEventListener('click', e => {
  const pay = e.target.closest('[data-pay]');
  if (pay) {
    const l = DATA.find(x => x.id === Number(pay.dataset.pay));
    if (!l || l.status !== 'pendente') return;
    if (fonte === 'api') { alert('Os dados vêm da API. Atualize o status na origem.'); return; }
    if (!confirm(`Marcar o pedido #${l.id} (${brl(l.valor)}) como pago?`)) return;

    l.status = 'pago'; // l é o mesmo objeto de base/manuais, então a mudança já vale nos dois
    const ok = l.manual
      ? store.set('dv_manual', manuais.map(serializar))
      : store.set('dv_base', base.map(serializar)) && store.set('dv_fonte', fonte);
    if (!ok) alert('Não foi possível salvar no navegador. A mudança vale só nesta sessão.');
    render();
    return;
  }

  const del = e.target.closest('[data-del]');
  if (!del || !confirm('Remover esta venda?')) return;
  manuais = manuais.filter(m => m.mid !== Number(del.dataset.del));
  store.set('dv_manual', manuais.map(serializar));
  montar();
});

/* =========================================================
   Metas editáveis
   ========================================================= */
$('metaIn').value = META_VEND;
$('metaIn').addEventListener('change', e => {
  const v = Number(e.target.value);
  if (!(v > 0 && v <= 1e6)) { e.target.value = META_VEND; return; }
  META_VEND = v;
  store.set('dv_meta', v);
  render();
});

/* =========================================================
   Importar, exportar e excluir dados
   ========================================================= */
function baixar(nome, texto) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Célula de CSV: aspas quando precisa, vírgula decimal e proteção contra fórmulas do Excel
function cel(v) {
  if (typeof v === 'number') return String(v).replace('.', ',');
  v = String(v ?? '');
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return /[;"\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

const CABECALHO = 'data;canal;vendedor;etapa;produto;valor;status';

$('btnImp').addEventListener('click', () => $('arq').click());

$('arq').addEventListener('change', async e => {
  const arq = e.target.files[0];
  if (!arq) return;
  const { leads, ignoradas } = csvParaLeads(await arq.text());
  e.target.value = '';

  if (!leads.length) {
    alert('Nenhuma linha válida. Use "Baixar modelo" para ver o formato esperado.');
    return;
  }
  if (!confirm(`${nf(leads.length)} registros válidos (${nf(ignoradas)} linhas ignoradas).\nSubstituir os dados atuais?`)) return;

  base = leads;
  fonte = 'csv';
  store.set('dv_fonte', 'csv'); // NOVO
  if (!store.set('dv_base', leads.map(serializar))) alert('Arquivo grande demais para salvar no navegador. Os dados valem só nesta sessão.');
  montar();
});

$('btnModelo').addEventListener('click', () => {
  const d = iso(HOJE_REAL);
  baixar('modelo-vendas.csv', [
    CABECALHO,
    `${d};WhatsApp;Ana Lima;pedido;Plano Presence;497;pago`,
    `${d};Instagram;Bruno Reis;lead;;;`,
    `${d};Site;Carla Dias;proposta;;;`
  ].join('\r\n'));
});

$('btnReset').addEventListener('click', () => {
  if (!confirm('Voltar aos dados de exemplo?\nOs dados atuais (importados ou excluídos) serão substituídos. As vendas cadastradas manualmente continuam.')) return;
  store.del('dv_base');
  store.del('dv_fonte'); // NOVO
  base = gerar();
  fonte = 'exemplo';
  montar();
});

// EXCLUIR: só as vendas cadastradas pelo formulário
$('btnLimparManuais').addEventListener('click', () => {
  if (!manuais.length) { alert('Não há vendas cadastradas manualmente.'); return; }
  if (!confirm(`Excluir as ${nf(manuais.length)} venda(s) cadastrada(s)?\nEsta ação não pode ser desfeita.`)) return;
  manuais = [];
  store.del('dv_manual');
  montar();
});

// EXCLUIR: tudo (dados de exemplo/importados + vendas cadastradas). A meta é mantida.
$('btnLimparTudo').addEventListener('click', () => {
  if (!confirm('Excluir TODOS os dados?\n\nIsso apaga os dados de exemplo ou importados e as vendas cadastradas. A meta é mantida.\nNão dá para desfazer (só voltar aos dados de exemplo).')) return;
  base = [];
  manuais = [];
  fonte = 'vazio';
  store.set('dv_base', []);   // lista vazia: lembra que o usuário excluiu
  store.del('dv_fonte');      // NOVO
  store.del('dv_manual');
  montar();
});

// Exporta os pedidos do período, respeitando os filtros da tela
$('btnExp').addEventListener('click', () => {
  const len = +$('fPer').value, vend = $('fVend').value, canal = $('fCanal').value, st = $('fStatus').value;
  const linhas = filtrar(len, 0, vend, canal)
    .filter(l => l.stage >= 2 && (!st || l.status === st))
    .sort((x, y) => x.date - y.date || x.id - y.id);

  if (!linhas.length) { alert('Não há pedidos para exportar com esses filtros.'); return; }

  const p = periodo(len, 0);
  const corpo = linhas.map(l => [iso(l.date), l.canal, l.vend, 'pedido', l.prod, l.valor, l.status].map(cel).join(';'));
  baixar(`pedidos_${iso(p.ini)}_a_${iso(p.fim)}.csv`, [CABECALHO, ...corpo].join('\r\n'));
});

// PDF: usa a impressão do navegador ("Salvar como PDF"). Sempre imprime no tema claro.
let temaAntes;
window.addEventListener('beforeprint', () => {
  temaAntes = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = 'light';
});
window.addEventListener('afterprint', () => {
  if (temaAntes === undefined) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = temaAntes;
});
$('btnPdf').addEventListener('click', () => window.print());

/* =========================================================
   Tema claro/escuro
   ========================================================= */
$('tema').addEventListener('click', () => {
  const raiz = document.documentElement;
  const escuro = raiz.dataset.theme
    ? raiz.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme:dark)').matches;
  raiz.dataset.theme = escuro ? 'light' : 'dark';
});

/* =========================================================
   Inicialização
   ========================================================= */
['fPer', 'fVend', 'fCanal', 'fStatus'].forEach(id => $(id).addEventListener('change', render));

(async () => {
  base = await carregarBase();
  manuais = store.get('dv_manual', []).map(hidratar);
  montar();
})();