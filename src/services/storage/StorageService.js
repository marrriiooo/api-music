// src/services/storage/StorageService.js
const fs = require("fs");
const path = require("path");

class StorageService {
  constructor() {
    this._folder = path.resolve(__dirname, "..", "..", "..", "cover", "images");

    // Buat folder jika belum ada
    if (!fs.existsSync(this._folder)) {
      fs.mkdirSync(this._folder, { recursive: true });
    }
  }

  writeFile(file, meta) {
    const filename = `${+new Date()}-${meta.filename}`;
    const pathWrite = path.resolve(this._folder, filename);
    const fileStream = fs.createWriteStream(pathWrite);

    return new Promise((resolve, reject) => {
      file.pipe(fileStream);
      file.on("end", () => resolve(filename));
      file.on("error", (error) => reject(error));
    });
  }
}

module.exports = StorageService;
