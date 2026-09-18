const express = require('express');
const { listExercises, getExercise } = require('../controllers/exerciseController');

const router = express.Router();

// GET /api/exercises — list / filter catalogue
router.get('/', listExercises);

// GET /api/exercises/:idOrSlug — single exercise by ObjectId or slug
router.get('/:idOrSlug', getExercise);

module.exports = router;
