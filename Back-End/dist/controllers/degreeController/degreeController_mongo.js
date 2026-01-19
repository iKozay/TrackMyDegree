"use strict";
// controllers/degreeController/degreeController_mongo.ts
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
const Sentry = __importStar(require("@sentry/node"));
// Use existing Degree model
const Degree_1 = require("../../models/Degree");
/**
 * Creates a new degree in the database.
 */
function createDegree(id, name, totalCredits) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if a degree with the same id or name already exists
            const existingDegree = yield Degree_1.Degree.findOne({ $or: [{ _id: id }, { name }] });
            if (existingDegree) {
                throw new Error('Degree with this id or name already exists.');
            }
            const newDegree = new Degree_1.Degree({
                _id: id,
                name,
                totalCredits,
            });
            yield newDegree.save();
            // Return plain object
            return {
                id: newDegree._id,
                name: newDegree.name,
                totalCredits: newDegree.totalCredits,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Retrieves a degree by its ID.
 */
function readDegree(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degree = yield Degree_1.Degree.findOne({ _id: id }).lean();
            if (!degree) {
                throw new Error('Degree with this id does not exist.');
            }
            return {
                id: degree._id,
                name: degree.name,
                totalCredits: degree.totalCredits,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Retrieves all degrees from the database (excluding ECP).
 */
function readAllDegrees() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degrees = yield Degree_1.Degree.find({ _id: { $ne: 'ECP' } }).lean();
            return degrees.map(degree => ({
                id: degree._id,
                name: degree.name,
                totalCredits: degree.totalCredits,
            }));
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Updates an existing degree with new information.
 */
function updateDegree(id, name, totalCredits) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const updatedDegree = yield Degree_1.Degree.findOneAndUpdate({ _id: id }, { name, totalCredits }, { new: true }).lean();
            if (!updatedDegree) {
                throw new Error('Degree with this id does not exist.');
            }
            return {
                id: updatedDegree._id,
                name: updatedDegree.name,
                totalCredits: updatedDegree.totalCredits,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Deletes a degree from the database by its ID.
 */
function deleteDegree(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const deletedDegree = yield Degree_1.Degree.findOneAndDelete({ _id: id });
            if (!deletedDegree) {
                throw new Error('Degree with this id does not exist.');
            }
            return `Degree with id ${id} has been successfully deleted.`;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
function getCreditsForDegree(degreeId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degree = yield Degree_1.Degree.findOne({ _id: degreeId }).lean();
            if (!degree) {
                throw new Error('Degree with this id does not exist.');
            }
            return degree.totalCredits;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
// Namespace
const degreeControllerMongo = {
    createDegree,
    readDegree,
    updateDegree,
    deleteDegree,
    readAllDegrees,
    getCreditsForDegree,
};
exports.default = degreeControllerMongo;
