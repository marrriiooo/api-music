const autoBind = require("auto-bind");

class AlbumsHandler {
  constructor(service, validator, storageService) {
    this._service = service;
    this._validator = validator;
    this._storageService = storageService;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;

    const albumId = await this._service.addAlbum({ name, year });

    const response = h.response({
      status: "success",
      message: "Album berhasil ditambahkan",
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._service.getAlbumWithSongs(id);

    return {
      status: "success",
      data: {
        album,
      },
    };
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;

    await this._service.editAlbumById(id, request.payload);

    return {
      status: "success",
      message: "Album berhasil diperbarui",
    };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    return {
      status: "success",
      message: "Album berhasil dihapus",
    };
  }
  async postUploadCoverHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;

    if (!cover.hapi.headers["content-type"].startsWith("image/")) {
      throw new ClientError("Tipe file harus gambar", 400);
    }

    const filename = await this._storageService.writeFile(cover, cover.hapi);
    const fileLocation = `http://${process.env.HOST}:${process.env.PORT}/cover/images/${filename}`;

    await this._service.addCoverAlbumById(id, fileLocation); // ✅

    return h
      .response({
        status: "success",
        message: "Sampul berhasil diunggah",
      })
      .code(201);
  }
  async postAlbumLikeHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.verifyAlbumExists(albumId); // pastikan album ada
    await this._service.addAlbumLike(userId, albumId);

    return h
      .response({
        status: "success",
        message: "Berhasil menyukai album",
      })
      .code(201);
  }

  async deleteAlbumLikeHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.removeAlbumLike(userId, albumId);

    return {
      status: "success",
      message: "Berhasil batal menyukai album",
    };
  }

  async getAlbumLikesHandler(request, h) {
    const { id: albumId } = request.params;

    const { likes, source } = await this._service.getAlbumLikes(albumId);

    const response = h.response({
      status: "success",
      data: {
        likes,
      },
    });

    if (source === "cache") {
      response.header("X-Data-Source", "cache");
    }

    return response;
  }
}

module.exports = AlbumsHandler;
