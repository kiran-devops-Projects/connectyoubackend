// models/Project.js
const mongoose = require ('mongoose');

const MaintainerSchema = new mongoose.Schema({
  name: String,
  avatar: String,
});

const ProjectSchema = new mongoose.Schema({
  title: String,
  category: String,
  description: String,
  tech: [String],
  difficulty: String,
  contributors: Number,
  stars: Number,
  lastActive: String,
  maintainer: MaintainerSchema,
});

module.exports = mongoose.model('Project', ProjectSchema);
