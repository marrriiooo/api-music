// Import dependensi yang diperlukan
const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const ClientError = require("../../exceptions/ClientError");

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool(); // Koneksi ke PostgreSQL
    this._cacheService = cacheService; // Koneksi ke Redis
  }

  // Menambahkan album baru
  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3, $4) RETURNING id",
      values: [id, name, year, null], // null untuk cover_url awal
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  // Mengambil detail album berdasarkan ID
  async getAlbumById(id) {
    const query = {
      text: "SELECT * FROM albums WHERE id = $1",
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    return result.rows[0];
  }

  // Mengambil detail album dan lagu-lagunya
  async getAlbumWithSongs(id) {
    // Ambil data album
    const albumQuery = {
      text: "SELECT * FROM albums WHERE id = $1",
      values: [id],
    };
    const albumResult = await this._pool.query(albumQuery);
    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
    const album = albumResult.rows[0];

    // Ambil data lagu dalam album
    const songsQuery = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    };
    const songsResult = await this._pool.query(songsQuery);

    return {
      id: album.id,
      name: album.name,
      year: album.year,
      coverUrl: album.cover_url || null,
      songs: songsResult.rows,
    };
  }

  // Mengubah data album
  async editAlbumById(id, { name, year }) {
    const query = {
      text: "UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id",
      values: [name, year, id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  // Menghapus album
  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  // Menambahkan URL sampul album
  async addAlbumCoverUrl(id, coverUrl) {
    const query = {
      text: "UPDATE albums SET cover_url = $1 WHERE id = $2 RETURNING id",
      values: [coverUrl, id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(
        "Gagal memperbarui cover album. Id tidak ditemukan"
      );
    }
  }

  // Verifikasi apakah album ada
  async verifyAlbumExist(id) {
    const query = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
  }

  // Menambahkan like pada album dari user
  async addAlbumLike(userId, albumId) {
    await this.verifyAlbumLike(userId, albumId); // Pastikan belum pernah like

    const id = `like-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id",
      values: [id, userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError("Gagal menyukai album");
    }

    // Hapus cache supaya nanti diambil ulang
    await this._cacheService.delete(`album-likes:${albumId}`);
  }

  // Verifikasi jika user sudah pernah menyukai album
  async verifyAlbumLike(userId, albumId) {
    const query = {
      text: "SELECT * FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (result.rows.length > 0) {
      throw new ClientError("Album sudah disukai");
    }
  }

  // Mengambil jumlah like album (gunakan cache jika tersedia)
  async getAlbumLikes(albumId) {
    try {
      const result = await this._cacheService.get(`album-likes:${albumId}`);
      return { likes: parseInt(result), isCache: true };
    } catch (error) {
      // Jika cache miss, ambil dari DB
      const query = {
        text: "SELECT COUNT(id) as likes FROM user_album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likes = parseInt(result.rows[0].likes);

      // Simpan ke cache untuk selanjutnya
      await this._cacheService.set(`album-likes:${albumId}`, likes);
      return { likes, isCache: false };
    }
  }

  // Menghapus like album oleh user
  async deleteAlbumLike(userId, albumId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id",
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal membatalkan like. Like tidak ditemukan");
    }

    // Hapus cache agar data diperbarui
    await this._cacheService.delete(`album-likes:${albumId}`);
  }
}

module.exports = AlbumsService;
