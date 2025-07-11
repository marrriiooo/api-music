// Load variabel environment dari file .env
require("dotenv").config();

const amqp = require("amqplib");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const MailSender = require("./services/mail/MailSender");
const Listener = require("./listener");

const init = async () => {
  // Inisialisasi service untuk playlist dan pengiriman email
  const playlistsService = new PlaylistsService();
  const mailSender = new MailSender();
  const listener = new Listener(playlistsService, mailSender);

  // Membuat koneksi ke RabbitMQ menggunakan URL dari .env
  const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
  const channel = await connection.createChannel();

  // Pastikan queue 'export:playlists' tersedia
  await channel.assertQueue("export:playlists", {
    durable: true, // Pesan tetap ada walaupun RabbitMQ restart
  });

  // Mulai konsumsi pesan dari queue, menggunakan listener
  channel.consume("export:playlists", listener.listen, {
    noAck: true, // Tidak mengirim acknowledgment (pesan langsung dihapus dari queue)
  });

  console.log("✅ Consumer service is running");
};

// Menjalankan fungsi init
init();
