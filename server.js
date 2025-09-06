// server.js
import express from "express";
import cors from "cors";
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

const app = express();
app.use(cors());
app.use(express.json());

// 📌 Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Firestore referência
const itensRef = collection(db, "itens");

// 📌 Listar itens
app.get("/api/itens", async (req, res) => {
  const snapshot = await getDocs(itensRef);
  const itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(itens);
});

// Adicionar item
app.post("/api/itens", async (req, res) => {
  try {
    const novoItem = {
      ...req.body,
      movimentacao: true,
      entrada: req.body.quantidade || 0,
      saida: 0,
      atualizadoEm: new Date().toISOString()
    };
    const docRef = await addDoc(itensRef, novoItem);
    res.json({ id: docRef.id, ...novoItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar item e registrar movimentação
app.put("/api/itens/:id", async (req, res) => {
  const itemDoc = doc(db, "itens", req.params.id);
  const data = req.body;

  // Se houve mudança na quantidade, atualizar entrada/saida
  const snapshot = await getDocs(itensRef);
  const itemAtual = snapshot.docs.find(d => d.id === req.params.id)?.data();

  if (itemAtual) {
    const qtdAnterior = itemAtual.quantidade || 0;
    const qtdNova = data.quantidade || qtdAnterior;

    if (qtdNova > qtdAnterior) data.entrada = (itemAtual.entrada || 0) + (qtdNova - qtdAnterior);
    if (qtdNova < qtdAnterior) data.saida = (itemAtual.saida || 0) + (qtdAnterior - qtdNova);
    
    data.movimentacao = qtdNova > 0; // true = ainda na arara
    data.atualizadoEm = new Date().toISOString();
  }

  await updateDoc(itemDoc, data);
  res.json({ id: req.params.id, ...data });
});


// 📌 Deletar item
app.delete("/api/itens/:id", async (req, res) => {
  const itemDoc = doc(db, "itens", req.params.id);
  await deleteDoc(itemDoc);
  res.json({ success: true });
});

// 📌 Rota default para index.html
app.get("/", (req, res) => {
  res.sendFile(new URL('./public/index.html', import.meta.url).pathname);
});


// Registrar saída de um item
app.put("/api/itens/:id/saida", async (req, res) => {
    const { qtd } = req.body; // quantidade que saiu
    const itemDoc = doc(db, "itens", req.params.id);

    try {
        const itemSnap = await getDoc(itemDoc);
        if (!itemSnap.exists()) return res.status(404).json({ error: "Item não encontrado" });

        const itemData = itemSnap.data();
        const novaQtd = Math.max(0, (itemData.quantidade || 0) - qtd);

        await updateDoc(itemDoc, { quantidade: novaQtd, movimentacao: novaQtd > 0 });
        res.json({ success: true, novaQtd });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get("/api/relatorio", async (req, res) => {
  try {
    const categoria = req.query.categoria || null;

    const snapshot = await getDocs(itensRef);
    let itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (categoria) {
      itens = itens.filter(item => item.categoria === categoria);
    }

    // Adicionar campos de entrada, saída e valor total
    itens = itens.map(item => {
      const entrada = item.entrada || 0;
      const saida = item.saida || 0;
      const saldo = (item.quantidade || 0); // quantidade atual
      const valor = (item.preco || 0) * saldo;
      return { ...item, entrada, saida, saldo, valor };
    });

    res.json(itens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(3000, () => console.log("API rodando em http://localhost:3000"));
