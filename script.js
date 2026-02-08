const elMult = document.getElementById('multiplo');
const elIni = document.getElementById('horaInicial');
const elFim = document.getElementById('horaFinal');
const elRes = document.getElementById('resultado');
const elProj = document.getElementById('saidaProjetada');
const elTab = document.getElementById('tabelaHistorico');
const CHAVE_STORAGE = 'calc_bh_data';

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
        campo.addEventListener('keydown', () => {
            campo.dataset.caret = campo.selectionStart;
            campo.dataset.len = campo.value.length;
        });
        campo.addEventListener('input', (e) => tratarMascara(e, campo));
        campo.addEventListener('blur', () => normalizar(campo));
    });
}

function tratarMascara(e, campo) {
    let v = campo.value.replace(/\D/g, '');
    if (v === "" && e.inputType?.includes('delete')) { campo.value = ""; return; }
    
    if (v.length > 6) v = v.slice(0, 6);

    let hh = v.slice(0, 2);
    let mm = v.slice(2, 4);
    let ss = v.slice(4, 6);

    // Validação de Limites
    if (hh.length === 2 && parseInt(hh) > 23) hh = "23";
    if (mm.length === 2 && parseInt(mm) > 59) mm = "59";
    if (ss.length === 2 && parseInt(ss) > 59) ss = "59";

    v = hh + mm + ss;
    let f = v.slice(0, 2);
    if (v.length > 2) f += ":" + v.slice(2, 4);
    if (v.length > 4) f += ":" + v.slice(4, 6);

    const caret = parseInt(campo.dataset.caret || "0");
    const lenAntes = parseInt(campo.dataset.len || "0");
    campo.value = f;

    let novaPos = caret + (f.length > lenAntes ? (f.length - lenAntes) : 0);
    if (e.inputType !== 'deleteContentBackward' && (novaPos === 2 || novaPos === 5)) novaPos++;
    campo.setSelectionRange(novaPos, novaPos);
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
    normalizar(elIni); normalizar(elFim);
    const m = parseFloat(elMult.value) || 1;
    const sIni = toSec(elIni.value);
    const sFim = toSec(elFim.value);

    let diff = sFim - sIni;
    if (diff < 0) diff += 86400;

    const sTotal = Math.round(diff * m);
    elRes.textContent = fromSec(sTotal);
    elProj.textContent = fromSec((sIni + sTotal) % 86400);

    salvar(m, elIni.value, elFim.value, elRes.textContent);
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

function copiarTexto(texto, btnId) {
    navigator.clipboard.writeText(texto);
    const btn = document.getElementById(btnId);
    const old = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = old, 1000);
}

function salvar(m, i, f, r) {
    const item = { data: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), m, i, f, r, id: Date.now() };
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    h.unshift(item);
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
    `).join('') || '<tr><td colspan="6" class="vazio">Nenhum cálculo</td></tr>';
}

window.remover = (id) => {
    let h = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "[]");
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(h.filter(i => i.id !== id)));
    renderizarHistorico();
};

function limparTudo() {
    if (confirm("Limpar histórico?")) { localStorage.removeItem(CHAVE_STORAGE); renderizarHistorico(); }
}
