// popup.js — Inicialização do popup e roteamento de telas
// Bloco lógico: Popup/Options
//
// Responsabilidades:
// - Inicializar o popup ao abrir
// - Detectar a página ativa via chrome.tabs
// - Rotear para a tela correta conforme contexto:
//     Controle de Processos → tela-processos
//     Processo encontrado   → tela-processo
//     Processo não encontrado → tela-nao-registrado
//     Acionamento manual    → tela-consulta
// - Renderizar o cabeçalho global com estado de conexão
//
// TODO: implementar init(), detectarPagina(), rotearTela(), renderizarCabecalho()
