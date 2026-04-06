// sync.js — Ciclo de sincronização entre popup e Google Sheets
// Bloco lógico: Auth/Sync
//
// Responsabilidades:
// - Orquestrar sequência: verificar sessão → carregar planilha → editar → salvar → reler
// - Manter estado local das alterações pendentes
// - Notificar popup.js sobre resultado da sincronização
//
// TODO: implementar iniciarSync(), salvarAlteracoes(), recarregarBase()
