const autoBind = require('auto-bind');
const ClientError = require('../../exceptions/ClientError');

class PlaylistsHandler {
  constructor(service, songsService, validator) {
    this._service = service;
    this._songsService = songsService;
    this._validator = validator;

    autoBind(this);
  }

 async postPlaylistHandler(request, h) {
  try {
    console.log('Payload:', request.payload);  // ✅ Tambah log payload
    this._validator.validatePostPlaylistPayload(request.payload);

    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    console.log('User ID (from auth):', credentialId);  // ✅ Tambah log user ID

    const playlistId = await this._service.addPlaylist(name, credentialId);
    console.log('Playlist ID created:', playlistId); // ✅ Tambah log playlist ID

    return h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: { playlistId },
    }).code(201);
  } catch (error) {
    console.error('ERROR:', error); // ✅ Tampilkan error
    return this._handleErrorResponse(error, h);
  }
}


  async getPlaylistsHandler(request, h) {
    try {
      const { id: credentialId } = request.auth.credentials;
      const playlists = await this._service.getPlaylists(credentialId);

      return h.response({
        status: 'success',
        data: { playlists },
      });
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  async deletePlaylistByIdHandler(request, h) {
    try {
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyPlaylistOwner(id, credentialId);
      await this._service.deletePlaylistById(id);

      return h.response({
        status: 'success',
        message: 'Playlist berhasil dihapus',
      });
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  async postSongToPlaylistHandler(request, h) {
    try {
      this._validator.validatePostSongToPlaylistPayload(request.payload);
      const { songId } = request.payload;
      const { id: playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyPlaylistAccess(playlistId, credentialId);
      await this._songsService.getSongById(songId);
      await this._service.addSongToPlaylist(playlistId, songId, credentialId);

      return h.response({
        status: 'success',
        message: 'Lagu berhasil ditambahkan ke playlist',
      }).code(201);
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  async getSongsFromPlaylistHandler(request, h) {
    try {
      const { id: playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyPlaylistAccess(playlistId, credentialId);
      const playlist = await this._service.getSongsFromPlaylist(playlistId);

      return h.response({
        status: 'success',
        data: { playlist },
      });
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  async deleteSongFromPlaylistHandler(request, h) {
    try {
      this._validator.validateDeleteSongFromPlaylistPayload(request.payload);
      const { songId } = request.payload;
      const { id: playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyPlaylistAccess(playlistId, credentialId);
      await this._service.deleteSongFromPlaylist(playlistId, songId, credentialId);

      return h.response({
        status: 'success',
        message: 'Lagu berhasil dihapus dari playlist',
      });
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  async getPlaylistActivitiesHandler(request, h) {
    try {
      const { id: playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyPlaylistAccess(playlistId, credentialId);
      const activities = await this._service.getPlaylistActivities(playlistId);

      return h.response({
        status: 'success',
        data: { playlistId, activities },
      });
    } catch (error) {
      return this._handleErrorResponse(error, h);
    }
  }

  _handleErrorResponse(error, h) {
    if (error instanceof ClientError) {
      return h.response({
        status: 'fail',
        message: error.message,
      }).code(error.statusCode);
    }

    console.error(error); // Logging untuk debugging server
    return h.response({
      status: 'error',
      message: 'Maaf, terjadi kegagalan pada server kami.',
    }).code(500);
  }
}

module.exports = PlaylistsHandler;
