

/********************** UTIL *************************/
const BRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nowIso = () => new Date().toISOString();
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/********************** ESTADO *************************/
const LSKEY = 'estoque-iot-v1';
let db = JSON.parse(localStorage.getItem(LSKEY) || 'null') || {
    itens: [
        { tag: '001', nome: 'Camiseta Tech Dry', categoria: 'Camisetas', preco: 89.9, quantidade: 22, arara: 'A1', atualizadoEm: nowIso() },
        { tag: '002', nome: 'Calça Cargo Nylon', categoria: 'Calças', preco: 199.9, quantidade: 12, arara: 'A1', atualizadoEm: nowIso() },
        { tag: '003', nome: 'Jaqueta Corta-Vento', categoria: 'Jaquetas', preco: 349.9, quantidade: 7, arara: 'A2', atualizadoEm: nowIso() },
        { tag: '004', nome: 'Vestido Midi', categoria: 'Vestidos', preco: 229.9, quantidade: 14, arara: 'B1', atualizadoEm: nowIso() },
        { tag: '005', nome: 'Boné Logo', categoria: 'Acessórios', preco: 79.9, quantidade: 4, arara: 'B2', atualizadoEm: nowIso() },
        { tag: '006', nome: 'Camiseta Oversize', categoria: 'Camisetas', preco: 99.9, quantidade: 28, arara: 'A1', atualizadoEm: nowIso() },
        { tag: '007', nome: 'Cachecol Tricot', categoria: 'Acessórios', preco: 59.9, quantidade: 9, arara: 'B2', atualizadoEm: nowIso() },
    ],
    movimentos: [ /* {data:'2024-05-01', tipo:'entrada'|'saida', qtd:3} */]
};
const save = () => localStorage.setItem(LSKEY, JSON.stringify(db));

/********************** FILTROS *************************/
const filtro = {
    anos: new Set(['2021', '2022', '2023', '2024']),
    categorias: new Set(['Camisetas', 'Calças', 'Vestidos', 'Jaquetas', 'Acessórios']),
    precoMax: 1200,
    busca: '',
    sort: '-valor'
};

/********************** CHARTS *************************/
let chartFluxo, chartPizza, chartBar;
function buildCharts() {
    // Fluxo por mês
    const months = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short' }));
    const entradas = new Array(12).fill(0);
    const saidas = new Array(12).fill(0);
    db.movimentos.forEach(m => {
        const d = new Date(m.data); const y = d.getFullYear();
        if (!filtro.anos.has(String(y))) return;
        const i = d.getMonth();
        (m.tipo === 'entrada' ? entradas : saidas)[i] += m.qtd;
    });
    if (chartFluxo) chartFluxo.destroy();
    chartFluxo = new Chart(document.getElementById('chartFluxo'), {
        type: 'line',
        data: {
            labels: months, datasets: [
                { label: 'Entradas', data: entradas, tension: .35, borderWidth: 3, pointRadius: 3 },
                { label: 'Saídas', data: saidas, tension: .35, borderWidth: 3, pointRadius: 3 }
            ]
        },
        options: {
            responsive: true, plugins: { legend: { labels: { color: '#e9e9f7' } } }, scales: {
                x: { ticks: { color: '#c9c9f2' }, grid: { color: 'rgba(255,255,255,.06)' } },
                y: { ticks: { color: '#c9c9f2' }, grid: { color: 'rgba(255,255,255,.06)' } }
            }
        }
    });

    // Pizza categorias (quantidade)
    const porCat = {};
    db.itens.forEach(it => { if (!filtro.categorias.has(it.categoria)) return; if (it.preco > filtro.precoMax) return; porCat[it.categoria] = (porCat[it.categoria] || 0) + it.quantidade; });
    if (chartPizza) chartPizza.destroy();
    chartPizza = new Chart(document.getElementById('chartPizza'), {
        type: 'doughnut',
        data: { labels: Object.keys(porCat), datasets: [{ data: Object.values(porCat) }] },
        options: { plugins: { legend: { labels: { color: '#e9e9f7' } } } }
    });

    // Top 5 por valor total
    const top = db.itens
        .filter(it => filtro.categorias.has(it.categoria) && it.preco <= filtro.precoMax)
        .map(it => ({ ...it, valor: it.preco * it.quantidade }))
        .sort((a, b) => b.valor - a.valor).slice(0, 5);
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(document.getElementById('chartBar'), {
        type: 'bar',
        data: { labels: top.map(t => t.nome), datasets: [{ label: 'Valor total (R$)', data: top.map(t => t.valor) }] },
        options: { plugins: { legend: { labels: { color: '#e9e9f7' } } }, scales: { x: { ticks: { color: '#c9c9f2' } }, y: { ticks: { color: '#c9c9f2' } } } }
    });
}

/********************** KPIs *************************/
function updateKPIs() {
    const itensFiltrados = db.itens.filter(it => filtro.categorias.has(it.categoria) && it.preco <= filtro.precoMax && matchBusca(it));
    const valor = itensFiltrados.reduce((s, it) => s + it.preco * it.quantidade, 0);
    const qtd = itensFiltrados.reduce((s, it) => s + it.quantidade, 0);
    const baixo = itensFiltrados.filter(it => it.quantidade < 5).length;
    document.getElementById('kpiValor').textContent = BRL(valor);
    document.getElementById('kpiUnidades').textContent = qtd;
    document.getElementById('kpiBaixo').textContent = baixo;
}

/********************** RACK *************************/
function renderRack() {
    const rack = document.getElementById('rackHangers');
    rack.innerHTML = '';
    const itens = db.itens
        .filter(it => filtro.categorias.has(it.categoria) && it.preco <= filtro.precoMax && matchBusca(it))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 12);
    const step = (100 / (Math.max(itens.length, 1) + 1));
    itens.forEach((it, idx) => {
        const left = (step * (idx + 1));
        const cor = it.quantidade < 5 ? 'var(--danger)' : it.quantidade < 10 ? 'var(--warn)' : 'var(--ok)';
        const base = document.createElement('div');
        base.className = 'hanger'; base.style.left = `calc(${left}% - 32px)`;
        base.innerHTML = `
        <div class="hook"></div>
        <div class="camisa" style="background: linear-gradient(135deg, ${cor}, rgba(255,255,255,.12))"></div>
        <div class="tag">${it.nome.split(' ')[0]} · ${it.quantidade}u</div>
      `;
        rack.appendChild(base);
    });
}

/********************** TABELA *************************/
function matchBusca(it) {
    const q = filtro.busca.trim().toLowerCase();
    if (!q) return true;
    return [it.tag, it.nome, it.categoria, it.arara].join(' ').toLowerCase().includes(q);
}
function renderTable() {
    const tbody = document.getElementById('tbody');
    const itens = db.itens
        .filter(it => filtro.categorias.has(it.categoria) && it.preco <= filtro.precoMax && matchBusca(it))
        .map(it => ({ ...it, valor: it.preco * it.quantidade }))
        .sort(sorter(filtro.sort));
    tbody.innerHTML = itens.map(it => `
      <tr>
        <td>${it.tag}</td>
        <td>${it.nome}</td>
        <td><span class="pill" style="background:rgba(124,58,237,.2)">${it.categoria}</span></td>
        <td>${BRL(it.preco)}</td>
        <td>${it.quantidade}</td>
        <td>${it.arara}</td>
        <td>${new Date(it.atualizadoEm).toLocaleString('pt-BR')}</td>
        <td>${BRL(it.valor)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" onclick="editItem('${it.tag}')">✏️</button>
            <button class="icon-btn" onclick="movimentar('${it.tag}','saida')">−</button>
            <button class="icon-btn" onclick="movimentar('${it.tag}','entrada')">+</button>
            <button class="icon-btn" onclick="remover('${it.tag}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
}
function sorter(key) {
    const dir = key.startsWith('-') ? -1 : 1; const k = key.replace('-', '');
    return (a, b) => dir * ((a[k] > b[k]) - (a[k] < b[k]));
}

/********************** CRUD *************************/
const modal = document.getElementById('modal');
let editTag = null;

document.getElementById('btnAdd').onclick = () => {
    editTag = null;
    fillModal({ tag: '', nome: '', categoria: 'Camisetas', preco: 99.9, quantidade: 1, arara: 'A1' });
    modal.showModal();
};

document.getElementById('mSalvar').onclick = (e) => {
    e.preventDefault();
    const it = readModal();

    if (!it.tag || !it.nome) {
        showToast("⚠️ Preencha Tag e Nome", "error"); // substituiu o alert
        return;
    }

    const idx = db.itens.findIndex(x => x.tag === it.tag);
    it.atualizadoEm = nowIso();

    if (idx >= 0) {
        db.itens[idx] = it;
        showToast("✏️ Item atualizado com sucesso!", "success");
    } else {
        db.itens.push(it);
        showToast("✅ Item adicionado com sucesso!", "success");
    }

    save();
    modal.close();
    refresh();
};

function editItem(tag) { editTag = tag; const it = db.itens.find(x => x.tag === tag); fillModal(it); modal.showModal(); }
function fillModal(it) {
    mTag.value = it.tag; mTag.disabled = !!editTag; mNome.value = it.nome; mCat.value = it.categoria; mPreco.value = it.preco; mQtd.value = it.quantidade; mArara.value = it.arara;
}
function readModal() {
    return { tag: mTag.value.trim(), nome: mNome.value.trim(), categoria: mCat.value, preco: Number(mPreco.value), quantidade: parseInt(mQtd.value), arara: mArara.value.trim(), atualizadoEm: nowIso() };
}
function remover(tag) { if (confirm('Remover item ' + tag + '?')) { db.itens = db.itens.filter(i => i.tag !== tag); save(); refresh(); } }
function movimentar(tag, tipo) {
    const it = db.itens.find(i => i.tag === tag); if (!it) return;
    const qtd = 1; // passo de 1 unidade
    if (tipo === 'saida' && it.quantidade <= 0) return;
    it.quantidade += (tipo === 'entrada' ? +qtd : -qtd);
    it.atualizadoEm = nowIso();
    db.movimentos.push({ data: nowIso(), tipo, qtd });
    save(); refresh();
}

/********************** IOT SIMULADO *************************/
let iotTimer = null; const btnIot = document.getElementById('btnIot');
btnIot.onclick = () => {
    if (iotTimer) { clearInterval(iotTimer); iotTimer = null; btnIot.textContent = 'Conectar IoT (simular)'; return; }
    btnIot.textContent = 'Conectado (simulação)';
    iotTimer = setInterval(() => {
        // Simula leitura de tag e movimento aleatório
        const it = db.itens[random(0, db.itens.length - 1)];
        const tipo = Math.random() > .45 ? 'entrada' : 'saida';
        const qtd = random(1, 3);
        it.quantidade = Math.max(0, it.quantidade + (tipo === 'entrada' ? +qtd : -qtd));
        it.atualizadoEm = nowIso();
        db.movimentos.push({ data: nowIso(), tipo, qtd });
        save(); refresh(false); // não piscar tudo
    }, 1600);
};

/********************** EVENTOS UI *************************/
document.getElementById('search').oninput = (e) => { filtro.busca = e.target.value; refresh(false); };
document.getElementById('sort').onchange = (e) => { filtro.sort = e.target.value; refresh(false); };
document.getElementById('range-preco').oninput = (e) => { filtro.precoMax = Number(e.target.value); document.getElementById('preco-out').textContent = e.target.value; refresh(); };
document.getElementById('btnReset').onclick = () => {
    document.querySelectorAll('#filtro-ano input,#filtro-cat input').forEach(c => c.checked = true);
    filtro.anos = new Set(['2021', '2022', '2023', '2024']);
    filtro.categorias = new Set(['Camisetas', 'Calças', 'Vestidos', 'Jaquetas', 'Acessórios']);
    filtro.precoMax = 1200; document.getElementById('range-preco').value = 1200; document.getElementById('preco-out').textContent = '1200';
    filtro.busca = ''; document.getElementById('search').value = '';
    refresh();
};
document.querySelectorAll('#filtro-ano input').forEach(chk => chk.onchange = () => {
    chk.checked ? filtro.anos.add(chk.value) : filtro.anos.delete(chk.value); refresh();
});
document.querySelectorAll('#filtro-cat input').forEach(chk => chk.onchange = () => {
    chk.checked ? filtro.categorias.add(chk.value) : filtro.categorias.delete(chk.value); refresh();
});

/********************** REFRESH *************************/
function refresh(rebuild = true) {
    updateKPIs();
    renderRack();
    renderTable();
    if (rebuild) buildCharts();
}

// Inicialização
refresh();

// Seleciona todos os botões
const navButtons = document.querySelectorAll('.nav button');

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove a classe 'active' de todos
        navButtons.forEach(btn => btn.classList.remove('active'));

        // Adiciona 'active' ao clicado
        button.classList.add('active');

        // Redireciona para a página correspondente
        const page = button.getAttribute('data-page');
        if (page) window.location.href = page;
    });
});

function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
