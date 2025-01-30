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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Car = exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DATABASE = process.env.DATABASE || "default_url";
const connect = mongoose_1.default.connect(DATABASE);
connect.then(() => {
    console.log("Connected to database.");
}).catch((err) => {
    console.log("some error occured");
});
// User Schema
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
});
// Car Schema
const carSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: {
        type: [String],
        validate: {
            validator: (val) => val.length <= 10,
            message: "Images array exceeds the limit of 10",
        },
    },
    tags: {
        carType: { type: String, required: true },
        company: { type: String, required: true },
        dealer: { type: String, required: true },
    },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Middleware to update the updatedAt field
carSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});
// Index for search functionality
carSchema.index({
    title: "text",
    "tags.carType": "text",
    "tags.company": "text",
    "tags.dealer": "text",
});
// Models
const User = mongoose_1.default.model("User", userSchema);
exports.User = User;
const Car = mongoose_1.default.model("Car", carSchema);
exports.Car = Car;
