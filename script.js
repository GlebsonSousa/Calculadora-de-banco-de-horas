const elMult = document.getElementById('multiplo');
const elIni = document.getElementById('horaInicial');
const elFim = document.getElementById('horaFinal');
const elRes = document.getElementById('resultado');
const elProj = document.getElementById('saidaProjetada');
const elTab = document.getElementById('tabelaHistorico');
const CHAVE_STORAGE = 'calc_bh_final';

document.addEventListener('DOMContentLoaded', () => {
    configurarInputs();
    renderizarHistorico();
});

function configurarInputs() {
    document.getElementById('btnCalcular').onclick = calcular;
    document.getElementById('btnCopiar').onclick = () => copiarTexto(elRes.textContent, 'btnCopiar');
    document.getElementById('btnCopiarSaida').onclick = () => copiarTexto(elProj.textContent, 'btnCopiarSaida');
    document.getElementById('btnLimparHistorico').onclick = limparTudo;

    [elIni, elFim].forEach(campo => {
        // Salva estado do cursor antes de qualquer modificação
        campo.addEventListener('keydown', (e) => {
            campo.dataset.lastValue = campo.value;
            campo.dataset.caret = campo.selectionStart;
        });

        campo.addEventListener('input', (e) => tratarInput(e, campo));
        
        // Auto-complete (ex: digita 4 -> vira 04:00:00) ao sair do campo
        campo.addEventListener('blur', () => normalizar(campo));
        
        // Calcular ao dar Enter
        campo.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') { normalizar(campo); calcular(); }
        });
    });
}

function tratarInput(e, campo) {
    // Se o usuário estiver apagando, não força a máscara agressivamente
    if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
        return; 
    }

    let v = campo.value.replace(/\D/g, '');
    
    // Limita tamanho
    if (v.length > 6) v = v.slice(0, 6);

    // Validação Lógica de Tempo (Impedir 99 horas ou 99 minutos)
    let hh = v.slice(0, 2);
    let mm = v.slice(2, 4);
    let ss = v.slice(4, 6);

    if (hh.length === 2 && parseInt(hh) > 23) hh = "23";
    if (mm.length === 2 && parseInt(mm) > 59) mm = "59";
    if (ss.length === 2 && parseInt(ss) > 59) ss = "59";

    // Reconstrói string limpa
    v = hh + mm + ss;

    // Aplica máscara visual (HH:MM:SS)
    let f = v;
    if (v.length > 2) f = v.slice(0, 2) + ':' + v.slice(2);
    if (v.length > 4) f = f.slice(0, 5) + ':' + v.slice(4);

    const antigaPos = parseInt(campo.dataset.caret || 0);
    const antigoTamanho = (campo.dataset.lastValue || "").length;
    
    campo.value = f;

    // Lógica inteligente de cursor: empurra o cursor se adicionou caractere (incluindo os dois pontos)
    let novaPos = f.length; 
    
    // Se não estiver no final, tenta calcular onde deveria estar (mais complexo, mas aqui simplificamos para UX fluida)
    if (antigaPos < antigoTamanho) {
        // Se estava no meio, mantém a posição relativa corrigida pelos dois pontos adicionados
        let delta = f.length - antigoTamanho;
        novaPos = antigaPos + Math.max(0, delta); // Garante que não volta
    }
    
    campo.setSelectionRange(novaPos, novaPos);
}

function normalizar(campo) {
    let v = campo.value.replace(/\D/g, '');
    if (!v) return;

    // Lógica para preencher corretamente: 
    // "4" -> 04:00:00
    // "1230" -> 12:30:00
    let hh = v.slice(0, 2).padStart(2, '0');
    let mm = (v.slice(2, 4) || "00").padEnd(2, '0');
    let ss = (v.slice(4, 6) || "00").padEnd(2, '0');

    // Revalida limites após normalização
    if (parseInt(hh) > 23) hh = "23";
    if (parseInt(mm) > 59) mm = "59";
    if (parseInt(ss) > 59) ss = "59";

    campo.value = `${hh}:${mm}:${ss}`;
}

function calcular() {
    normalizar(elIni); 
    normalizar(elFim);
    
    // Converte para Float para aceitar 1.5, 2.0 etc
    const m = parseFloat(elMult.value.replace(',', '.')) || 1;
    
    const sIni = toSec(elIni.value);
    const sFim = toSec(elFim.value);

    // Cálculo da diferença (Tratamento de virada de dia)
    let diff = sFim - sIni;
    
    // Se a diferença for negativa (ex: entrou 22h, saiu 05h), soma 24h (86400s)
    if (diff < 0) diff += 86400;

    // Aplica o múltiplo
    const sTotal = Math.round(diff * m);
    
    // Formata o resultado
    elRes.textContent = fromSec(sTotal);

    // Saída Projetada: Hora Início + (Tempo Decorrido * Multiplo)
    // O % 86400 garante que se passar de 24h, o relógio zera (ex: 25:00 vira 01:00)
    const sProj = (sIni + sTotal) % 86400;
    elProj.textContent = fromSec(sProj);

    salvar(m, elIni.value, elFim.value, elRes.textContent);
}

function toSec(h) {
    if (!h) return 0;
    const p = h.split(':').map(Number);
    return (p[0] * 3600) + (p[1] * 60) + (p[2] || 0);
}

function fromSec(s) {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function copiarTexto(texto, btnId) {
    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById(btnId);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = "✓"; // Feedback visual
        setTimeout(() => btn.innerHTML = originalHtml, 1500);
    });
}

// --- Histórico ---

function salvar(m, i, f, r) {
    if(!i || !f) return;
    const item = { 
        data: new Date().toLocaleDateString('pt-BR'), 
        m, i, f, r, 
        id: Date.now() 
    };
    
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    h.unshift(item);
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(h.slice(0, 10))); // Mantém ultimos 10
    renderizarHistorico();
}

function renderizarHistorico() {
    const h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    elTab.innerHTML = h.map(i => `
        <tr>
            <td>${i.data}</td>
            <td>${i.m}</td>
            <td>${i.i}</td>
            <td>${i.f}</td>
            <td style="font-weight:bold; color:#0369a1">${i.r}</td>
            <td><button class="btn-excluir" onclick="remover(${i.id})">✕</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="vazio">Sem histórico recente</td></tr>';
}

window.remover = (id) => {
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    h = h.filter(i => i.id !== id);
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(h));
    renderizarHistorico();
};

function limparTudo() {
    if (confirm("Apagar todo o histórico?")) { 
        localStorage.removeItem(CHAVE_STORAGE); 
        renderizarHistorico(); 
    }
}
