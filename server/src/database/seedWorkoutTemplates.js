const mongoose = require('mongoose');
const { WorkoutTemplate } = require('./models');

/**
 * Seed WorkoutTemplate documents
 * Covers: full_body (beginner, intermediate), upper_lower (beginner, intermediate),
 * push_pull_legs (intermediate, advanced)
 */
async function seedWorkoutTemplates() {
  const templates = [
    // Full Body - Beginner - 3 days
    {
      name: 'Full Body Beginner - 3 Days',
      code: 'FULL_BODY_BEGINNER_3D',
      splitType: 'full_body',
      daysPerWeek: 3,
      experienceLevel: 'beginner',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'] },
        { dayOfWeek: 'Wednesday', muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'] },
      ],
      isActive: true,
    },

    // Full Body - Beginner - 4 days (for the override case)
    {
      name: 'Full Body Beginner - 4 Days',
      code: 'FULL_BODY_BEGINNER_4D',
      splitType: 'full_body',
      daysPerWeek: 4,
      experienceLevel: 'beginner',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Back', 'Legs'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Shoulders', 'Arms', 'Core'] },
        { dayOfWeek: 'Thursday', muscleGroups: ['Chest', 'Back', 'Legs'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Shoulders', 'Arms', 'Core'] },
      ],
      isActive: true,
    },

    // Full Body - Intermediate - 3 days
    {
      name: 'Full Body Intermediate - 3 Days',
      code: 'FULL_BODY_INTERMEDIATE_3D',
      splitType: 'full_body',
      daysPerWeek: 3,
      experienceLevel: 'intermediate',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders'] },
        { dayOfWeek: 'Wednesday', muscleGroups: ['Chest', 'Back', 'Legs', 'Arms'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders'] },
      ],
      isActive: true,
    },

    // Upper/Lower - Beginner - 4 days
    {
      name: 'Upper Lower Beginner - 4 Days',
      code: 'UPPER_LOWER_BEGINNER_4D',
      splitType: 'upper_lower',
      daysPerWeek: 4,
      experienceLevel: 'beginner',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
        { dayOfWeek: 'Thursday', muscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
      ],
      isActive: true,
    },

    // Upper/Lower - Intermediate - 4 days
    {
      name: 'Upper Lower Intermediate - 4 Days',
      code: 'UPPER_LOWER_INTERMEDIATE_4D',
      splitType: 'upper_lower',
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Back', 'Shoulders'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes'] },
        { dayOfWeek: 'Thursday', muscleGroups: ['Back', 'Chest', 'Arms'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Legs', 'Glutes', 'Calves'] },
      ],
      isActive: true,
    },

    // Push/Pull/Legs - Intermediate - 6 days
    {
      name: 'Push Pull Legs Intermediate - 6 Days',
      code: 'PPL_INTERMEDIATE_6D',
      splitType: 'push_pull_legs',
      daysPerWeek: 6,
      experienceLevel: 'intermediate',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Back', 'Biceps'] },
        { dayOfWeek: 'Wednesday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
        { dayOfWeek: 'Thursday', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Back', 'Biceps'] },
        { dayOfWeek: 'Saturday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
      ],
      isActive: true,
    },

    // Push/Pull/Legs - Advanced - 6 days
    {
      name: 'Push Pull Legs Advanced - 6 Days',
      code: 'PPL_ADVANCED_6D',
      splitType: 'push_pull_legs',
      daysPerWeek: 6,
      experienceLevel: 'advanced',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Back', 'Biceps', 'Rear Delts'] },
        { dayOfWeek: 'Wednesday', muscleGroups: ['Quads', 'Hamstrings', 'Glutes'] },
        { dayOfWeek: 'Thursday', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Back', 'Biceps', 'Traps'] },
        { dayOfWeek: 'Saturday', muscleGroups: ['Legs', 'Calves', 'Core'] },
      ],
      isActive: true,
    },

    // Push/Pull/Legs - Intermediate - 5 days (fallback)
    {
      name: 'Push Pull Legs Intermediate - 5 Days',
      code: 'PPL_INTERMEDIATE_5D',
      splitType: 'push_pull_legs',
      daysPerWeek: 5,
      experienceLevel: 'intermediate',
      defaultStructure: [
        { dayOfWeek: 'Monday', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
        { dayOfWeek: 'Tuesday', muscleGroups: ['Back', 'Biceps'] },
        { dayOfWeek: 'Wednesday', muscleGroups: ['Legs'] },
        { dayOfWeek: 'Friday', muscleGroups: ['Chest', 'Shoulders'] },
        { dayOfWeek: 'Saturday', muscleGroups: ['Back', 'Arms'] },
      ],
      isActive: true,
    },
  ];

  // Use insertMany with ordered: false to skip duplicates (based on unique code field)
  try {
    const result = await WorkoutTemplate.insertMany(templates, { ordered: false });
    console.log(`✅ Seeded ${result.length} WorkoutTemplate documents`);
    return result;
  } catch (err) {
    // Ignore duplicate key errors (code 11000), but log others
    if (err.code === 11000) {
      console.log('⚠️  Some templates already exist (skipped duplicates)');
    } else {
      console.error('❌ Error seeding templates:', err.message);
      throw err;
    }
  }
}

// If run directly: node seedWorkoutTemplates.js
if (require.main === module) {
  require('dotenv/config');
  const connectDB = require('./connectDB');

  (async () => {
    await connectDB();
    await seedWorkoutTemplates();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  })();
}

module.exports = { seedWorkoutTemplates };
