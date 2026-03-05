import wordsData from '../data/words.json';

export class WordService {
    private allWords: string[];
    private usedWords: Set<string> = new Set();

    constructor() {
        this.allWords = Object.values(wordsData).flat();
    }

    /** Returns N unique random words not yet used in this game */
    getWords(count: number): string[] {
        const available = this.allWords.filter(w => !this.usedWords.has(w));
        const shuffled = available.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        selected.forEach(w => this.usedWords.add(w));
        return selected;
    }

    reset(): void {
        this.usedWords.clear();
    }
}
