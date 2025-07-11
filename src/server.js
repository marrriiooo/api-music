require("dotenv").config();

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");
const Inert = require("@hapi/inert");
const path = require("path");

// === Import API Plugins ===
const albums = require("./api/albums");
const songs = require("./api/songs");
const users = require("./api/users");
const authentications = require("./api/authentications");
const playlists = require("./api/playlists");
const exportsPlugin = require("./api/exports");
const uploads = require("./api/uploads");

// === Import Services ===
const AlbumsService = require("./services/postgres/AlbumsService");
const SongsService = require("./services/postgres/SongsService");
const UsersService = require("./services/postgres/UsersService");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const ProducerService = require("./services/rabbitmq/ProducerService");
const StorageService = require("./services/storage/StorageService");
const CacheService = require("./services/redis/cacheService");

// === Import Validators ===
const UsersValidator = require("./validator/users");
const AuthenticationsValidator = require("./validator/authentications");
const PlaylistsValidator = require("./validator/playlists");
const ExportsValidator = require("./validator/exports");
const UploadsValidator = require("./validator/uploads");

// === Token Manager ===
const TokenManager = require("./tokenize/TokenManager");

// === Exception Handling ===
const ClientError = require("./exceptions/ClientError");

const init = async () => {
  // === Inisialisasi Service ===
  const cacheService = new CacheService(); // Bisa diintegrasikan ke service lain seperti albumsService
  const playlistsService = new PlaylistsService(); // Tanpa fitur kolaborasi
  const albumsService = new AlbumsService(cacheService);
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const producerService = new ProducerService();
  const storageService = new StorageService(
    path.resolve(__dirname, "api/uploads/file/covers")
  );

  // === Buat server Hapi ===
  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || "localhost",
    routes: {
      cors: {
        origin: ["*"], // Mengizinkan semua origin (CORS)
      },
    },
  });

  // === Register Plugin Eksternal ===
  await server.register([
    { plugin: Jwt }, // Plugin JWT untuk autentikasi
    { plugin: Inert }, // Plugin untuk file handling (static files, upload)
  ]);

  // === Definisikan Strategi Autentikasi ===
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

  // === Register Plugin Internal ===
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
      plugin: exportsPlugin,
      options: {
        service: producerService,
        playlistsService,
        validator: ExportsValidator,
      },
    },
    {
      plugin: uploads,
      options: {
        storageService,
        albumsService,
        validator: UploadsValidator,
      },
    },
  ]);

  // === Global Error Handling ===
  server.ext("onPreResponse", (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      // Tangani ClientError buatan sendiri
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      // Tangani error bawaan non-server
      if (!response.isServer) return h.continue;

      // Tangani Server Error
      const newResponse = h.response({
        status: "error",
        message: "Terjadi kegagalan pada server kami",
      });
      newResponse.code(500);
      return newResponse;
    }

    // Jika bukan error, lanjutkan response seperti biasa
    return h.continue;
  });

  // === Jalankan Server ===
  await server.start();
  console.log(`🚀 Server berjalan pada ${server.info.uri}`);
};

// === Penanganan Unhandled Promise Error ===
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

// === Mulai Aplikasi ===
init();
