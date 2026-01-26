"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const RequisiteSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['pre', 'co'], required: true },
    code: { type: String, required: true },
    description: { type: String },
});
const CourseSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    credits: { type: Number, required: true },
    offeredIn: { type: String, required: true },
    description: { type: String, required: true },
    requisites: [RequisiteSchema],
});
const CourseModel = mongoose_1.default.model('Course', CourseSchema);
// ==========================
// 🎓 Contrôleur MongoDB
// ==========================
class CourseController_Mongo {
    /**
     * 🔹 Récupère tous les cours
     */
    static getAllCourses(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const courses = yield CourseModel.find();
                const formatted = courses.map((c) => c.toObject());
                return res.status(200).json(formatted);
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
    /**
     * 🔹 Récupère un cours par son code
     */
    static getCourseByCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.params;
                const courseDoc = yield CourseModel.findOne({ code });
                if (!courseDoc) {
                    return res.status(404).json({ error: 'Course not found' });
                }
                const course = courseDoc.toObject();
                return res.status(200).json(course);
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
    /**
     * 🔹 Crée un nouveau cours
     */
    static createCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newCourseData = req.body;
                const existing = yield CourseModel.findOne({ code: newCourseData.code });
                if (existing) {
                    return res.status(400).json({ error: 'Course already exists' });
                }
                const newCourse = new CourseModel(newCourseData);
                yield newCourse.save();
                return res.status(201).json(newCourse.toObject());
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
    /**
     * 🔹 Met à jour un cours existant
     */
    static updateCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.params;
                const updates = req.body;
                const updated = yield CourseModel.findOneAndUpdate({ code }, updates, { new: true });
                if (!updated) {
                    return res.status(404).json({ error: 'Course not found' });
                }
                return res.status(200).json(updated.toObject());
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
    /**
     * 🔹 Supprime un cours
     */
    static deleteCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.params;
                const deleted = yield CourseModel.findOneAndDelete({ code });
                if (!deleted) {
                    return res.status(404).json({ error: 'Course not found' });
                }
                return res.status(200).json({ message: 'Course deleted successfully' });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
    /**
     * 🔹 Récupère les cours selon un "pool"
     */
    static getCoursesByPool(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { poolName } = req.params;
                const courses = yield CourseModel.find({ offeredIn: poolName });
                const formatted = courses.map((c) => c.toObject());
                return res.status(200).json(formatted);
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.default = CourseController_Mongo;
