require("dotenv").config();

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");

// albums dan songs
const albums = require("./api/albums");
const songs = require("./api/songs");

// users
const users = require("./api/users");
const authentications = require("./api/authentications");
const playlists = require("./api/playlists");

// services
const AlbumsService = require("./services/postgres/AlbumsService");
const SongsService = require("./services/postgres/SongsService");
const UsersService = require("./services/postgres/UsersService");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");
const PlaylistsService = require("./services/postgres/PlaylistsService");

// validator
const UsersValidator = require("./validator/users");
const AuthenticationsValidator = require("./validator/authentications");
const PlaylistsValidator = require("./validator/playlists");
const ExportsValidator = require("./validator/exports");

// exports
const ExportsPlugin = require("./api/exports");

// tokenize
const TokenManager = require("./tokenize/TokenManager");

// exceptions
const ClientError = require("./exceptions/ClientError");

const init = async () => {
  const playlistsService = new PlaylistsService(); // tanpa collaborationsService
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();

  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || "localhost",
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  // mendefinisikan strategy autentikasi jwt
  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        songsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: ExportsPlugin,
      options: {
        service: ProducerService,
        playlistsService,
        validator: ExportsValidator,
      },
    },
  ]);

  // Error handling
  server.ext("onPreResponse", (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      // Penanganan client error secara internal
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      // Mempertahankan penanganan client error oleh Hapi secara native
      if (!response.isServer) {
        return h.continue;
      }

      // Penanganan server error sesuai kebutuhan
      const newResponse = h.response({
        status: "error",
        message: "Terjadi kegagalan pada server kami",
      });
      newResponse.code(500);
      return newResponse;
    }

    // Jika bukan error, lanjutkan dengan response sebelumnya
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
