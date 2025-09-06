/********************** UTIL *************************/
const BRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nowIso = () => new Date().toISOString();
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/********************** ESTADO VIA API *************************/
const API_URL = "http://localhost:3000/api";
let db = { itens: [], movimentos: [] };

async function loadData() {
    const res = await fetch(`${API_URL}/itens`);
    db.itens = await res.json();
    refresh();
}

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
    // --- FLUXO POR MÊS ---
    const months = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'short' }));
    const entradas = new Array(12).fill(0);
    const saidas = new Array(12).fill(0);

    db.movimentos.forEach(m => {
        const d = new Date(m.data);
        const i = d.getMonth();
        m.tipo === 'entrada' ? entradas[i] += m.qtd : saidas[i] += m.qtd;
    });

    if (chartFluxo) chartFluxo.destroy();
    chartFluxo = new Chart(document.getElementById('chartFluxo'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Entradas', data: entradas, borderColor: 'green', backgroundColor: 'rgba(0,255,0,0.1)', tension: 0.4 },
                { label: 'Saídas', data: saidas, borderColor: 'red', backgroundColor: 'rgba(255,0,0,0.1)', tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e9e9f7' } } },
            scales: { x: { ticks: { color: '#c9c9f2' } }, y: { ticks: { color: '#c9c9f2' } } }
        }
    });

    // --- ESTOQUE POR CATEGORIA ---
    const porCat = {};
    db.itens.forEach(it => {
        if (!filtro.categorias.has(it.categoria)) return;
        if (it.preco > filtro.precoMax) return;
        porCat[it.categoria] = (porCat[it.categoria] || 0) + it.quantidade;
    });

    if (chartPizza) chartPizza.destroy();
    chartPizza = new Chart(document.getElementById('chartPizza'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(porCat),
            datasets: [{ 
                data: Object.values(porCat), 
                backgroundColor: ['#7C3AED','#2563EB','#F59E0B','#EF4444','#10B981'] 
            }]
        },
        options: { plugins: { legend: { labels: { color: '#e9e9f7' } } } }
    });

    // --- TOP 5 POR VALOR ---
    const top = db.itens
        .filter(it => filtro.categorias.has(it.categoria) && it.preco <= filtro.precoMax)
        .map(it => ({ ...it, valor: it.preco * it.quantidade }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

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
        const left = step * (idx + 1);
        const cor = it.quantidade < 5 ? 'var(--danger)' : it.quantidade < 10 ? 'var(--warn)' : 'var(--ok)';
        const base = document.createElement('div');
        base.className = 'hanger';
        base.style.left = `calc(${left}% - 32px)`;
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
        </tr>
    `).join('');
}

function sorter(key) {
    const dir = key.startsWith('-') ? -1 : 1;
    const k = key.replace('-', '');
    return (a, b) => dir * ((a[k] > b[k]) - (a[k] < b[k]));
}


/********************** CRUD VIA API *************************/
const modal = document.getElementById('modal');
let editTag = null;

document.getElementById('btnAdd').onclick = () => {
    editTag = null;
    fillModal({ tag: '', nome: '', categoria: 'Camisetas', preco: 99.9, quantidade: 1, arara: 'A1' });
    modal.showModal();
};

document.getElementById('mSalvar').onclick = async (e) => {
    e.preventDefault();
    const it = readModal();
    if (!it.tag || !it.nome) { showToast("⚠️ Preencha Tag e Nome", "error"); return; }

    it.atualizadoEm = nowIso();
    const idx = db.itens.findIndex(x => x.tag === it.tag);

    if (idx >= 0) {
        // UPDATE
        await fetch(`${API_URL}/itens/${db.itens[idx].id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it) });
        showToast("✏️ Item atualizado com sucesso!", "success");
    } else {
        // CREATE
        const res = await fetch(`${API_URL}/itens`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it) });
        const novo = await res.json();
        db.itens.push(novo);
        showToast("✅ Item adicionado com sucesso!", "success");
    }

    modal.close();
    loadData();
};

function editItem(tag) {
    editTag = tag;
    const it = db.itens.find(x => x.tag === tag);
    fillModal(it);
    modal.showModal();
}

function fillModal(it) {
    mTag.value = it.tag; mTag.disabled = !!editTag;
    mNome.value = it.nome; mCat.value = it.categoria;
    mPreco.value = it.preco; mQtd.value = it.quantidade;
    mArara.value = it.arara;
}

function readModal() {
    return {
        tag: mTag.value.trim(),
        nome: mNome.value.trim(),
        categoria: mCat.value,
        preco: Number(mPreco.value),
        quantidade: parseInt(mQtd.value),
        arara: mArara.value.trim(),
        atualizadoEm: nowIso()
    };
}

async function remover(tag) {
    const item = db.itens.find(i => i.tag === tag);
    if (!item) return;
    if (confirm('Remover item ' + tag + '?')) {
        await fetch(`${API_URL}/itens/${item.id}`, { method: "DELETE" });
        showToast("🗑️ Item removido!", "success");
        loadData();
    }
}
function registrarSaida(id, quantidadeQueSaiu) {
  fetch(`/api/itens/${id}/saida`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qtd: quantidadeQueSaiu })
  })
  .then(res => res.json())
  .then(data => {
      if (data.success) {
          showToast("✅ Saída registrada!", "success");
          gerarRelatorio(); // atualizar relatório
      } else {
          showToast("⚠️ Erro ao registrar saída", "error");
      }
  })
  .catch(err => {
      console.error(err);
      showToast("⚠️ Erro de conexão", "error");
  });
}



async function movimentar(tag, tipo) {
    const it = db.itens.find(i => i.tag === tag);
    if (!it) return;
    const qtd = 1;
    if (tipo === 'saida' && it.quantidade <= 0) return;

    const novoItem = { ...it, quantidade: it.quantidade + (tipo === "entrada" ? qtd : -qtd), atualizadoEm: nowIso() };
    await fetch(`${API_URL}/itens/${it.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novoItem) });

    db.movimentos.push({ data: nowIso(), tipo, qtd });
    showToast(`📦 ${tipo === "entrada" ? "Entrada" : "Saída"} registrada!`, "info");

    refresh(true); // Atualiza gráficos e tela
}

/********************** IOT SIMULADO *************************/
let iotTimer = null;
const btnIot = document.getElementById('btnIot');

btnIot.onclick = () => {
    if (iotTimer) { clearInterval(iotTimer); iotTimer = null; btnIot.textContent = 'Conectar IoT (simular)'; return; }
    btnIot.textContent = 'Conectado (simulação)';
    iotTimer = setInterval(async () => {
        const it = db.itens[random(0, db.itens.length - 1)];
        const tipo = Math.random() > 0.45 ? 'entrada' : 'saida';
        const qtd = random(1, 3);
        const novoItem = { ...it, quantidade: Math.max(0, it.quantidade + (tipo === "entrada" ? qtd : -qtd)), atualizadoEm: nowIso() };
        await fetch(`${API_URL}/itens/${it.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novoItem) });

        db.movimentos.push({ data: nowIso(), tipo, qtd });
        refresh(true);
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

document.querySelectorAll('#filtro-ano input').forEach(chk => chk.onchange = () => { chk.checked ? filtro.anos.add(chk.value) : filtro.anos.delete(chk.value); refresh(); });
document.querySelectorAll('#filtro-cat input').forEach(chk => chk.onchange = () => { chk.checked ? filtro.categorias.add(chk.value) : filtro.categorias.delete(chk.value); refresh(); });

/********************** REFRESH *************************/
function refresh(rebuild = true) {
    updateKPIs();
    renderRack();
    renderTable();
    if (rebuild) buildCharts();
}

/********************** NAVEGAÇÃO & TOAST *************************/
const navButtons = document.querySelectorAll('.nav button');
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
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
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
}

/********************** SIDEBAR MOBILE *************************/
const btnMenu = document.getElementById('btnMenu');
const sidebar = document.querySelector('.sidebar');

btnMenu.addEventListener('click', () => {
    sidebar.classList.toggle('show');
    btnMenu.classList.toggle('active');
});

document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 1100) { sidebar.classList.remove('show'); btnMenu.classList.remove('active'); }
        const page = btn.dataset.page; if (page) window.location.href = page;
    });
});

document.addEventListener('click', (e) => {
    if (window.innerWidth > 1100) return;
    if (!sidebar.contains(e.target) && !btnMenu.contains(e.target)) {
        sidebar.classList.remove('show');
        btnMenu.classList.remove('active');
    }
});

// Inicialização
loadData();
