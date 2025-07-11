const autoBind = require("auto-bind");
const ClientError = require("../../exceptions/ClientError");

class UploadsHandler {
  constructor(storageService, albumsService, validator) {
    this._storageService = storageService; // Service untuk menyimpan file (lokal/S3)
    this._albumsService = albumsService; // Service untuk operasi album (get, update, dsb)
    this._validator = validator; // Validator untuk validasi header file

    autoBind(this); // Mengikat konteks this ke semua method class
  }

  /**
   * Handler untuk upload sampul album
   * @param {Object} request - Objek request Hapi.js
   * @param {Object} h - Toolkit response dari Hapi.js
   */
  async postAlbumCoverHandler(request, h) {
    try {
      const { cover } = request.payload; // Mengambil file dari form-data (key: cover)
      const { id: albumId } = request.params; // Mengambil ID album dari parameter URL

      // Validasi header file (tipe dan ukuran)
      this._validator.validateImageHeaders(cover.hapi.headers);

      // Verifikasi bahwa album dengan ID tersebut ada
      await this._albumsService.getAlbumById(albumId);

      // Simpan file ke storage, dapatkan nama file hasil simpan
      const filename = await this._storageService.writeFile(cover, cover.hapi);

      // Buat URL cover yang dapat diakses publik
      const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/albums/covers/${filename}`;

      // Update data album dengan URL sampul baru
      await this._albumsService.addAlbumCoverUrl(albumId, coverUrl);

      // Kirim respons berhasil
      return h
        .response({
          status: "success",
          message: "Sampul berhasil diunggah",
        })
        .code(201);
    } catch (error) {
      // Tangani error yang berasal dari client (validasi, dsb)
      if (error instanceof ClientError) {
        return h
          .response({
            status: "fail",
            message: error.message,
          })
          .code(error.statusCode);
      }

      // Tangani error selain dari client (server error)
      console.error(error);
      return h
        .response({
          status: "error",
          message: "Maaf, terjadi kegagalan pada server kami.",
        })
        .code(500);
    }
  }
}

module.exports = UploadsHandler;
