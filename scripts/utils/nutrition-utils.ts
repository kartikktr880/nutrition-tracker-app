export interface NutritionInfo {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
}

export class NutritionUtils {
    static calculateTotalNutrition(items: NutritionInfo[]): NutritionInfo {
        return items.reduce((total, item) => ({
            calories: total.calories + item.calories,
            protein: total.protein + item.protein,
            carbs: total.carbs + item.carbs,
            fat: total.fat + item.fat,
            fiber: (total.fiber || 0) + (item.fiber || 0),
            sugar: (total.sugar || 0) + (item.sugar || 0),
            sodium: (total.sodium || 0) + (item.sodium || 0)
        }), {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
        });
    }

    static calculateCalories(nutrition: NutritionInfo): number {
        return (
            nutrition.protein * 4 + // 4 calories per gram of protein
            nutrition.carbs * 4 +   // 4 calories per gram of carbs
            nutrition.fat * 9       // 9 calories per gram of fat
        );
    }

    static calculateMacroPercentages(nutrition: NutritionInfo): {
        protein: number;
        carbs: number;
        fat: number;
    } {
        const totalCalories = this.calculateCalories(nutrition);
        return {
            protein: (nutrition.protein * 4 / totalCalories) * 100,
            carbs: (nutrition.carbs * 4 / totalCalories) * 100,
            fat: (nutrition.fat * 9 / totalCalories) * 100
        };
    }

    static calculateBMI(weightKg: number, heightCm: number): number {
        const heightM = heightCm / 100;
        return weightKg / (heightM * heightM);
    }

    static getBMICategory(bmi: number): string {
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal weight';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    }

    static calculateBMR(
        weightKg: number,
        heightCm: number,
        age: number,
        isMale: boolean
    ): number {
        // Mifflin-St Jeor Equation
        return (
            10 * weightKg +
            6.25 * heightCm -
            5 * age +
            (isMale ? 5 : -161)
        );
    }

    static calculateTDEE(
        bmr: number,
        activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
    ): number {
        const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        return bmr * multipliers[activityLevel];
    }

    static calculateWaterIntake(weightKg: number): number {
        // 30-35ml per kg of body weight
        return weightKg * 33;
    }

    static calculateProteinNeeds(
        weightKg: number,
        activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
    ): number {
        const multipliers = {
            sedentary: 0.8,
            light: 1.0,
            moderate: 1.2,
            active: 1.4,
            very_active: 1.6
        };
        return weightKg * multipliers[activityLevel];
    }

    static formatNutritionValue(value: number, unit: string): string {
        return `${value.toFixed(1)}${unit}`;
    }

    static validateNutritionInfo(nutrition: NutritionInfo): boolean {
        return (
            nutrition.calories >= 0 &&
            nutrition.protein >= 0 &&
            nutrition.carbs >= 0 &&
            nutrition.fat >= 0 &&
            (!nutrition.fiber || nutrition.fiber >= 0) &&
            (!nutrition.sugar || nutrition.sugar >= 0) &&
            (!nutrition.sodium || nutrition.sodium >= 0)
        );
    }
} 