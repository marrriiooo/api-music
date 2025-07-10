const amqp = require("amqplib");

let channel;

const connect = async () => {
  if (!channel) {
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    channel = await connection.createChannel();
  }
  return channel;
};

const ProducerService = {
  sendMessage: async (queue, message) => {
    const channel = await connect();
    await channel.assertQueue(queue, {
      durable: true,
    });

    channel.sendToQueue(queue, Buffer.from(message));
  },
};

module.exports = ProducerService;
