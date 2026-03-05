"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordService = void 0;
const words_json_1 = __importDefault(require("../data/words.json"));
class WordService {
    constructor() {
        this.usedWords = new Set();
        this.allWords = Object.values(words_json_1.default).flat();
    }
    /** Returns N unique random words not yet used in this game */
    getWords(count) {
        const available = this.allWords.filter(w => !this.usedWords.has(w));
        const shuffled = available.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        selected.forEach(w => this.usedWords.add(w));
        return selected;
    }
    reset() {
        this.usedWords.clear();
    }
}
exports.WordService = WordService;
