export class FoodTypeUtils {
    private foodHistory: Array<{
        name: string;
        amount: number;
        unit: string;
        date: Date;
    }>;
    private favorites: Array<{
        name: string;
        amount: number;
        unit: string;
    }>;

    constructor() {
        this.foodHistory = [];
        this.favorites = [];
    }

    classifyFoodType(foodName: string): 'protein' | 'carb' | 'fat' | 'vegetable' | 'other' {
        const foodNameLower = foodName.toLowerCase();
        
        if (foodNameLower.includes('chicken') || 
            foodNameLower.includes('beef') || 
            foodNameLower.includes('fish') || 
            foodNameLower.includes('egg')) {
            return 'protein';
        }
        
        if (foodNameLower.includes('rice') || 
            foodNameLower.includes('pasta') || 
            foodNameLower.includes('bread') || 
            foodNameLower.includes('potato')) {
            return 'carb';
        }
        
        if (foodNameLower.includes('oil') || 
            foodNameLower.includes('butter') || 
            foodNameLower.includes('avocado') || 
            foodNameLower.includes('nuts')) {
            return 'fat';
        }
        
        if (foodNameLower.includes('broccoli') || 
            foodNameLower.includes('spinach') || 
            foodNameLower.includes('carrot') || 
            foodNameLower.includes('lettuce')) {
            return 'vegetable';
        }
        
        return 'other';
    }

    calculateMacronutrients(food: {
        name: string;
        amount: number;
        unit: string;
    }): { protein: number; carbs: number; fat: number } {
        const type = this.classifyFoodType(food.name);
        const amount = this.convertUnit(food.amount, food.unit, 'g');
        
        switch (type) {
            case 'protein':
                return { protein: amount * 0.25, carbs: 0, fat: amount * 0.05 };
            case 'carb':
                return { protein: 0, carbs: amount * 0.75, fat: 0 };
            case 'fat':
                return { protein: 0, carbs: 0, fat: amount * 0.9 };
            case 'vegetable':
                return { protein: amount * 0.1, carbs: amount * 0.2, fat: 0 };
            default:
                return { protein: 0, carbs: 0, fat: 0 };
        }
    }

    validateFoodEntry(entry: {
        name: string;
        amount: number;
        unit: string;
    }): boolean {
        return (
            entry.name.trim().length > 0 &&
            entry.amount > 0 &&
            ['g', 'oz', 'ml', 'cup'].includes(entry.unit)
        );
    }

    convertUnit(amount: number, fromUnit: string, toUnit: string): number {
        const conversions: { [key: string]: { [key: string]: number } } = {
            'g': { 'oz': 0.035274, 'ml': 1, 'cup': 0.00422675 },
            'oz': { 'g': 28.3495, 'ml': 28.3495, 'cup': 0.119826 },
            'ml': { 'g': 1, 'oz': 0.035274, 'cup': 0.00422675 },
            'cup': { 'g': 236.588, 'oz': 8.3454, 'ml': 236.588 }
        };

        if (fromUnit === toUnit) return amount;
        return amount * conversions[fromUnit][toUnit];
    }

    searchFood(query: string): string[] {
        const foods = [
            'chicken breast', 'rice', 'olive oil', 'broccoli',
            'salmon', 'pasta', 'avocado', 'spinach',
            'beef', 'potato', 'butter', 'carrot'
        ];
        
        return foods.filter(food => 
            food.toLowerCase().includes(query.toLowerCase())
        );
    }

    getFoodCategories(): string[] {
        return ['protein', 'carb', 'fat', 'vegetable', 'other'];
    }

    addToHistory(entry: {
        name: string;
        amount: number;
        unit: string;
        date: Date;
    }): void {
        this.foodHistory.push(entry);
    }

    getFoodHistory(): Array<{
        name: string;
        amount: number;
        unit: string;
        date: Date;
    }> {
        return [...this.foodHistory];
    }

    addToFavorites(entry: {
        name: string;
        amount: number;
        unit: string;
    }): void {
        this.favorites.push(entry);
    }

    getFavorites(): Array<{
        name: string;
        amount: number;
        unit: string;
    }> {
        return [...this.favorites];
    }

    getRecommendations(type: 'protein' | 'carb' | 'fat' | 'vegetable'): string[] {
        const recommendations: { [key: string]: string[] } = {
            protein: ['chicken breast', 'salmon', 'beef', 'eggs'],
            carb: ['rice', 'pasta', 'potato', 'bread'],
            fat: ['olive oil', 'avocado', 'butter', 'nuts'],
            vegetable: ['broccoli', 'spinach', 'carrot', 'lettuce']
        };
        
        return recommendations[type] || [];
    }
} 