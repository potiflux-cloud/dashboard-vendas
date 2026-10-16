/* =========================================================
   Dashboard de vendas
   ========================================================= */

/* ---------- Utilitários ---------- */
const $ = id => document.getElementById(id);
const DIA = 864e5; // 1 dia em milissegundos

const brl = v => Number(v || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2
});
const pc  = v => (v * 100).toFixed(1).replace('.', ',') + '%';
const nf  = v => v.toLocaleString('pt-BR');
const fd  = d => d.toLocaleDateString('pt-BR');
const cap = s => s[0].toUpperCase() + s.slice(1);
const compacto = v => v >= 1e6 ? 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi'
  : v >= 1e4 ? 'R$ ' + Math.round(v / 1e3) + ' mil' : brl(v);

// Dinheiro: soma em centavos inteiros para não acumular erro de arredondamento
const cent = v => Math.round(v * 100);
const somaValor = lista => lista.reduce((s, l) => s + cent(l.valor), 0) / 100;

// Escapa texto antes de colocar em innerHTML (dados importados não são confiáveis)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Datas: texto "AAAA-MM-DD" <-> Date (sempre no fuso local)
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daISO = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return new Date(NaN);
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    ? date : new Date(NaN);
};
const addDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Aceita "2026-10-15" ou "15/10/2026"
function parseData(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/), d = null;
  if (m) d = daISO(`${m[1]}-${m[2]}-${m[3]}`);
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    d = daISO(`${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`);
  }
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
let META_VEND = Number(store.get('dv_meta', 500));
if (!Number.isFinite(META_VEND) || META_VEND <= 0 || META_VEND > 1e6) META_VEND = 500; // meta individual por dia

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
    const dt = addDias(HOJE_REAL, -d);
    const dow = dt.getDay();
    const cresc = 1 + (729 - d) / 729 * .5;
    const n = Math.round((dow % 6 ? 15 : 6) * cresc * (.8 + R() * .4));

    for (let i = 0; i < n; i++) {
      const canal = pick(nomesCanal, nomesCanal.map(c => CANAL_EX[c].w));
      const c = CANAL_EX[canal];
      const vend = VEND_EX[Math.floor(R() * 4)];

      let stage = 0;
      if (R() < c.q) { stage = 1; if (R() < c.o) stage = 2; }

      const lead = { date: dt, canal, vend, stage, status: null, valor: 0, prod: '', datePag: null };

      if (stage === 2) {
        const p = pick(PROD, PROD.map(x => x[2]));
        lead.prod = p[0];
        lead.valor = Math.round(p[1] * (.92 + R() * .16));
        const r = R();
        lead.status = r < .8 ? 'pago' : r < .9 ? 'pendente' : 'cancelado';
        if (lead.status === 'pago') {
          // o cliente paga de 0 a 8 dias depois do pedido (nunca no futuro)
          const pag = addDias(dt, Math.floor(R() * 9));
          lead.datePag = pag > HOJE_REAL ? HOJE_REAL : pag;
        }
      }
      out.push(lead);
    }
  }
  return out;
}

/* ---------- Estado da aplicação ---------- */
let base = [];         // dados de exemplo, CSV ou API
let manuais = [];      // vendas cadastradas pelo formulário
let DATA = [];         // base + manuais (é o que a tela usa)
let fonte = 'exemplo'; // 'exemplo' | 'csv' | 'api' | 'vazio'
let hoje = HOJE_REAL;  // data final do período (última data dos dados)
let vendedores = [], canais = [], produtos = [];
let pedPag = 0;        // página atual da tabela de pedidos (começa em 0)
let editando = null;   // pedido em edição (null = nova venda)
let alvoPag = null;    // pedido que está sendo marcado como pago

/* ---------- Conversão de linhas (CSV / API) em leads ---------- */
// Colunas: data, canal, vendedor, etapa (lead|proposta|pedido), produto, valor, status, data_pagamento
function linhaParaLead(o) {
  const date = parseData(o.data);
  const canal = String(o.canal || '').trim();
  const vend = String(o.vendedor || '').trim();
  if (!date || !canal || !vend) return null;

  const et = String(o.etapa || '').trim().toLowerCase();
  const stage = et ? ETAPAS.get(et) : (o.status ? 2 : 0);
  if (stage === undefined) return null;

  const l = { date, canal, vend, stage, status: null, valor: 0, prod: '', datePag: null };
  if (stage === 2) {
    const status = String(o.status || '').trim().toLowerCase();
    const valor = parseValor(o.valor);
    if (!STATUS.includes(status) || !Number.isFinite(valor) || !(valor > 0) || valor > 1e12) return null;
    l.status = status;
    l.valor = Math.round(valor * 100) / 100;
    l.prod = String(o.produto || '').trim() || 'Sem produto';

    if (status === 'pago') {
      const bruto = String(o.data_pagamento ?? o.pagamento ?? '').trim();
      let pag = date; // sem data de pagamento: vale a data do pedido
      if (bruto) {
        pag = parseData(bruto);
        if (!pag || pag < date || pag > HOJE_REAL) return null; // pagamento antes do pedido ou no futuro
      }
      l.datePag = pag;
    }
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
  datePag: l.datePag ? iso(l.datePag) : null,
  ...(l.manual ? { manual: true, mid: l.mid } : {})
});

const hidratar = o => {
  if (!o || typeof o !== 'object') return null;
  const date = parseData(o.date);
  const stage = Number(o.stage);
  const valor = Number(o.valor || 0);
  const canal = String(o.canal || '').trim();
  const vend = String(o.vend || '').trim();
  if (!date || !canal || !vend || ![0, 1, 2].includes(stage)) return null;
  if (stage === 2 && (!STATUS.includes(o.status) || !Number.isFinite(valor) || valor <= 0 || valor > 1e12)) return null;

  // Dados salvos antes da data de pagamento existir: vale a data do pedido
  let datePag = null;
  if (stage === 2 && o.status === 'pago') {
    datePag = o.datePag ? parseData(o.datePag) : null;
    if (!datePag || datePag < date) datePag = date;
  }
  return {
    date, canal, vend, stage, datePag,
    status: stage === 2 ? o.status : null,
    valor: stage === 2 ? Math.round(valor * 100) / 100 : 0,
    prod: String(o.prod || '').slice(0, 120),
    ...(o.manual ? { manual: true, mid: Number(o.mid) || Date.now() } : {})
  };
};

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
    fonte = salvo.length ? store.get('dv_fonte', 'csv') : 'vazio';
    return salvo.map(hidratar).filter(Boolean);
  }
  fonte = 'exemplo';
  return gerar();
}

// Grava no navegador a lista onde o pedido está (manuais ou base)
function persistir(l) {
  if (l && l.manual) return store.set('dv_manual', manuais.map(serializar));
  return store.set('dv_base', base.map(serializar)) && store.set('dv_fonte', fonte);
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
  // O período termina na data mais recente dos dados (pedido ou pagamento)
  hoje = DATA.length
    ? new Date(DATA.reduce((m, l) => {
        const d = l.datePag && l.datePag > l.date ? l.datePag : l.date;
        return d > m ? d : m;
      }, DATA[0].date))
    : HOJE_REAL;

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
// off = 0 período atual | off = 1 período anterior
function periodo(len, off) {
  const ini = addDias(hoje, -((off + 1) * len - 1));
  const fim = addDias(ini, len - 1);
  return { ini, fim };
}

const passaFiltro = (l, vend, canal) => (!vend || l.vend === vend) && (!canal || l.canal === canal);

// Leads/pedidos que ENTRARAM no período (pela data do pedido)
function filtrar(len, off, vend, canal) {
  const { ini, fim } = periodo(len, off);
  return DATA.filter(l => l.date >= ini && l.date <= fim && passaFiltro(l, vend, canal));
}

// Pagamentos RECEBIDOS no período (pela data do pagamento)
function filtrarPag(len, off, vend, canal) {
  const { ini, fim } = periodo(len, off);
  return DATA.filter(l => l.status === 'pago' && l.datePag >= ini && l.datePag <= fim && passaFiltro(l, vend, canal));
}

/*
  Faturamento, ticket médio e pagamentos usam a DATA DO PAGAMENTO.
  Funil, conversão e "a receber" usam a DATA DO PEDIDO (coorte do período).
*/
function calc(len, off, vend, canal) {
  const ped = filtrar(len, off, vend, canal);
  const pag = filtrarPag(len, off, vend, canal);
  const fat = somaValor(pag);
  const pagosCoorte = ped.filter(l => l.status === 'pago').length;
  return {
    ped, pag, fat,
    leads: ped.length,
    props: ped.filter(l => l.stage >= 1).length,
    pedidos: ped.filter(l => l.stage >= 2).length,
    pagosCoorte,
    pagos: pag.length,
    ticket: pag.length ? fat / pag.length : 0,
    conv: ped.length ? pagosCoorte / ped.length : 0,
    pend: somaValor(ped.filter(l => l.status === 'pendente'))
  };
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

/* ---------- Série do gráfico (faturamento pela data do pagamento) ---------- */
// Quantos dias cada ponto representa: 7 e 30 dias = diário, 90 = semanal, 12 meses = ~mensal
const K = { 7: 1, 30: 1, 90: 7, 365: 31 };

function serie(pagos, len, off) {
  const k = K[len];
  const ini = periodo(len, off).ini;
  const n = Math.ceil(len / k);
  const c = Array(n).fill(0); // em centavos
  const lab = [];

  pagos.forEach(l => {
    const i = Math.floor(Math.round((l.datePag - ini) / DIA) / k);
    if (i >= 0 && i < n) c[i] += cent(l.valor);
  });
  for (let i = 0; i < n; i++) lab.push(addDias(ini, i * k));
  return { v: c.map(x => x / 100), lab, k };
}

/* ---------- Desenho do gráfico de linha ---------- */
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
          <text x="${G.L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v >= 1000 ? (v / 1000).toLocaleString('pt-BR') + ' mil' : v}</text>`;
  }
  const passo = Math.ceil(n / 7);
  for (let i = 0; i < n; i += passo) {
    g += `<text x="${x(i)}" y="${G.H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${cur.lab[i].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>`;
  }

  const area = path(cur.v) + `L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  return `<svg viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="Evolução do faturamento">
    ${g}
    <path d="${area}" fill="var(--accent)" opacity=".1"/>
    <path d="${path(prev.v)}" fill="none" stroke="var(--previous)" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="${path(cur.v)}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    <line id="gl" y1="${G.T}" y2="${G.H - G.B}" stroke="var(--muted)" opacity="0"/>
    <circle id="gd" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" opacity="0"/>
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

    const fim = addDias(cur.lab[i], k - 1);
    tip.textContent = `${k > 1 ? fmt(cur.lab[i]) + ' a ' + fmt(fim) : fmt(cur.lab[i])}\nAtual: ${brl(cur.v[i])}\nAnterior: ${brl(prev.v[i])}`;
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

/* ---------- Gráfico de rosca: faturamento por produto ---------- */
function rosca(fatias, total) {
  if (!total) {
    return `<svg viewBox="0 0 42 42" role="img" aria-label="Sem vendas no período">
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="6"/></svg>`;
  }
  let acc = 0;
  const arcos = fatias.map((f, i) => {
    const p = f.f / total * 100;
    const s = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c${i + 1})" stroke-width="6"
      stroke-dasharray="${p.toFixed(3)} ${(100 - p).toFixed(3)}" stroke-dashoffset="${(25 - acc).toFixed(3)}">
      <title>${esc(f.n)}: ${pc(f.f / total)}</title></circle>`;
    acc += p;
    return s;
  }).join('');
  return `<svg viewBox="0 0 42 42" role="img" aria-label="Participação de cada produto no faturamento">
    ${arcos}
    <text x="21" y="20.3" text-anchor="middle" font-size="3.4" fill="var(--muted)">Total</text>
    <text x="21" y="25" text-anchor="middle" font-size="3.1" font-weight="700" fill="var(--ink)">${compacto(total)}</text>
  </svg>`;
}

/* ---------- Render: redesenha a tela inteira ---------- */
function render() {
  const len = +$('fPer').value, vend = $('fVend').value, canal = $('fCanal').value;
  const a = calc(len, 0, vend, canal);
  const b = calc(len, 1, vend, canal);
  const p = periodo(len, 0);

  $('periodo').textContent =
    fd(p.ini) + ' a ' + fd(p.fim) + (vend ? ' · ' + vend : '') + (canal ? ' · ' + canal : '');

  /* KPIs */
  $('kpis').innerHTML =
    kpi('Faturamento',          brl(a.fat),    delta(a.fat, b.fat), true) +
    kpi('Ticket médio',         brl(a.ticket), delta(a.ticket, b.ticket)) +
    kpi('Taxa de conversão',    pc(a.conv),    delta(a.conv, b.conv, 'pp')) +
    kpi('Pagamentos recebidos', nf(a.pagos),   delta(a.pagos, b.pagos));

  /* Gráfico de linha */
  const sc = serie(a.pag, len, 0), sp = serie(b.pag, len, 1);
  $('chart').innerHTML = linha(sc, sp) + '<div id="tip"></div>';
  hover(sc, sp);

  /* Meta do período: time = meta individual x nº de vendedores (mínimo 1) */
  const metaDia = vend ? META_VEND : META_VEND * Math.max(vendedores.length, 1);
  const metaTot = metaDia * len;
  const pct = a.fat / metaTot;
  $('metaRef').textContent = `${brl(metaDia)} por dia · ${len} dias`;
  $('metaV').textContent = pc(pct);
  $('metaB').style.width = Math.min(pct * 100, 100) + '%';
  $('metaB').parentElement.setAttribute('aria-valuenow', String(Math.min(Math.round(pct * 100), 100)));
  $('metaB').className = pct >= 1 ? 'ok' : '';
  $('metaT').textContent = `${brl(a.fat)} de ${brl(metaTot)}` +
    (pct >= 1 ? ' · meta batida' : ' · faltam ' + brl(metaTot - a.fat));

  /* A receber */
  $('pend').textContent = brl(a.pend);

  /* Funil (coorte: pedidos que entraram no período) */
  const fv = [['Leads', a.leads], ['Propostas', a.props], ['Pedidos', a.pedidos], ['Pagos', a.pagosCoorte]];
  $('funil').innerHTML = fv.map((f, i) => {
    const sobreTotal = a.leads ? f[1] / a.leads * 100 : 0;
    const etapa = i ? pc(fv[i - 1][1] ? f[1] / fv[i - 1][1] : 0) : '100%';
    return `<div><span>${f[0]}</span>
      <span class="bar"><b style="width:${sobreTotal}%"></b></span>
      <small>${nf(f[1])} · ${etapa}</small></div>`;
  }).join('');

  /* Canais (ignora o filtro de canal) */
  const porCanal = canais
    .map(c => ({ n: c, ...calc(len, 0, vend, c) }))
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
  const porVend = vendedores
    .map(v => ({ n: v, ...calc(len, 0, v, canal) }))
    .sort((x, y) => y.fat - x.fat);
  $('vends').innerHTML = porVend.length
    ? porVend.map(v => {
        const m = v.fat / (META_VEND * len);
        return `<div class="row"><span class="n">${esc(v.n.split(' ')[0])}</span>
          <span class="bar"><b class="${m >= 1 ? 'ok' : ''}" style="width:${Math.min(m * 100, 100)}%"></b></span>
          <span class="f">${brl(v.fat)}</span><span class="c">${Math.round(m * 100)}%</span></div>`;
      }).join('')
    : '<p class="empty">Sem dados.</p>';

  /* Produtos: rosca (top 5 + outros) e tabela (top 8 + demais) */
  const pr = {};
  a.pag.forEach(l => {
    const x = pr[l.prod] || (pr[l.prod] = { q: 0, c: 0 });
    x.q++;
    x.c += cent(l.valor);
  });
  const lista = Object.entries(pr)
    .map(([n, v]) => ({ n, q: v.q, f: v.c / 100 }))
    .sort((x, y) => y.f - x.f);

  const fatias = lista.slice(0, 5);
  if (lista.length > 5) {
    fatias.push({ n: 'Outros', f: lista.slice(5).reduce((s, x) => s + cent(x.f), 0) / 100 });
  }
  $('rosca').innerHTML = rosca(fatias, a.fat);

  const dot = i => `<span class="dot" style="background:var(--c${Math.min(i, 5) + 1})"></span>`;
  const linhasProd = lista.slice(0, 8).map((x, i) =>
    `<tr><td>${dot(i)}${esc(x.n)}</td><td class="r">${nf(x.q)}</td><td class="r">${brl(x.f)}</td><td class="r">${pc(a.fat ? x.f / a.fat : 0)}</td></tr>`);
  if (lista.length > 8) {
    const resto = lista.slice(8);
    const f = resto.reduce((s, x) => s + cent(x.f), 0) / 100;
    linhasProd.push(`<tr><td>${dot(5)}Demais produtos (${nf(resto.length)})</td><td class="r">${nf(resto.reduce((s, x) => s + x.q, 0))}</td><td class="r">${brl(f)}</td><td class="r">${pc(a.fat ? f / a.fat : 0)}</td></tr>`);
  }
  $('prods').innerHTML =
    '<tr><th>Produto</th><th class="r">Vendas</th><th class="r">Faturamento</th><th class="r">Participação</th></tr>' +
    (linhasProd.length ? linhasProd.join('') : '<tr><td colspan="4" class="empty">Sem vendas no período.</td></tr>');

  /* Pedidos (com paginação) */
  const st = $('fStatus').value;
  const todos = a.ped
    .filter(l => l.stage >= 2 && (!st || l.status === st))
    .sort((x, y) => y.date - x.date || y.id - x.id);
  const tam = Number($('fTam').value) || 10;
  const paginas = Math.max(1, Math.ceil(todos.length / tam));
  pedPag = Math.min(Math.max(pedPag, 0), paginas - 1);
  const ini = pedPag * tam;
  const ped = todos.slice(ini, ini + tam);

  $('pedInfo').textContent = todos.length ? `${nf(ini + 1)}–${nf(ini + ped.length)} de ${nf(todos.length)}` : '0 pedidos';
  $('pgInfo').textContent = `Página ${nf(pedPag + 1)} de ${nf(paginas)}`;
  $('pgPrev').disabled = pedPag === 0;
  $('pgNext').disabled = pedPag >= paginas - 1;
  $('pager').hidden = paginas <= 1;

  $('pedidos').innerHTML =
    '<tr><th>Pedido</th><th>Data</th><th>Produto</th><th>Canal</th><th>Vendedor</th><th class="r">Valor</th><th>Status</th><th>Pago em</th><th></th></tr>' +
    (ped.length
      ? ped.map(l => `<tr>
          <td>#${l.id}${l.manual ? ' <span class="tag man">manual</span>' : ''}</td>
          <td>${fd(l.date)}</td>
          <td>${esc(l.prod)}</td><td>${esc(l.canal)}</td><td>${esc(l.vend)}</td>
          <td class="r">${brl(l.valor)}</td>
          <td><span class="tag ${l.status}">${cap(l.status)}</span></td>
          <td>${l.datePag ? fd(l.datePag) : '—'}</td>
          <td class="r acoes">
            ${l.status === 'pendente' ? `<button class="pay" type="button" data-act="pay" data-id="${l.id}">Marcar pago</button>` : ''}
            <button class="x ed" type="button" data-act="edit" data-id="${l.id}" title="Editar pedido" aria-label="Editar pedido #${l.id}">✎</button>
            <button class="x" type="button" data-act="del" data-id="${l.id}" title="Remover pedido" aria-label="Remover pedido #${l.id}">×</button>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="9" class="empty">Nenhum pedido com esses filtros.</td></tr>');
}

/* =========================================================
   Nova venda / editar venda
   ========================================================= */
// Mostra o campo "Data do pagamento" só quando o status é "pago"
function syncPag() {
  const pago = $('vStatus').value === 'pago';
  $('boxPag').hidden = !pago;
  $('vPag').required = pago;
  if (pago) {
    $('vPag').min = $('vData').value;
    if (!$('vPag').value || $('vPag').value < $('vData').value) $('vPag').value = $('vData').value;
  }
}

function abrirForm(l) {
  editando = l || null;
  $('dialogTitle').textContent = l ? `Editar pedido #${l.id}` : 'Nova venda';
  $('vSalvar').textContent = l ? 'Salvar alterações' : 'Salvar venda';
  $('vData').max = iso(HOJE_REAL);
  $('vPag').max = iso(HOJE_REAL);
  $('vData').value = iso(l ? l.date : HOJE_REAL);
  $('vStatus').value = l ? l.status : 'pago';
  $('vProd').value = l ? l.prod : '';
  $('vCanal').value = l ? l.canal : '';
  $('vVend').value = l ? l.vend : '';
  $('vValor').value = l ? l.valor : '';
  $('vPag').value = l && l.datePag ? iso(l.datePag) : '';
  $('vErro').textContent = '';
  syncPag();
  $('dlg').showModal();
}

// Ao digitar um produto conhecido, sugere o preço (só em venda nova)
function ajustaPreco() {
  if (editando) return;
  const p = PRECO[$('vProd').value.trim()];
  if (p) $('vValor').value = p;
}

$('btnVenda').addEventListener('click', () => abrirForm(null));
$('vProd').addEventListener('input', ajustaPreco);
$('vStatus').addEventListener('change', syncPag);
$('vData').addEventListener('change', syncPag);
$('vCancel').addEventListener('click', () => $('dlg').close());
$('vCancelTop')?.addEventListener('click', () => $('dlg').close());

$('formVenda').addEventListener('submit', e => {
  e.preventDefault();
  const erro = m => { $('vErro').textContent = m; };
  const data = daISO($('vData').value);
  const valor = Number($('vValor').value);
  const status = $('vStatus').value;
  // Se já existe um nome igual (ignorando maiúsculas), reaproveita o existente
  const casa = (lista, v) => lista.find(x => x.toLowerCase() === v.toLowerCase()) || v;
  const prod = casa(produtos, $('vProd').value.trim());
  const canal = casa(canais, $('vCanal').value.trim());
  const vend = casa(vendedores, $('vVend').value.trim());

  if (!$('vData').value || Number.isNaN(data.getTime())) return erro('Informe uma data válida.');
  if (data > HOJE_REAL) return erro('A data do pedido não pode ser futura.');
  if (!prod || !canal || !vend) return erro('Preencha produto, canal e vendedor.');
  if (!Number.isFinite(valor) || !(valor > 0) || valor > 1e12) return erro('Informe um valor válido, maior que zero e até R$ 1 trilhão.');

  let datePag = null;
  if (status === 'pago') {
    datePag = daISO($('vPag').value);
    if (Number.isNaN(datePag.getTime())) return erro('Informe a data do pagamento.');
    if (datePag < data) return erro('O pagamento não pode ser anterior ao pedido.');
    if (datePag > HOJE_REAL) return erro('A data do pagamento não pode ser futura.');
  }

  const dados = { date: data, canal, vend, prod, status, valor: Math.round(valor * 100) / 100, datePag };
  let l = editando;
  if (l) Object.assign(l, dados);
  else {
    l = { ...dados, stage: 2, manual: true, mid: Date.now() + Math.floor(Math.random() * 1000) };
    manuais.push(l);
  }
  if (!persistir(l)) alert('Não foi possível salvar no navegador. A alteração vale só nesta sessão.');
  $('dlg').close();
  montar();
});

/* =========================================================
   Marcar como pago (com data do pagamento)
   ========================================================= */
function abrirPagamento(l) {
  alvoPag = l;
  $('pagInfo').textContent = `Pedido #${l.id} · ${l.prod} · ${brl(l.valor)} · feito em ${fd(l.date)}`;
  $('pagData').min = iso(l.date);
  $('pagData').max = iso(HOJE_REAL);
  $('pagData').value = iso(HOJE_REAL < l.date ? l.date : HOJE_REAL);
  $('pagErro').textContent = '';
  $('dlgPag').showModal();
}

$('pagCancel').addEventListener('click', () => $('dlgPag').close());

$('formPag').addEventListener('submit', e => {
  e.preventDefault();
  const l = alvoPag;
  const d = daISO($('pagData').value);
  if (!l || l.status !== 'pendente') { $('dlgPag').close(); return; }
  if (Number.isNaN(d.getTime())) { $('pagErro').textContent = 'Informe uma data válida.'; return; }
  if (d < l.date) { $('pagErro').textContent = 'O pagamento não pode ser anterior ao pedido.'; return; }
  if (d > HOJE_REAL) { $('pagErro').textContent = 'A data do pagamento não pode ser futura.'; return; }

  l.status = 'pago';
  l.datePag = d;
  if (!persistir(l)) alert('Não foi possível salvar no navegador. A mudança vale só nesta sessão.');
  alvoPag = null;
  $('dlgPag').close();
  montar();
});

/* =========================================================
   Ações da tabela de pedidos
   ========================================================= */
$('pedidos').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const l = DATA.find(x => x.id === Number(btn.dataset.id));
  if (!l) return;
  if (fonte === 'api') { alert('Os dados vêm da API. Altere o pedido na origem.'); return; }

  if (btn.dataset.act === 'pay') { if (l.status === 'pendente') abrirPagamento(l); return; }
  if (btn.dataset.act === 'edit') { abrirForm(l); return; }

  if (btn.dataset.act === 'del') {
    if (!confirm(`Remover o pedido #${l.id} (${brl(l.valor)})?\nEsta ação não pode ser desfeita.`)) return;
    if (l.manual) manuais = manuais.filter(x => x !== l);
    else { base = base.filter(x => x !== l); if (!base.length) fonte = 'vazio'; }
    persistir(l);
    montar();
  }
});

/* ---------- Paginação ---------- */
$('pgPrev').addEventListener('click', () => { pedPag--; render(); });
$('pgNext').addEventListener('click', () => { pedPag++; render(); });

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

const CABECALHO = 'data;canal;vendedor;etapa;produto;valor;status;data_pagamento';

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
  store.set('dv_fonte', 'csv');
  if (!store.set('dv_base', leads.map(serializar))) alert('Arquivo grande demais para salvar no navegador. Os dados valem só nesta sessão.');
  pedPag = 0;
  montar();
});

$('btnModelo').addEventListener('click', () => {
  const d = iso(HOJE_REAL);
  baixar('modelo-vendas.csv', [
    CABECALHO,
    `${d};WhatsApp;Ana Lima;pedido;Plano Presence;497;pago;${d}`,
    `${d};Site;Diego Melo;pedido;Landing Page;1290;pendente;`,
    `${d};Instagram;Bruno Reis;lead;;;;`,
    `${d};Site;Carla Dias;proposta;;;;`
  ].join('\r\n'));
});

$('btnReset').addEventListener('click', () => {
  if (!confirm('Voltar aos dados de exemplo?\nOs dados atuais (importados, editados ou excluídos) serão substituídos. As vendas cadastradas manualmente continuam.')) return;
  store.del('dv_base');
  store.del('dv_fonte');
  base = gerar();
  fonte = 'exemplo';
  pedPag = 0;
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
  pedPag = 0;
  store.set('dv_base', []);   // lista vazia: lembra que o usuário excluiu
  store.del('dv_fonte');
  store.del('dv_manual');
  montar();
});

// Exporta os pedidos do período (pela data do pedido), respeitando os filtros da tela
$('btnExp').addEventListener('click', () => {
  const len = +$('fPer').value, vend = $('fVend').value, canal = $('fCanal').value, st = $('fStatus').value;
  const linhas = filtrar(len, 0, vend, canal)
    .filter(l => l.stage >= 2 && (!st || l.status === st))
    .sort((x, y) => x.date - y.date || x.id - y.id);

  if (!linhas.length) { alert('Não há pedidos para exportar com esses filtros.'); return; }

  const p = periodo(len, 0);
  const corpo = linhas.map(l =>
    [iso(l.date), l.canal, l.vend, 'pedido', l.prod, l.valor, l.status, l.datePag ? iso(l.datePag) : ''].map(cel).join(';'));
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
// Trocar qualquer filtro volta a tabela de pedidos para a página 1
['fPer', 'fVend', 'fCanal', 'fStatus', 'fTam'].forEach(id =>
  $(id).addEventListener('change', () => { pedPag = 0; render(); }));

(async () => {
  base = await carregarBase();
  const salvosManuais = store.get('dv_manual', []);
  manuais = Array.isArray(salvosManuais)
    ? salvosManuais.map(hidratar).filter(Boolean).map(l => ({ ...l, manual: true }))
    : [];
  montar();
})();