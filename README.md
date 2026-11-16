# Desafio 2 – Desenvolvimento de Sistemas Distribuídos

## 1. Descrição do projeto

Este projeto implementa um sistema distribuído de processamento de pagamentos, utilizando dois microsserviços independentes: Payment Service e Notification Service.

A comunicação entre os serviços acontece de forma assíncrona por meio do RabbitMQ.

O PostgreSQL é utilizado para armazenar os pagamentos.

## 2. Tecnologias utilizadas

- Node.js
- Express
- PostgreSQL
- RabbitMQ
- Docker e Docker Compose
- JavaScript
- API REST
- AMQP
- Thunder Client para testes das APIs

## 3. Estrutura do projeto

```text
Desafio2-DSD/
├── payment-service/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── notification-service/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 4. Funcionamento do sistema

1. O cliente solicita um pagamento pelo Payment Service.
2. O pagamento é registrado no PostgreSQL com status `pendente`.
3. O Payment Service publica um evento no RabbitMQ informando que o pagamento foi recebido.
4. O Notification Service recebe o evento e gera uma notificação de pagamento recebido.
5. Após cinco segundos, o pagamento é atualizado para `sucesso`.
6. Um novo evento é publicado no RabbitMQ informando a confirmação.
7. O Notification Service recebe o evento e gera uma notificação de pagamento confirmado.

## 5. Como executar o projeto

### 5.1. Iniciar o Docker

Na pasta principal do projeto, executar:

```bash
docker compose up -d
```

Esse comando inicia o PostgreSQL e o RabbitMQ.

### 5.2. Iniciar o Payment Service

Em um terminal, acessar a pasta do serviço:

```bash
cd payment-service
npm install
node server.js
```

O serviço ficará disponível na porta 3001.

### 5.3. Iniciar o Notification Service

Em outro terminal, acessar a pasta do serviço:

```bash
cd notification-service
npm install
node server.js
```

O serviço ficará disponível na porta 3002.

Os dois serviços devem permanecer em execução durante os testes.

## 6. Endpoints disponíveis

### Payment Service

- GET `http://localhost:3001/` – Verificar funcionamento.
- POST `http://localhost:3001/payments` – Criar pagamento.
- GET `http://localhost:3001/payments/1` – Consultar pagamento pelo ID.

### Notification Service

- GET `http://localhost:3002/` – Verificar funcionamento.
- GET `http://localhost:3002/notifications` – Consultar notificações geradas.

## 7. Como testar com Thunder Client

Os testes das APIs podem ser realizados pelo Thunder Client, extensão do Visual Studio Code.

### 7.1. Criar um pagamento

- Método: POST
- URL: `http://localhost:3001/payments`
- Selecionar Body e depois JSON.
- Enviar o seguinte conteúdo:

```json
{
  "customer": "Daiane",
  "amount": 300.00
}
```

O sistema retornará os dados do pagamento registrado com status `pendente`.

### 7.2. Consultar o pagamento

- Método: GET
- URL: `http://localhost:3001/payments/3`

Substituir o número 3 pelo ID retornado na criação do pagamento.

Após aproximadamente cinco segundos, o status será atualizado para `sucesso`.

### 7.3. Consultar as notificações

- Método: GET
- URL: `http://localhost:3002/notifications`

A resposta apresenta as notificações geradas para o pagamento recebido e para o pagamento confirmado.

## 8. Infraestrutura

O Docker Compose inicia os seguintes serviços:

**PostgreSQL**
- Porta: 5433
- Banco de dados: `pagamentos`
- Usuário: `dsd_user`
- Senha: `dsd_senha`

**RabbitMQ**
- Porta de comunicação: 5673
- Painel de gerenciamento: `http://localhost:15673`
- Usuário: `dsd_user`
- Senha: `dsd_senha`

## 9. Considerações finais

O projeto demonstra a integração entre microsserviços independentes, utilizando comunicação REST e mensageria AMQP, com processamento assíncrono de eventos e armazenamento de dados em PostgreSQL.

O fluxo implementado contempla o recebimento, o registro e a confirmação de pagamentos, com geração de notificações em cada etapa.