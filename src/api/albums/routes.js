const routes = (handler) => [
  {
    method: "POST",
    path: "/albums",
    handler: handler.postAlbumHandler,
  },
  {
    method: "GET",
    path: "/albums/{id}",
    handler: handler.getAlbumByIdHandler,
  },
  {
    method: "PUT",
    path: "/albums/{id}",
    handler: handler.putAlbumByIdHandler,
  },
  {
    method: "DELETE",
    path: "/albums/{id}",
    handler: handler.deleteAlbumByIdHandler,
  },
  {
    method: "POST",
    path: "/albums/{id}/likes",
    handler: handler.postAlbumLikeHandler,
    options: { auth: "openmusic_jwt" },
  },
  {
    method: "DELETE",
    path: "/albums/{id}/likes",
    handler: handler.deleteAlbumLikeHandler,
    options: { auth: "openmusic_jwt" },
  },
  {
    method: "GET",
    path: "/albums/{id}/likes",
    handler: handler.getAlbumLikesHandler,
  },

  {
    method: "POST",
    path: "/albums/{id}/covers",
    handler: handler.postUploadCoverHandler,
    options: {
      payload: {
        allow: ["multipart/form-data"],
        multipart: true,
        output: "stream",
        parse: true,
        maxBytes: 512000,
        failAction: (request, h, err) => {
          throw new ClientError(`Payload error: ${err.message}`, 413); // Lebih informatif
        },
      },
      auth: false, // ✔️ kalau memang belum perlu login
    },
  },
];

module.exports = routes;
