const express = require("express");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

const RABBITMQ_URL = "amqp://dsd_user:dsd_senha@localhost:5673";

let notifications = [];

async function startConsumer() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue("payment_events", {
    durable: true
  });

  console.log("Conectado ao RabbitMQ!");
  console.log("Aguardando eventos de pagamento...");

  channel.consume("payment_events", (message) => {
    if (message !== null) {
      const event = JSON.parse(message.content.toString());

      let notification;

      if (event.type === "payment.received") {
        notification = `Pagamento recebido para ${event.customer}, no valor de R$ ${event.amount}.`;
      } else if (event.type === "payment.confirmed") {
        notification = `Pagamento confirmado para ${event.customer}, no valor de R$ ${event.amount}.`;
      } else {
        notification = `Evento recebido: ${event.type}`;
      }

      const item = {
        id: notifications.length + 1,
        paymentId: event.paymentId,
        type: event.type,
        message: notification,
        createdAt: new Date().toISOString()
      };

      notifications.push(item);

      console.log("NOTIFICAÇÃO:", item.message);

      channel.ack(message);
    }
  });
}

// Rota inicial
app.get("/", (req, res) => {
  res.json({
    message: "Serviço de notificações funcionando!"
  });
});

// Consultar notificações
app.get("/notifications", (req, res) => {
  res.json(notifications);
});

// Inicializar o serviço
async function startServer() {
  try {
    await startConsumer();

    app.listen(3002, () => {
      console.log("Serviço de notificações rodando na porta 3002!");
    });

  } catch (error) {
    console.error("Erro ao iniciar o serviço:", error);
    process.exit(1);
  }
}

startServer();