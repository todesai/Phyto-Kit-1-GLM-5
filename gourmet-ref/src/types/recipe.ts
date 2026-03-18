export interface Meal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strTags?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
}

export interface MealDetail extends Meal {
  strIngredients: { name: string; measure: string }[];
  strInstructionsList: string[];
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminA?: number;
}

export interface Ingredient {
  idIngredient: string;
  strIngredient: string;
  strDescription?: string;
  strType?: string;
}
