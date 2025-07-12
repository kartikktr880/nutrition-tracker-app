import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Test data
const testFood = {
    id: 'test-food-1',
    name: 'Test Food Item',
    calories: 250,
    protein: 20,
    carbs: 30,
    fat: 10,
    unit: 'serving',
    servingSize: 1
};

// Test suite for food logger functionality
class FoodLoggerTester {
    constructor() {
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runTests() {
        logInfo('🧪 Starting Food Logger Tests...\n');
        
        // Test cases
        await this.testCreateFoodEntry();
        await this.testCalculateMacros();
        await this.testMealTotals();
        await this.testMacroDistribution();
        await this.testProgressBars();
        
        // Print summary
        this.printSummary();
    }

    async testCreateFoodEntry() {
        logInfo('Testing Food Entry Creation:');
        
        try {
            const entry = createFoodEntry(testFood, 1);
            
            // Verify entry structure
            const tests = [
                {
                    name: 'Entry has correct class',
                    condition: entry.className === 'food-entry'
                },
                {
                    name: 'Food name is displayed correctly',
                    condition: entry.querySelector('.food-name-col').textContent === testFood.name
                },
                {
                    name: 'Calories are displayed correctly',
                    condition: entry.querySelector('.food-calories-col').textContent === '250 kcal'
                },
                {
                    name: 'Protein is displayed correctly',
                    condition: entry.querySelector('.food-protein-col').textContent === '20.0 g'
                },
                {
                    name: 'Carbs are displayed correctly',
                    condition: entry.querySelector('.food-carbs-col').textContent === '30.0 g'
                },
                {
                    name: 'Fat is displayed correctly',
                    condition: entry.querySelector('.food-fat-col').textContent === '10.0 g'
                },
                {
                    name: 'Edit button exists',
                    condition: entry.querySelector('.action-edit') !== null
                },
                {
                    name: 'Delete button exists',
                    condition: entry.querySelector('.action-delete') !== null
                }
            ];
            
            this.runTestGroup(tests);
        } catch (error) {
            logError('❌ Error in createFoodEntry:', error);
            this.failedTests++;
        }
    }

    async testCalculateMacros() {
        logInfo('\nTesting Macro Calculations:');
        
        const amounts = [0.5, 1, 2];
        amounts.forEach(amount => {
            const macros = calculateMacros(testFood, amount);
            
            const tests = [
                {
                    name: `Calories calculation (${amount}x)`,
                    condition: macros.calories === testFood.calories * amount
                },
                {
                    name: `Protein calculation (${amount}x)`,
                    condition: macros.protein === testFood.protein * amount
                },
                {
                    name: `Carbs calculation (${amount}x)`,
                    condition: macros.carbs === testFood.carbs * amount
                },
                {
                    name: `Fat calculation (${amount}x)`,
                    condition: macros.fat === testFood.fat * amount
                }
            ];
            
            this.runTestGroup(tests);
        });
    }

    async testMealTotals() {
        logInfo('\nTesting Meal Totals:');
        
        try {
            // Clear existing entries
            foodEntriesContainer.innerHTML = '';
            
            // Add test entries
            const entries = [
                { ...testFood },
                { ...testFood, amount: 0.5 },
                { ...testFood, amount: 2 }
            ];
            
            entries.forEach(entry => {
                foodEntriesContainer.appendChild(createFoodEntry(entry, entry.amount));
            });
            
            // Update totals
            updateMealTotals();
            
            // Expected totals
            const expectedTotals = {
                calories: testFood.calories * 3.5,
                protein: testFood.protein * 3.5,
                carbs: testFood.carbs * 3.5,
                fat: testFood.fat * 3.5
            };
            
            const tests = [
                {
                    name: 'Total calories are correct',
                    condition: document.getElementById('meal-calories').textContent === `${expectedTotals.calories.toFixed(0)} kcal`
                },
                {
                    name: 'Total protein is correct',
                    condition: document.getElementById('meal-protein').textContent === `${expectedTotals.protein.toFixed(1)} g`
                },
                {
                    name: 'Total carbs are correct',
                    condition: document.getElementById('meal-carbs').textContent === `${expectedTotals.carbs.toFixed(1)} g`
                },
                {
                    name: 'Total fat is correct',
                    condition: document.getElementById('meal-fat').textContent === `${expectedTotals.fat.toFixed(1)} g`
                }
            ];
            
            this.runTestGroup(tests);
        } catch (error) {
            logError('❌ Error in testMealTotals:', error);
            this.failedTests++;
        }
    }

    async testMacroDistribution() {
        logInfo('\nTesting Macro Distribution:');
        
        try {
            const totals = {
                calories: 400,
                protein: 25, // 100 calories from protein (25%)
                carbs: 50,   // 200 calories from carbs (50%)
                fat: 11.11   // 100 calories from fat (25%)
            };
            
            updateMacroDistribution(totals);
            
            const tests = [
                {
                    name: 'Protein percentage is correct',
                    condition: document.getElementById('protein-percent').textContent === '25%'
                },
                {
                    name: 'Carbs percentage is correct',
                    condition: document.getElementById('carbs-percent').textContent === '50%'
                },
                {
                    name: 'Fat percentage is correct',
                    condition: document.getElementById('fat-percent').textContent === '25%'
                }
            ];
            
            this.runTestGroup(tests);
        } catch (error) {
            logError('❌ Error in testMacroDistribution:', error);
            this.failedTests++;
        }
    }

    async testProgressBars() {
        logInfo('\nTesting Progress Bars:');
        
        try {
            // Set test goals
            document.getElementById('calories-goal').textContent = '2000';
            document.getElementById('protein-goal').textContent = '100';
            document.getElementById('carbs-goal').textContent = '250';
            document.getElementById('fat-goal').textContent = '65';
            
            const totals = {
                calories: 1000, // 50%
                protein: 50,    // 50%
                carbs: 250,     // 100%
                fat: 97.5       // 150%
            };
            
            updateProgressBars(totals);
            
            const tests = [
                {
                    name: 'Calories progress bar width is correct',
                    condition: document.getElementById('calories-progress').style.width === '50%'
                },
                {
                    name: 'Protein progress bar width is correct',
                    condition: document.getElementById('protein-progress').style.width === '50%'
                },
                {
                    name: 'Carbs progress bar width is correct',
                    condition: document.getElementById('carbs-progress').style.width === '100%'
                },
                {
                    name: 'Fat progress bar width is correct',
                    condition: document.getElementById('fat-progress').style.width === '100%'
                },
                {
                    name: 'Fat progress bar has over-limit class',
                    condition: document.getElementById('fat-progress').classList.contains('over-limit')
                }
            ];
            
            this.runTestGroup(tests);
        } catch (error) {
            logError('❌ Error in testProgressBars:', error);
            this.failedTests++;
        }
    }

    runTestGroup(tests) {
        tests.forEach(test => {
            if (test.condition) {
                logInfo(`✅ ${test.name}`);
                this.passedTests++;
            } else {
                logInfo(`❌ ${test.name}`);
                this.failedTests++;
            }
        });
    }

    printSummary() {
        logInfo('\n📊 Test Summary:');
        logInfo(`Total Tests: ${this.passedTests + this.failedTests}`);
        logInfo(`Passed: ${this.passedTests} ✅`);
        logInfo(`Failed: ${this.failedTests} ❌`);
        
        if (this.failedTests === 0) {
            logInfo('\n🎉 All tests passed successfully!');
        } else {
            logInfo('\n⚠️ Some tests failed. Please review the output above.');
        }
    }
}

// Run tests when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const tester = new FoodLoggerTester();
    await tester.runTests();
}); 