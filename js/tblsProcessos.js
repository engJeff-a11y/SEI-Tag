// tblsProcessos.js — Content script: leitura das tabelas do SEI
// Bloco lógico: Content script
//
// Responsabilidades:
// - Identificar e ler tblProcessosRecebidos e tblProcessosGerados
// - Extrair números de processo presentes na página ativa
// - Aplicar marcações visuais (Tag, Status) nas linhas das tabelas
// - Comparar processos encontrados com Processos_Registrados
// - Atualizar campo Ativo automaticamente com base na presença na página
//   de Controle de Processos
//
// TODO: implementar identificarTabelas(), extrairNumeros(),
//       aplicarTags(), atualizarAtivo()
