exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("albums", {
    cover_url: {
      type: "TEXT",
      allowNull: true,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("albums", "cover_url");
};
