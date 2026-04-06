# Especificação Funcional — Extensão SEI-Tag

---

## 1. Finalidade

**1.1.** Esta especificação funcional tem por objeto definir a arquitetura lógica da base de dados da extensão, as regras de edição e sincronização com Google Sheets, o comportamento das telas do popup e os critérios de validação da solução.

**1.2.** A solução adotará autenticação OAuth2 em extensão Chrome por meio da API `chrome.identity` e realizará leitura e escrita de dados em intervalos específicos de uma planilha Google Sheets, o que é compatível com o modelo oficial de autenticação para extensões e com as operações de atualização de valores da Sheets API.

**1.3.** O objetivo funcional da evolução proposta é substituir a base local por uma base centralizada, permitindo sincronização entre diferentes dispositivos do mesmo usuário, sem necessidade de tratamento complexo de concorrência simultânea ou perfis hierárquicos.

---

## 2. Estrutura da base

**2.1.** A base de dados deverá ser composta por duas abas principais no mesmo arquivo Google Sheets, denominadas `Processos_Registrados` e `Andamentos`.

**2.2.** A aba `Processos_Registrados` terá a finalidade de cadastro único dos processos e conterá os campos `Processo`, `Ativo`, `Tag` e `Status`, sendo `Processo` a chave principal e não devendo haver duplicidade desse valor na referida aba.

**2.3.** A aba `Andamentos` terá a finalidade de registro documental vinculado ao processo e conterá os campos `Processo`, `Data`, `Doc anterior`, `N_SEI`, `Assunto`, `Prazo`, `Nome_do_documento`, `Bloco SEI`, `Tag_Doc`, `Status_Doc`, `Data_Assinatura` e `Observacoes`.

**2.4.** O campo `Processo` na aba `Andamentos` será obrigatório para vinculação com a aba `Processos_Registrados`, permitindo que um mesmo processo possua múltiplos registros documentais associados.

**2.5.** A estrutura funcional final adotará cinco marcações de negócio, quais sejam: `Ativo`, `Tag`, `Status`, `Tag Doc.` e `Status Doc.`, sendo as três primeiras atributos do processo e as duas últimas atributos do andamento ou documento.

**2.6.** Essa separação tem por finalidade eliminar redundância de dados, evitar repetição indevida de `Tag` e `Status` em cada linha documental e permitir manutenção mais consistente da informação central da extensão.

### Modelo das abas

| Aba | Finalidade | Campos |
|---|---|---|
| `Processos_Registrados` | Cadastro único do processo | `Processo; Ativo; Tag; Status` |
| `Andamentos` | Histórico documental vinculado ao processo | `Processo; Data; Doc anterior; N_SEI; Assunto; Prazo; Nome_do_documento; Bloco SEI; Tag_Doc; Status_Doc; Data_Assinatura; Observacoes` |

---

## 3. Regras funcionais

**3.1. Inclusão de processo.** A inclusão de novo processo deverá criar registro apenas na aba `Processos_Registrados`, com preenchimento mínimo de `Processo`, podendo `Tag` e `Status` ser definidos no mesmo momento ou posteriormente.

**3.2. Campo Ativo.** O campo `Ativo` deverá ser validado automaticamente, conforme os processos localizados na página "Controle de Processos" do SEI. O content script identificará os números presentes na tabela ativa da página e atualizará o estado `Ativo` dos respectivos registros em `Processos_Registrados`, sem intervenção manual do usuário.

**3.3. Inclusão de andamento.** A inclusão de novo andamento somente poderá ocorrer se o número do processo já estiver registrado em `Processos_Registrados`, devendo o novo lançamento ser gravado exclusivamente na aba `Andamentos`.

**3.4. Edição de processo.** Os campos `Tag` e `Status` somente poderão ser editados na camada lógica correspondente à aba `Processos_Registrados`, ainda que sua visualização ocorra em outras telas do popup.

**3.5. Edição de andamento.** Os campos `Tag_Doc`, `Status_Doc` e os demais metadados documentais somente poderão ser editados na camada lógica correspondente à aba `Andamentos`.

**3.6. Salvamento.** As alterações realizadas no popup deverão permanecer em estado local até o acionamento do comando `Salvar alterações`, quando então a extensão executará gravação nos intervalos pertinentes da planilha mediante operações de atualização de valores.

**3.7. Sincronização.** Após cada operação de salvamento, a extensão deverá reler os intervalos afetados para confirmar o conteúdo persistido e atualizar a interface com o estado mais recente da base central.

**3.8. Sessão e acesso.** Enquanto não houver autenticação válida, a extensão deverá bloquear leitura, gravação e sincronização em Google Sheets, uma vez que o acesso depende de token e escopos concedidos à extensão.

**3.9. Escopos.** A configuração de acesso deverá observar escopos compatíveis com leitura e escrita em planilhas, conforme a documentação oficial da Sheets API.

---

## 4. Interface do popup

**4.1. Cabeçalho global.** O popup deverá possuir cabeçalho global fixo, comum a todas as telas, destinado a apresentar o contexto da página ativa, o estado da conexão Google, a identificação da planilha/aba em uso, a data e hora da última sincronização e os comandos globais da extensão.

**4.2. Botão principal.** O botão principal do cabeçalho deverá variar conforme o estado operacional, assumindo os rótulos `Conectar ao Google`, `Sincronizar agora` ou `Reconectar`, conforme exista ausência de sessão, sessão válida ou falha/expiração de autenticação.

**4.3. Indicador textual.** Ao lado do botão principal deverá constar indicador textual resumido do estado da integração, nos seguintes termos:
- **Google conectado** — em verde
- **pendente** — em amarelo
- **erro** — em vermelho

**4.4. Ações complementares.** O cabeçalho poderá conter, como ações complementares, os comandos `Salvar alterações`, `Abrir em janela` e, quando aplicável, `Desconectar` ou `Trocar conexão`.

**4.5. Tela "Processos".** Quando a página ativa corresponder a "Controle de processos", o popup deverá apresentar a tela `Processos`, contendo listagem oriunda da aba `Processos_Registrados`, com filtros por `Processo`, `Tag` e `Status`, além dos botões `Abrir em janela`, `Salvar alterações`, `Novo processo` e `Consulta processo`.

**4.6. Tela "Consulta processo".** A tela `Consulta processo` deverá funcionar como ambiente ampliado de pesquisa, permitindo visualizar registros da base com filtros por todas as colunas exibidas e navegação entre dados de processo e de andamento.

**4.7. Tela "Processo não registrado".** Quando a extensão capturar o número de um processo na página ativa e não localizar correspondência em `Processos_Registrados`, o popup deverá exibir a tela `Processo não registrado`, com o campo `Processo` previamente preenchido e campos `Tag` e `Status` disponíveis para inclusão do cadastro inicial.

**4.8. Tela "Processo [número capturado]".** Quando o número capturado existir na base, o popup deverá exibir a tela `Processo [número capturado]`, contendo, no topo, os dados de processo (`Tag` e `Status`) e, abaixo, uma grade com os registros da aba `Andamentos` vinculados àquele processo, com filtros por colunas e edição dos campos documentais.

**4.9. Filtros.** Os filtros deverão atuar apenas sobre os dados carregados na interface e não poderão alterar a planilha até a confirmação por salvamento, devendo campos vazios ser tratados como valores em branco e não como falha operacional.

### Resumo das telas

| Condição da página ativa | Tela exibida |
|---|---|
| Página "Controle de processos" | Processos |
| Página de processo — número não registrado | Processo não registrado |
| Página de processo — número registrado | Processo [número capturado] |
| Acionamento manual | Consulta processo |

---

## 5. Critérios de validação

**5.1. Integridade da base.** A solução será considerada aderente quando impedir duplicidade de `Processo` na aba `Processos_Registrados` e mantiver vínculo consistente entre `Processos_Registrados` e `Andamentos` por meio da coluna `Processo`.

**5.2. Separação lógica.** A solução será considerada aderente quando `Tag` e `Status` forem persistidos exclusivamente em `Processos_Registrados`, e `Tag_Doc`, `Status_Doc` e demais campos documentais forem persistidos exclusivamente em `Andamentos`.

**5.3. Fluxo de autenticação.** A solução será considerada aderente quando, ao abrir o popup, a extensão verificar a sessão, solicitar autenticação apenas quando necessário e usar o mecanismo de identidade compatível com extensões Chrome para obtenção de acesso ao Google.

**5.4. Fluxo de sincronização.** A solução será considerada aderente quando cumprir a sequência operacional de verificar sessão, conectar, carregar planilha, editar, salvar e sincronizar, com leitura e atualização de valores em intervalos específicos da planilha.

**5.5. Interface.** A solução será considerada aderente quando todas as telas compartilharem o mesmo cabeçalho global, com botão principal contextual e indicador textual de estado da integração.

**5.6. Usabilidade.** A solução será considerada aderente quando o usuário puder identificar claramente o contexto da página ativa, o estado da conexão, a base em uso e a existência de alterações pendentes antes do salvamento.

**5.7. Consistência de tela.** A solução será considerada aderente quando a tela `Processos` exibir apenas dados cadastrais do processo, a tela `Processo [número capturado]` combinar dados do processo com seus andamentos vinculados e a tela `Processo não registrado` permitir inclusão inicial sem exigir navegação adicional.

**5.8. Persistência.** A solução será considerada aderente quando, após o salvamento, os dados relidos da planilha refletirem o mesmo conteúdo apresentado no popup, confirmando sincronização bem-sucedida entre a interface e o Google Sheets.

**5.9. Campo Ativo.** A solução será considerada aderente quando o campo `Ativo` em `Processos_Registrados` for atualizado automaticamente pelo content script com base nos processos identificados na página "Controle de Processos", sem necessidade de edição manual pelo usuário.

---

*Elaborado com apoio de Perplexity AI.*
