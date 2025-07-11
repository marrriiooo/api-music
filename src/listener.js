class Listener {
  constructor(playlistsService, mailSender) {
    this._playlistsService = playlistsService; // Service untuk mengambil data playlist
    this._mailSender = mailSender; // Service untuk mengirim email

    // Binding agar this.listen tetap merujuk ke instance class saat dipanggil di luar konteks
    this.listen = this.listen.bind(this);
  }

  /**
   * Method yang akan dipanggil ketika menerima pesan dari RabbitMQ
   * @param {Object} message - Pesan dari RabbitMQ
   */
  async listen(message) {
    try {
      // Parsing isi pesan dari buffer menjadi objek JS
      const { playlistId, targetEmail } = JSON.parse(
        message.content.toString()
      );

      // Ambil data playlist dalam format ekspor
      const playlist = await this._playlistsService.getPlaylistForExport(
        playlistId
      );

      // Kirim data playlist melalui email dalam bentuk JSON string
      const result = await this._mailSender.sendEmail(
        targetEmail,
        JSON.stringify({ playlist })
      );

      // Log hasil pengiriman email
      console.log(result);
    } catch (error) {
      // Tangani error jika parsing atau pengambilan/kirim email gagal
      console.error(error);
    }
  }
}

module.exports = Listener;
