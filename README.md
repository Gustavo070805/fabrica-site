//---------------------------------------------////---------------------------------------------//


COMO QUE FUNCIONA O SISTEMA DE PRONTUÁRIO MÉDICO--->


FUNCIONALIDADES:
1- Gerenciar Pacientes:
Ele adiciona, edita e deleta os pacientes, alem de registrar os dados completos em "nome", "CPF", "Telefone", "Endereço", "Data de Nascimento", "Sexo", "Email", "Senha" e "Data de Cadastro". Além de armazenar o diagnostico e a data de nascimento do paciente.

2- Avaliação Clínicas:
Ele registra as avaliações detalhadas dos pacientes. Documenta diagnósticos, encaminhamentos e acompanhamentos. Tendo um histórico completo de avaliações do paciente.

3- Evolução Diária:
Registra as notas de consulta pela data, permitindo acompanhar a evolução do paciente ao longo do tempo. Documentando em tempo real o atendimento com o "Histórico" completo 
em ordem cronológica.

4- Controle Financeiro:
Registrar os pagamentos dos pacientes, permitindo acompanhar o fluxo de caixa do consultório e ver quanto falta receber.

5- Impressão e Exportação:
Imprimir prontuários em PDF, exportar dados em JSON com um layout responsivo para impressão.


//---------------------------------------------////---------------------------------------------//


COMO COMEÇAR--->

PRÉ-REQUISITOS:
* Node.js (v16 ou superior instalado);
* NPM (geralmente vem com o Node.js);

INSTALAÇÃO LOCAL:
1. Clone ou baixe os arquivos do projeto;
2. Instale as dependências;

CODIGO NO BASH:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm run dev
```

4. Acesse o navegador:
http://localhost:3000

BUILD PARA A PRODUÇÃO:
```bash
npm run build
```
Os arquivos compilados estarão em "/dist"

DEPLOY NO VERCEL:
Opção 1: Via Terminal que é o recomendado

1. Instale o Vercel CLI:
```bash
npm install -g vercel
```

2. Faça login no Vercel:
```bash
vercel login
```

3. Faça o deploy:
```bash
vercel
```
Seguindo as instruções no terminal, o vercel vai detectar automaticamente que é um projeto Vite + React.


Opção 2: Via GitHub(Mais Fácil)
1. Suba o projeto no GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/medical-record-system.git
git push -u origin main
```
