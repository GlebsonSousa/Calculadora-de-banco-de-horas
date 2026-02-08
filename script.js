// Configurações e Elementos
const CHAVE_STORAGE = 'calc_bh_v3';
const elMult = document.getElementById('multiplo');
const elIni = document.getElementById('horaInicial');
const elFim = document.getElementById('horaFinal');
const elRes = document.getElementById('resultado');
const elProj = document.getElementById('saidaProjetada');
const elTab = document.getElementById('tabelaHistorico');

document.addEventListener('DOMContentLoaded', () => {
    configurarInputs();
    renderizarHistorico();
});

function configurarInputs() {
    document.getElementById('btnCalcular').onclick = calcular;
    document.getElementById('btnCopiar').onclick = copiar;
    document.getElementById('btnLimparHistorico').onclick = limparHist;

    [elIni, elFim].forEach(campo => {
        campo.addEventListener('keydown', (e) => {
            campo.dataset.posCaret = campo.selectionStart;
            campo.dataset.lenAntes = campo.value.length;
        });

        campo.addEventListener('input', (e) => {
            let v = campo.value.replace(/\D/g, '');
            if (v === "" && e.inputType?.includes('delete')) { campo.value = ""; return; }
            if (v.length > 6) v = v.slice(0, 6);

            // Validação de limites (Máx 23:59:59)
            let hh = v.slice(0, 2);
            let mm = v.slice(2, 4);
            let ss = v.slice(4, 6);
            if (hh.length === 2 && parseInt(hh) > 23) hh = "23";
            if (mm.length === 2 && parseInt(mm) > 59) mm = "59";
            if (ss.length === 2 && parseInt(ss) > 59) ss = "59";
            v = hh + mm + ss;

            // Formatação
            let f = "";
            if (v.length > 0) {
                f = v.slice(0, 2);
                if (v.length > 2) f += ":" + v.slice(2, 4);
                if (v.length > 4) f += ":" + v.slice(4, 6);
            }

            // Reposicionamento do cursor
            const caret = parseInt(campo.dataset.posCaret || "0");
            const antes = parseInt(campo.dataset.lenAntes || "0");
            campo.value = f;
            let ajuste = f.length > antes ? (f.length - antes) : 0;
            let novaPos = caret + ajuste;
            if (e.inputType !== 'deleteContentBackward' && (novaPos === 2 || novaPos === 5)) novaPos++;
            campo.setSelectionRange(novaPos, novaPos);
        });

        campo.addEventListener('blur', () => normalizar(campo));
    });
}

function normalizar(campo) {
    let v = campo.value.replace(/\D/g, '');
    if (!v) return;
    let hh = v.slice(0, 2).padStart(2, '0');
    let mm = (v.slice(2, 4) || "00").padEnd(2, '0');
    let ss = (v.slice(4, 6) || "00").padEnd(2, '0');
    campo.value = `${hh}:${mm.slice(0,2)}:${ss.slice(0,2)}`;
}

function calcular() {
    normalizar(elIni);
    normalizar(elFim);

    const m = parseFloat(elMult.value) || 1;
    const sIni = toSec(elIni.value);
    const sFim = toSec(elFim.value);

    // Diferença real
    let diff = sFim - sIni;
    if (diff < 0) diff += 86400; 

    // Tempo decorrido com múltiplo
    const sRes = Math.round(diff * m);
    const resForm = fromSec(sRes);
    elRes.textContent = resForm;

    // Saída Projetada (Início + Tempo Calculado)
    const sProj = (sIni + sRes) % 86400;
    elProj.textContent = fromSec(sProj);

    salvar(m, elIni.value, elFim.value, resForm);
}

function toSec(h) {
    const p = h.split(':').map(Number);
    return (p[0] * 3600) + (p[1] * 60) + (p[2] || 0);
}

function fromSec(s) {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function copiar() {
    navigator.clipboard.writeText(elRes.textContent);
    const b = document.getElementById('btnCopiar');
    b.textContent = "✓";
    setTimeout(() => b.textContent = "📋", 1000);
}

function salvar(m, i, f, r) {
    const obj = { data: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), m, i, f, r, id: Date.now() };
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    h.unshift(obj);
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(h.slice(0, 10)));
    renderizarHistorico();
}

function renderizarHistorico() {
    const h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    elTab.innerHTML = h.map(i => `
        <tr>
            <td>${i.data}</td><td>${i.m}</td><td>${i.i}</td><td>${i.f}</td><td>${i.r}</td>
            <td><button class="btn-excluir" onclick="remover(${i.id})">✕</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="vazio">Nenhum cálculo realizado</td></tr>';
}

window.remover = (id) => {
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(h.filter(i => i.id !== id)));
    renderizarHistorico();
};

function limparHist() {
    if (confirm("Limpar todo o histórico?")) {
        localStorage.removeItem(CHAVE_STORAGE);
        renderizarHistorico();
    }
}
