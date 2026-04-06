// tela-processo.js — Tela "Processo [número capturado]"
// Bloco lógico: Popup/Options
//
// Exibida quando: número capturado da página ativa existe em Processos_Registrados
// Fonte de dados: Processos_Registrados (cabeçalho) + Andamentos (grade)
//
// Responsabilidades:
// - Exibir título com número do processo capturado
// - Mostrar campos Tag e Status do processo (editáveis)
// - Listar andamentos vinculados em grade com filtros por coluna
// - Omitir coluna Processo da grade (valor comum a toda a tela)
// - Permitir edição de todos os campos documentais
// - Expor botões: Abrir em janela, Salvar alterações
//
// TODO: implementar renderizar(), aplicarFiltros(), salvarAlteracoes()
