// Elementos do DOM
const elementoMultiplo = document.getElementById('multiplo');
const elementoHoraInicial = document.getElementById('horaInicial');
const elementoHoraFinal = document.getElementById('horaFinal');
const elementoResultado = document.getElementById('resultado');
const botaoCalcular = document.getElementById('btnCalcular');
const botaoCopiar = document.getElementById('btnCopiar');
const botaoLimparHistorico = document.getElementById('btnLimparHistorico');
const tabelaHistorico = document.getElementById('tabelaHistorico');

const CHAVE_HISTORICO = 'calculadoraBH_historico';

document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    carregarHistorico();
});

function configurarEventos() {
    botaoCalcular.addEventListener('click', calcularTempo);
    botaoCopiar.addEventListener('click', copiarResultado);
    botaoLimparHistorico.addEventListener('click', limparTodoHistorico);
    
    const camposHora = [elementoHoraInicial, elementoHoraFinal];
    camposHora.forEach(campo => {
        // Captura a posição do cursor ANTES da alteração
        campo.addEventListener('keydown', (e) => {
            campo.dataset.posicaoCaret = campo.selectionStart;
            campo.dataset.comprimentoAntes = campo.value.length;
        });

        campo.addEventListener('input', (e) => tratarInputHora(e));
        
        // Validação final e preenchimento de zeros apenas ao SAIR do campo
        campo.addEventListener('blur', () => normalizarPreenchimento(campo));
    });

    [elementoMultiplo, elementoHoraInicial, elementoHoraFinal].forEach(el => {
        el.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') {
                normalizarPreenchimento(elementoHoraInicial);
                normalizarPreenchimento(elementoHoraFinal);
                calcularTempo(); 
            }
        });
    });
}

function tratarInputHora(evento) {
    const campo = evento.target;
    let valor = campo.value.replace(/\D/g, ''); // Apenas números
    
    // Se o usuário apagou tudo, permitimos o campo vazio
    if (valor === "" && (evento.inputType === 'deleteContentBackward' || evento.inputType === 'deleteContentForward')) {
        campo.value = "";
        return;
    }

    // Limita a 6 dígitos
    if (valor.length > 6) valor = valor.slice(0, 6);

    // Validação de limites (Máximo 23:59:59)
    let hh = valor.slice(0, 2);
    let mm = valor.slice(2, 4);
    let ss = valor.slice(4, 6);

    if (hh.length === 2 && parseInt(hh) > 23) hh = "23";
    if (mm.length === 2 && parseInt(mm) > 59) mm = "59";
    if (ss.length === 2 && parseInt(ss) > 59) ss = "59";

    valor = hh + mm + ss;

    // Formatação com dois pontos (Máscara)
    let formatado = "";
    if (valor.length > 0) {
        formatado = valor.slice(0, 2);
        if (valor.length > 2) formatado += ":" + valor.slice(2, 4);
        if (valor.length > 4) formatado += ":" + valor.slice(4, 6);
    }

    // Cálculo inteligente da posição do cursor para não travar ao apagar
    const caretAntigo = parseInt(campo.dataset.posicaoCaret || "0");
    const lenAntes = parseInt(campo.dataset.comprimentoAntes || "0");
    
    campo.value = formatado;

    // Se o tamanho aumentou (digitou), empurramos o cursor. Se diminuiu (apagou), mantemos.
    let ajuste = formatado.length > lenAntes ? (formatado.length - lenAntes) : 0;
    let novaPosicao = caretAntigo + ajuste;

    // Ajuste extra para não ficar "preso" atrás do sinal de ":"
    if (evento.inputType !== 'deleteContentBackward') {
        if (novaPosicao === 2 || novaPosicao === 5) novaPosicao++;
    }

    campo.setSelectionRange(novaPosicao, novaPosicao);
}

function normalizarPreenchimento(campo) {
    let valor = campo.value.replace(/\D/g, '');
    if (valor === "") return;

    // Transforma "4" em "04:00:00" em vez de "40:00:00"
    let hh = valor.slice(0, 2);
    let mm = valor.slice(2, 4);
    let ss = valor.slice(4, 6);

    if (hh.length === 1) hh = "0" + hh;
    if (mm === "") mm = "00"; else if (mm.length === 1) mm = mm + "0";
    if (ss === "") ss = "00"; else if (ss.length === 1) ss = ss + "0";

    campo.value = `${hh.slice(0,2)}:${mm.slice(0,2)}:${ss.slice(0,2)}`;
}

// --- Funções de Cálculo e Histórico Mantidas ---

function calcularTempo() {
    normalizarPreenchimento(elementoHoraInicial);
    normalizarPreenchimento(elementoHoraFinal);

    const mult = parseInt(elementoMultiplo.value) || 1;
    const hIni = elementoHoraInicial.value;
    const hFim = elementoHoraFinal.value;

    if (hIni.length < 8 || hFim.length < 8) return;

    const sIni = convSeg(hIni);
    const sFim = convSeg(hFim);

    let diff = sFim - sIni;
    if (diff < 0) diff += 86400; 

    const totalSeg = diff * mult;
    const res = formSeg(totalSeg);

    elementoResultado.textContent = res;
    salvarHistorico(mult, hIni, hFim, res);
}

function convSeg(h) {
    const p = h.split(':').map(Number);
    return (p[0] * 3600) + (p[1] * 60) + (p[2] || 0);
}

function formSeg(s) {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function copiarResultado() {
    navigator.clipboard.writeText(elementoResultado.textContent).then(() => {
        const original = botaoCopiar.textContent;
        botaoCopiar.textContent = "✓";
        setTimeout(() => botaoCopiar.textContent = original, 1500);
    });
}

function salvarHistorico(mult, ini, fim, res) {
    const registro = {
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        mult, ini, fim, res,
        id: Date.now()
    };
    let h = JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || "[]");
    h.unshift(registro);
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(h.slice(0, 10)));
    renderizarHistorico();
}

function carregarHistorico() { renderizarHistorico(); }

function renderizarHistorico() {
    const h = JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || "[]");
    tabelaHistorico.innerHTML = h.length ? "" : '<tr><td colspan="6" class="vazio">Nenhum cálculo realizado</td></tr>';
    h.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.data}</td><td>${item.mult}</td><td>${item.ini}</td><td>${item.fim}</td><td>${item.res}</td><td class="coluna-acoes"><button class="btn-excluir" onclick="excluirItem(${item.id})">✕</button></td>`;
        tabelaHistorico.appendChild(tr);
    });
}

window.excluirItem = (id) => {
    let h = JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || "[]");
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(h.filter(i => i.id !== id)));
    renderizarHistorico();
};

function limparTodoHistorico() {
    if (confirm("Limpar histórico?")) {
        localStorage.removeItem(CHAVE_HISTORICO);
        renderizarHistorico();
    }
}