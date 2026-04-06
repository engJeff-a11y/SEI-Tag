// auth.js — Autenticação OAuth2 via chrome.identity
// Bloco lógico: Auth/Sync
//
// Responsabilidades:
// - Obter token de acesso via chrome.identity.getAuthToken
// - Renovar token expirado via chrome.identity.removeCachedAuthToken
// - Expor estado da sessão: conectado | pendente | erro
// - Fornecer token para sheets.js e sync.js
//
// TODO: implementar getToken(), revokeToken(), getAuthState()
