# Central de suporte

Neste projeto, construí uma central de atendimento para acompanhar dúvidas sobre pedidos e entregas. Posso conversar com o cliente pelo chat, consultar as informações do pedido e acompanhar as respostas automáticas ou sugestões do assistente.

Os atendimentos de exemplo são fictícios. A aplicação funciona sem credenciais externas no modo de demonstração; quando configuro uma chave da OpenAI, o servidor usa o modelo configurado para gerar as respostas.

## O que consigo demonstrar

- Alternar entre atendimentos e consultar cliente, pedido e pagamento.
- Enviar uma resposta como atendente pelo chat.
- Ligar ou pausar as respostas automáticas.
- Simular uma nova mensagem de cliente e acompanhar a resposta automática no histórico.
- Pedir uma sugestão separada, revisar o texto e colocá-lo no campo antes de enviar.
- Adiar ou resolver um atendimento, adicionar notas internas e filtrar a fila.

Mensagens, status e notas ficam salvos no armazenamento local do navegador. Não conectei a aplicação a um canal real de atendimento.

## Tecnologias

- Next.js e React
- TypeScript
- Tailwind CSS
- OpenAI API, opcional
- Docker e Docker Compose

## Como executo localmente

Preciso do Node.js instalado. Na pasta do projeto, instalo as dependências e inicio o servidor:

```bash
npm install
npm run dev
```

No PowerShell do Windows, uso `npm.cmd` se a política de execução bloquear `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
```

Depois abro `http://localhost:3000` no navegador.

Para gerar e iniciar a versão de produção local, executo:

```bash
npm run build
npm start
```

No PowerShell, troco `npm` por `npm.cmd` nos dois comandos.

## Como configuro a OpenAI

Copio `.env.example` para `.env.local` e preencho a chave localmente:

```env
OPENAI_API_KEY=minha_chave
OPENAI_MODEL=gpt-4o-mini
```

Não envio `.env.local` ao GitHub. Para configurar o deploy, adiciono `OPENAI_API_KEY` nas variáveis de ambiente do projeto na Vercel. Sem a chave, a aplicação usa dados e respostas de demonstração determinísticas.

## Como executo com Docker

Com Docker Engine e Docker Compose instalados, executo:

```bash
docker compose up --build
```

O serviço fica disponível em `http://localhost:3000`. A rota `/api/health` é usada pelo health check do container.

## Organização do código

Organizei o projeto em camadas próximas ao fluxo MVC que já conheço:

- `app/` contém as páginas e os Route Handlers do Next.js. Cada `route.ts` recebe a requisição HTTP e devolve a resposta, fazendo o papel de controller.
- `lib/dto/` valida e tipa os dados de entrada da API.
- `lib/services/` concentra a lógica de aplicação e coordena as consultas.
- `lib/repositories/` concentra o acesso aos dados.
- `lib/data/` contém os dados fictícios usados na demonstração.
- `lib/ai/` define as ferramentas que o modelo pode chamar e o fluxo de resposta.
- `lib/types.ts` reúne os tipos de domínio compartilhados.
- `scripts/copy-standalone-assets.mjs` prepara os arquivos estáticos da versão standalone.

As rotas disponíveis são:

- `GET /api/health`: verifica se o serviço está ativo.
- `GET /api/orders/:orderId`: consulta pedido, cliente e pagamento relacionados.
- `GET /api/customers/:customerId`: consulta um cliente.
- `GET /api/payments/:orderId`: consulta o pagamento de um pedido.
- `POST /api/chat`: gera uma resposta e retorna as ferramentas consultadas.

## Limitações e próximos passos

Os dados são fixtures em memória, e o histórico do chat fica no navegador. Ainda não implementei persistência em PostgreSQL, autenticação de atendentes nem integração com o Chatmix ou outro canal real. A base de conhecimento de exemplo usa busca textual simples; não implementei embeddings nem RAG vetorial.
