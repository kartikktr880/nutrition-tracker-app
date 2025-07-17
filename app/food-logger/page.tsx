'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Clock, 
  Utensils,
  Apple,
  Beef,
  Fish,
  Wheat,
  Milk,
  Coffee,
  X,
  Loader2
} from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner/BarcodeScanner';
import { useAppStore, useFoodEntries } from '@/lib/store';


interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  servingSize: number;
  servingUnit: string;
}

interface SearchResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'lunch', label: 'Lunch', icon: Utensils },
  { value: 'dinner', label: 'Dinner', icon: Utensils },
  { value: 'snack', label: 'Snack', icon: Apple },
];

const FOOD_CATEGORIES = [
  { value: 'fruits', label: 'Fruits & Vegetables', icon: Apple },
  { value: 'protein', label: 'Protein', icon: Beef },
  { value: 'grains', label: 'Grains', icon: Wheat },
  { value: 'dairy', label: 'Dairy', icon: Milk },
  { value: 'seafood', label: 'Seafood', icon: Fish },
];

export default function FoodLoggerPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingSize, setServingSize] = useState(1);
  const [mealType, setMealType] = useState('snack');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  
  const foodEntries = useFoodEntries();
  const { addFoodEntry, addRecentSearch } = useAppStore();

  // Mock search function - in real app, this would call an API
  const searchFood = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock search results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        name: 'Chicken Breast',
        brand: 'Organic Valley',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
      {
        id: '2',
        name: 'Brown Rice',
        brand: 'Uncle Ben\'s',
        calories: 216,
        protein: 4.5,
        carbs: 45,
        fat: 1.8,
      },
      {
        id: '3',
        name: 'Broccoli',
        brand: 'Fresh Market',
        calories: 55,
        protein: 3.7,
        carbs: 11,
        fat: 0.6,
      },
      {
        id: '4',
        name: 'Greek Yogurt',
        brand: 'Chobani',
        calories: 130,
        protein: 23,
        carbs: 9,
        fat: 0.5,
      },
    ].filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.brand?.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(mockResults);
    setIsSearching(false);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        searchFood(searchQuery);
        addRecentSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, addRecentSearch]);

  const handleFoodSelect = (food: SearchResult) => {
    const selectedFoodItem: FoodItem = {
      id: food.id,
      name: food.name,
      brand: food.brand,
      nutrition: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: 0, // Would come from API
        sugar: 0, // Would come from API
        sodium: 0, // Would come from API
      },
      servingSize: 100,
      servingUnit: 'g',
    };
    
    setSelectedFood(selectedFoodItem);
    setActiveTab('add');
  };

  const handleBarcodeScan = (barcode: string) => {
    // In real app, this would look up the barcode in a database
          // Barcode scanned successfully
    
    // Simulate finding a product
    const scannedFood: FoodItem = {
      id: 'scanned-' + barcode,
      name: 'Scanned Product',
      barcode,
      nutrition: {
        calories: 150,
        protein: 5,
        carbs: 25,
        fat: 2,
        fiber: 3,
        sugar: 8,
        sodium: 200,
      },
      servingSize: 100,
      servingUnit: 'g',
    };
    
    setSelectedFood(scannedFood);
    setActiveTab('add');
  };

  const handleAddFood = async () => {
    if (!selectedFood || !session?.user) return;

    setIsAdding(true);
    try {
      const adjustedNutrition = {
        calories: (selectedFood.nutrition.calories * servingSize) / 100,
        protein: (selectedFood.nutrition.protein * servingSize) / 100,
        carbs: (selectedFood.nutrition.carbs * servingSize) / 100,
        fat: (selectedFood.nutrition.fat * servingSize) / 100,
        fiber: (selectedFood.nutrition.fiber * servingSize) / 100,
        sugar: (selectedFood.nutrition.sugar * servingSize) / 100,
        sodium: (selectedFood.nutrition.sodium * servingSize) / 100,
      };

      addFoodEntry({
        name: selectedFood.name,
        nutrition: adjustedNutrition,
        servingSize,
        servingUnit: selectedFood.servingUnit,
        timestamp: new Date(),
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      });

      // Reset form
      setSelectedFood(null);
      setServingSize(1);
      setMealType('snack');
      setActiveTab('search');
      setSearchQuery('');
    } catch (error) {
      // Failed to add food entry - handled by error boundary
    } finally {
      setIsAdding(false);
    }
  };

  const getTodayEntries = () => {
    const today = new Date().toDateString();
    return foodEntries.filter(entry => 
      new Date(entry.timestamp).toDateString() === today
    );
  };

  const todayEntries = getTodayEntries();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Food Logger
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your meals and nutrition intake
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Search Food</TabsTrigger>
              <TabsTrigger value="add">Add Food</TabsTrigger>
              <TabsTrigger value="today">Today&apos;s Log</TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Search for Food</CardTitle>
                  <CardDescription>
                    Find foods by name, brand, or scan a barcode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search for food items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <BarcodeScanner onScan={handleBarcodeScan} />
                  </div>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Searching...</span>
                    </div>
                  )}

                  {!isSearching && searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((food) => (
                        <div
                          key={food.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleFoodSelect(food)}
                        >
                          <div>
                            <div className="font-medium">{food.name}</div>
                            {food.brand && (
                              <div className="text-sm text-gray-500">{food.brand}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{food.calories} cal</div>
                            <div className="text-sm text-gray-500">
                              P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isSearching && searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No foods found. Try a different search term.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add Food Tab */}
            <TabsContent value="add" className="space-y-4">
              {selectedFood ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Food Entry</CardTitle>
                    <CardDescription>
                      Review and add the selected food to your log
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Food Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{selectedFood.name}</h3>
                          {selectedFood.brand && (
                            <p className="text-sm text-gray-600">{selectedFood.brand}</p>
                          )}
                          {selectedFood.barcode && (
                            <Badge variant="outline" className="mt-1">
                              Barcode: {selectedFood.barcode}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFood(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Serving Size */}
                    <div className="space-y-2">
                      <Label htmlFor="serving-size">Serving Size</Label>
                      <div className="flex gap-2">
                        <Input
                          id="serving-size"
                          type="number"
                          value={servingSize}
                          onChange={(e) => setServingSize(parseFloat(e.target.value) || 1)}
                          min="0.1"
                          step="0.1"
                          className="flex-1"
                        />
                        <span className="flex items-center px-3 bg-gray-100 rounded-md">
                          {selectedFood.servingUnit}
                        </span>
                      </div>
                    </div>

                    {/* Meal Type */}
                    <div className="space-y-2">
                      <Label htmlFor="meal-type">Meal Type</Label>
                      <Select value={mealType} onValueChange={setMealType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_TYPES.map((meal) => (
                            <SelectItem key={meal.value} value={meal.value}>
                              <div className="flex items-center gap-2">
                                <meal.icon className="h-4 w-4" />
                                {meal.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Nutrition Preview */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Nutrition (per {servingSize} {selectedFood.servingUnit})</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Calories: {Math.round((selectedFood.nutrition.calories * servingSize) / 100)}</div>
                        <div>Protein: {((selectedFood.nutrition.protein * servingSize) / 100).toFixed(1)}g</div>
                        <div>Carbs: {((selectedFood.nutrition.carbs * servingSize) / 100).toFixed(1)}g</div>
                        <div>Fat: {((selectedFood.nutrition.fat * servingSize) / 100).toFixed(1)}g</div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button 
                      onClick={handleAddFood}
                      disabled={isAdding}
                      className="w-full"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Food Log
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Search for a food item or scan a barcode to add it to your log.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Today's Log Tab */}
            <TabsContent value="today" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Today&apos;s Food Log</CardTitle>
                  <CardDescription>
                    Your food entries for today
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todayEntries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4" />
                      <p>No food entries yet today.</p>
                      <p className="text-sm">Start by searching for foods to add.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{entry.name}</div>
                            <div className="text-sm text-gray-500">
                              {entry.servingSize} {entry.servingUnit} • {entry.mealType}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{Math.round(entry.nutrition.calories)} cal</div>
                            <div className="text-sm text-gray-500">
                              {entry.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Add */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <BarcodeScanner onScan={handleBarcodeScan} className="w-full" />
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Manual Entry
              </Button>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card>
            <CardHeader>
                                <CardTitle>Today&apos;s Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Calories:</span>
                  <span className="font-medium">
                    {todayEntries.reduce((sum, entry) => sum + entry.nutrition.calories, 0).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Protein:</span>
                  <span className="font-medium">
                    {todayEntries.reduce((sum, entry) => sum + entry.nutrition.protein, 0).toFixed(1)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Carbs:</span>
                  <span className="font-medium">
                    {todayEntries.reduce((sum, entry) => sum + entry.nutrition.carbs, 0).toFixed(1)}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fat:</span>
                  <span className="font-medium">
                    {todayEntries.reduce((sum, entry) => sum + entry.nutrition.fat, 0).toFixed(1)}g
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Food Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Food Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {FOOD_CATEGORIES.map((category) => (
                  <Button
                    key={category.value}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setSearchQuery(category.label);
                      setActiveTab('search');
                    }}
                  >
                    <category.icon className="h-4 w-4 mr-2" />
                    {category.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 