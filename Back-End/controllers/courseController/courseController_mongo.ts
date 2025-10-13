import { Request, Response } from 'express';
import mongoose, { Document, Schema } from 'mongoose';
import CourseTypes from './course_types';

// ==========================
// Définition du modèle Mongoose
// ==========================

interface CourseDocument extends CourseTypes.CourseInfoDB, Document {}

const RequisiteSchema = new Schema<CourseTypes.Requisite>({
  type: { type: String, enum: ['pre', 'co'], required: true },
  code: { type: String, required: true },
  description: { type: String },
});

const CourseSchema = new Schema<CourseDocument>({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  credits: { type: Number, required: true },
  offeredIn: { type: String, required: true },
  description: { type: String, required: true },
  requisites: [RequisiteSchema],
});

const CourseModel = mongoose.model<CourseDocument>('Course', CourseSchema);

// ==========================
// Contrôleur MongoDB
// ==========================

export default class CourseController_Mongo {
  /**
   * 🔹 Récupère tous les cours
   */
  static async getAllCourses(req: Request, res: Response): Promise<Response> {
    try {
      const courses = await CourseModel.find();
      const formatted = courses.map((c) => c.toObject() as CourseTypes.CourseInfoDB);
      return res.status(200).json(formatted);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   *  Récupère un cours par son code
   */
  static async getCourseByCode(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const courseDoc = await CourseModel.findOne({ code });

      if (!courseDoc) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const course = courseDoc.toObject() as CourseTypes.CourseInfoDB;
      return res.status(200).json(course);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   *  Crée un nouveau cours
   */
  static async createCourse(req: Request, res: Response): Promise<Response> {
    try {
      const newCourseData: CourseTypes.CourseInfoDB = req.body;

      const existing = await CourseModel.findOne({ code: newCourseData.code });
      if (existing) {
        return res.status(400).json({ error: 'Course already exists' });
      }

      const newCourse = new CourseModel(newCourseData);
      await newCourse.save();

      return res.status(201).json(newCourse.toObject() as CourseTypes.CourseInfoDB);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   *  Met à jour un cours existant
   */
  static async updateCourse(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const updates: Partial<CourseTypes.CourseInfoDB> = req.body;

      const updated = await CourseModel.findOneAndUpdate({ code }, updates, { new: true });
      if (!updated) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.status(200).json(updated.toObject() as CourseTypes.CourseInfoDB);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   *  Supprime un cours
   */
  static async deleteCourse(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;

      const deleted = await CourseModel.findOneAndDelete({ code });
      if (!deleted) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.status(200).json({ message: 'Course deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   *  Récupère les cours selon un "pool"
   */
  static async getCoursesByPool(req: Request, res: Response): Promise<Response> {
    try {
      const { poolName } = req.params;
      const courses = await CourseModel.find({ offeredIn: poolName });

      const formatted = courses.map((c) => c.toObject() as CourseTypes.CourseInfoDB);
      return res.status(200).json(formatted);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
