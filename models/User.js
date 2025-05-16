const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require('uuid'); // Generates UUIDs

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      unique: true,
      default: () => uuidv4()
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, match: [/^\d{10}$/, 'Phone number must be 10 digits'] },
    avatar: { type: String },
    password: { type: String, required: true, select: true },
    userType: { type: String, enum: ["student", "alumni"], required: true },
    role: { type: String, enum: ["student", "instructor", "admin"], default: "student" },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
  },
  { timestamps: true, discriminatorKey: 'userType' }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// 🎓 Student Schema
const studentSchema = new mongoose.Schema({
  university: String,
  branch: {
    type: String,
    enum: ["Computer Science", "Information Technology", "Mechanical", "Electrical", "Civil", null, ""]
  },
  yearOfStudy: {
    type: String,
    enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", null, ""]
  },
  regno: String,
  studentId: {
    type: String,
    default: () => `STU-${Math.floor(100000 + Math.random() * 900000)}`
  }
});
const Student = User.discriminator("student", studentSchema);

// 👨‍💼 Alumni Schema
const alumniSchema = new mongoose.Schema({
  graduationYear: { type: String, required: true },
  currentCompany: String,
  jobTitle: String,
  industry: String,
  alumniId: {
    type: String,
    default: () => `ALU-${Math.floor(100000 + Math.random() * 900000)}`
  }
});
const Alumni = User.discriminator("alumni", alumniSchema);

module.exports = { User, Student, Alumni };
