const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Course = require("../models/course");
const auth = require("../middleware/auth");

// Multer setup for thumbnail upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create a new course - allowing alumni, admin, and instructor roles
router.post("/", auth, upload.single("thumbnail"), async (req, res) => {
  try {
    const {
      title, description, category, duration,
      level, price, tags, isPublished, modules
    } = req.body;

    // Check if user has appropriate permissions
    if (!req.user || !["admin", "instructor", "alumni"].includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized access: Only admins, instructors, or alumni allowed" });
    }

    const newCourse = new Course({
      title,
      description,
      category,
      instructor: req.user.id,
      duration,
      level,
      thumbnail: req.file ? req.file.path : null,
      price,
      modules: modules ? JSON.parse(modules) : [],
      tags: tags ? tags.split(",") : [],
      isPublished: isPublished === "true"
    });

    const course = await newCourse.save();
    console.log("✅ Course created:", course.title);
    res.status(201).json(course);
  } catch (error) {
    console.error("❌ Error creating course:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// PUT route to update a course
router.put("/:id", auth, upload.single("thumbnail"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Authorization check
    if (
      course.instructor.toString() !== req.user.id.toString() &&
      !["admin", "alumni" , "instructor"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Unauthorized to update this course" });
    }

    // Update fields
    const {
      title, description, category, duration,
      level, price, tags, isPublished
    } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (duration) course.duration = duration;
    if (level) course.level = level;
    if (price) course.price = price;
    if (tags) course.tags = tags.split(",");
    if (typeof isPublished !== "undefined") course.isPublished = isPublished;

    if (req.file) {
      course.thumbnail = req.file.path;
    }

    course.updatedAt = Date.now();
    await course.save();

    res.status(200).json({ message: "Course updated successfully", course });
  } catch (error) {
    console.error("❌ Error updating course:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { category, level, search } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }
    if (level && level !== 'all') {
      query.level = level;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .select('-content -quizzes');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('enrolled.student', 'name email');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Add/update modules to a course
router.put('/:id/modules', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the course instructor, an admin, or an alumni
    if (
      !req.user || 
      (course.instructor.toString() !== req.user.id.toString() && 
      !["admin", "alumni"].includes(req.user.role))
    ) {
      return res.status(403).json({ message: "Unauthorized: Only course instructor, admins, or alumni can edit modules" });
    }

    const { modules } = req.body;
    
    // Update modules
    if (modules && Array.isArray(modules)) {
      course.modules = modules;
    }

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a single module to a course
router.post('/:id/modules', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the course instructor, an admin, or an alumni
    if (
      !req.user || 
      (course.instructor.toString() !== req.user.id.toString() && 
      !["admin", "alumni"].includes(req.user.role))
    ) {
      return res.status(403).json({ message: "Unauthorized: Only course instructor, admins, or alumni can add modules" });
    }

    const { title, description, lessons } = req.body;
    
    const newModule = {
      title,
      description,
      lessons: lessons || []
    };

    course.modules.push(newModule);
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add lesson to a module
router.post('/:courseId/modules/:moduleIndex/lessons', auth, async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.params;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the course instructor, an admin, or an alumni
    if (
      !req.user || 
      (course.instructor.toString() !== req.user.id.toString() && 
      !["admin", "alumni"].includes(req.user.role))
    ) {
      return res.status(403).json({ message: "Unauthorized: Only course instructor, admins, or alumni can add lessons" });
    }

    if (!course.modules[moduleIndex]) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const { title, content, duration, videoUrl, resources } = req.body;
    
    const newLesson = {
      title,
      content,
      duration,
      videoUrl,
      resources: resources || []
    };

    course.modules[moduleIndex].lessons.push(newLesson);
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enroll in course
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    if (course.enrolled.some(e => e.student.toString() === req.user.id)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }

    course.enrolled.push({
      student: req.user.id,
      progress: 0,
      completedContent: [],
      quizScores: [],
      startDate: Date.now(),
      lastAccessed: Date.now()
    });

    // Increment enrolled count
    course.enrolledCount += 1;

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update student progress in a course
router.put('/:id/progress', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = course.enrolled.find(
      e => e.student.toString() === req.user.id.toString()
    );

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    const { lessonId, moduleId, completed, quizId, score } = req.body;
    const contentId = `${moduleId}-${lessonId}`;

    // Track completed lesson
    if (completed && contentId && !enrollment.completedContent.includes(contentId)) {
      enrollment.completedContent.push(contentId);
    }

    // Add quiz score if applicable
    if (quizId && score !== undefined) {
      // Check if the quiz score already exists and update it
      const existingScoreIndex = enrollment.quizScores.findIndex(q => q.quizId === quizId);
      if (existingScoreIndex !== -1) {
        enrollment.quizScores[existingScoreIndex].score = score;
      } else {
        enrollment.quizScores.push({ quizId, score });
      }
    }

    // Calculate progress based on completed lessons
    const totalLessons = course.modules.reduce((total, mod) => total + mod.lessons.length, 0);
    enrollment.progress = totalLessons > 0 ? (enrollment.completedContent.length / totalLessons) * 100 : 0;
    enrollment.lastAccessed = new Date();

    await course.save();

    res.json({
      progress: enrollment.progress,
      completedContent: enrollment.completedContent,
      quizScores: enrollment.quizScores
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get enrolled student's progress
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = course.enrolled.find(
      e => e.student.toString() === req.user.id.toString()
    );

    if (!enrollment) {
      return res.status(404).json({ message: 'Not enrolled in this course' });
    }

    res.json({
      progress: enrollment.progress,
      completedContent: enrollment.completedContent,
      quizScores: enrollment.quizScores,
      startDate: enrollment.startDate,
      lastAccessed: enrollment.lastAccessed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a course (admin, instructor, or alumni who created it)
router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized to delete the course
    if (
      !req.user || 
      (course.instructor.toString() !== req.user.id.toString() && 
      req.user.role !== "admin")
    ) {
      return res.status(403).json({ message: "Unauthorized: Only course creator or admin can delete this course" });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;