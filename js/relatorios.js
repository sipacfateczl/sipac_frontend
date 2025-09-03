let dadosRelatorio = [];

function gerarRelatorio() {
    const tipo = document.getElementById("tipoRelatorio").value;
    const categoria = document.getElementById("categoriaRelatorio").value;
    const resultado = document.getElementById("resultadoRelatorio");
    const placeholder = document.getElementById("placeholderRelatorio");

    // Dados mockados
    dadosRelatorio = [
        { tag: "001", nome: "Camiseta Oversize", categoria: "camisetas", preco: 120, qtd: 10, valor: 1200 },
        { tag: "002", nome: "Calça Jeans", categoria: "calcas", preco: 200, qtd: 5, valor: 1000 },
        { tag: "003", nome: "Jaqueta Couro", categoria: "jaquetas", preco: 400, qtd: 2, valor: 800 }
    ];

    if (categoria) {
        dadosRelatorio = dadosRelatorio.filter(i => i.categoria === categoria);
    }

    let html = "<table cellpadding='6'><thead><tr><th>Tag</th><th>Peça</th><th>Categoria</th><th>Preço</th><th>Qtd</th><th>Valor Total</th></tr></thead><tbody>";
    dadosRelatorio.forEach(item => {
        html += `<tr>
          <td>${item.tag}</td>
          <td>${item.nome}</td>
          <td>${item.categoria}</td>
          <td>R$ ${item.preco.toFixed(2)}</td>
          <td>${item.qtd}</td>
          <td>R$ ${item.valor.toFixed(2)}</td>
        </tr>`;
    });
    html += "</tbody></table>";

    if (placeholder) placeholder.remove();
    resultado.classList.add("ativo");
    resultado.innerHTML = html;
}

function exportarPDF() {
    if (dadosRelatorio.length === 0) {
        return showToast("⚠️ Gere um relatório primeiro!", "error");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ======== Cabeçalho ========
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("SIPAC – Sistema de Gestão de Estoque", 105, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Relatório detalhado de estoque e saídas", 105, 28, { align: "center" });

    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.8);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Gerado em: " + new Date().toLocaleString("pt-BR"), 14, 38);

    // ======== Tabela (compacta) ========
    doc.autoTable({
        startY: 45,
        head: [["Tag", "Peça", "Categoria", "Preço", "Qtd", "Valor Total", "Saídas", "Fornecedor"]],
        body: dadosRelatorio.map(i => [
            i.tag,
            i.nome,
            i.categoria,
            "R$ " + i.preco.toFixed(2),
            i.qtd,
            "R$ " + i.valor.toFixed(2),
            i.saida !== undefined ? i.saida : 0,
            i.fornecedor || "N/A"
        ]),
        styles: {
            fontSize: 8,
            halign: "center",
            cellPadding: 2,
            textColor: [30, 30, 30],
        },
        headStyles: {
            fillColor: [124, 58, 237],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
            6: { textColor: [220, 53, 69] },
            7: { textColor: [0, 123, 255] }
        },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.2
    });

    // ======== Resumo ========
    const startResumo = doc.lastAutoTable.finalY + 8;
    const totalQtd = dadosRelatorio.reduce((a, i) => a + i.qtd, 0);
    const totalSaidas = dadosRelatorio.reduce((a, i) => a + (i.saida || 0), 0);
    const totalValor = dadosRelatorio.reduce((a, i) => a + i.valor, 0);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo do Relatório", 14, startResumo);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total de peças em estoque: ${totalQtd}`, 14, startResumo + 5);
    doc.text(`Total de saídas: ${totalSaidas}`, 14, startResumo + 10);
    doc.text(`Valor total do estoque: R$ ${totalValor.toFixed(2)}`, 14, startResumo + 15);

    // ======== Rodapé ========
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("SIPAC Ltda. – Av. Exemplo, 123 – São Paulo, SP – contato@sipac.com.br", 14, doc.internal.pageSize.getHeight() - 12);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 8);
    }

    // ======== Nome com timestamp ========
    const agora = new Date();
    const nomeArquivo = `relatorio-estoque-${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}-${String(agora.getMinutes()).padStart(2, '0')}-${String(agora.getSeconds()).padStart(2, '0')}.pdf`;

    doc.save(nomeArquivo);
    showToast("📄 PDF exportado com sucesso!", "success");
}

// =======================
// Exportar para Excel
// =======================
function exportarExcel() {
    if (dadosRelatorio.length === 0) {
        return showToast("⚠️ Gere um relatório primeiro!", "error");
    }

    const ws = XLSX.utils.json_to_sheet(dadosRelatorio.map(i => ({
        Tag: i.tag,
        Peça: i.nome,
        Categoria: i.categoria,
        Preço: "R$ " + i.preco.toFixed(2),
        Quantidade: i.qtd,
        "Valor Total": "R$ " + i.valor.toFixed(2)
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "relatorio-estoque.xlsx");

    showToast("📊 Excel exportado com sucesso!", "success");
}

// =======================
// Toast moderno
// =======================
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
