
const express = require("express");
const { Pool } = require("pg");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

// Configuração do PostgreSQL
const db = new Pool({
  host: "127.0.0.1",
  port: 5433,
  user: "dsd_user",
  password: "dsd_senha",
  database: "pagamentos"
});

// Configuração do RabbitMQ
const RABBITMQ_URL =
  "amqp://dsd_user:dsd_senha@localhost:5673";

let channel;

// Conectar ao RabbitMQ
async function connectRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue("payment_events", {
    durable: true
  });

  console.log("Conectado ao RabbitMQ!");
}

// Criar tabela de pagamentos
async function createTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      customer VARCHAR(120) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Tabela de pagamentos pronta!");
}

// Enviar mensagem para o RabbitMQ
function publishEvent(event) {
  channel.sendToQueue(
    "payment_events",
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  console.log("Mensagem enviada:", event.type);
}

// Rota inicial para verificar o serviço
app.get("/", (req, res) => {
  res.json({
    message: "Serviço de pagamentos funcionando!"
  });
});

// Receber uma solicitação de pagamento
app.post("/payments", async (req, res) => {
  try {
    const { customer, amount } = req.body;

    if (!customer || !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0) {
      return res.status(400).json({
        message: "Informe um cliente e um valor válido."
      });
    }

    // Registrar pagamento como pendente
    const result = await db.query(
      `INSERT INTO payments (customer, amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [customer, amount, "pendente"]
    );

    const payment = result.rows[0];

    // Primeira mensagem: pagamento recebido
    publishEvent({
      type: "payment.received",
      paymentId: payment.id,
      customer: payment.customer,
      amount: payment.amount,
      status: payment.status
    });

    res.status(201).json({
      message: "Pagamento recebido e registrado!",
      payment
    });

    // Simular a confirmação do pagamento após 5 segundos
    setTimeout(async () => {
      try {
        const updated = await db.query(
          `UPDATE payments
           SET status = $1
           WHERE id = $2
           RETURNING *`,
          ["sucesso", payment.id]
        );

        const confirmedPayment = updated.rows[0];

        // Segunda mensagem: pagamento confirmado
        publishEvent({
          type: "payment.confirmed",
          paymentId: confirmedPayment.id,
          customer: confirmedPayment.customer,
          amount: confirmedPayment.amount,
          status: confirmedPayment.status
        });

      } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
      }
    }, 5000);

  } catch (error) {
    console.error("Erro ao processar pagamento:", error);

    res.status(500).json({
      message: "Erro ao processar pagamento."
    });
  }
});

// Consultar um pagamento pelo ID
app.get("/payments/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM payments WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pagamento não encontrado."
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Erro ao consultar pagamento:", error);

    res.status(500).json({
      message: "Erro ao consultar pagamento."
    });
  }
});

// Inicializar o serviço
async function startServer() {
  try {
    await createTable();
    await connectRabbitMQ();

    app.listen(3001, () => {
      console.log("Serviço de pagamentos rodando na porta 3001!");
    });

  } catch (error) {
    console.error("Erro ao iniciar o serviço:", error);
    process.exit(1);
  }
}

startServer();
