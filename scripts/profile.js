import { auth, db } from './auth-core.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Firebase Auth
    const user = await initializeAuth();
    
    // If no user is logged in, redirect is handled by auth.js
    if (!user) return;
    
    // DOM Elements - Basic Info
    const profileImage = document.getElementById('profile-image');
    const profilePictureUpload = document.getElementById('profile-picture-upload');
    const displayNameInput = document.getElementById('display-name');
    const emailInput = document.getElementById('email');
    const birthdateInput = document.getElementById('birthdate');
    const genderSelect = document.getElementById('gender');
    
    // DOM Elements - Physical Info
    const heightInput = document.getElementById('height');
    const heightUnitSelect = document.getElementById('height-unit');
    const weightInput = document.getElementById('weight');
    const weightUnitSelect = document.getElementById('weight-unit');
    const activityLevelSelect = document.getElementById('activity-level');
    
    // DOM Elements - Goals
    const goalTypeSelect = document.getElementById('goal-type');
    const targetWeightInput = document.getElementById('target-weight');
    const weeklyGoalSelect = document.getElementById('weekly-goal');
    const proteinGoalInput = document.getElementById('protein-goal');
    const carbsGoalInput = document.getElementById('carbs-goal');
    const fatGoalInput = document.getElementById('fat-goal');
    
    // DOM Elements - Preferences
    const measurementSystemSelect = document.getElementById('measurement-system');
    const dietaryCheckboxes = document.querySelectorAll('input[name="dietary"]');
    const allergyCheckboxes = document.querySelectorAll('input[name="allergies"]');
    const notificationCheckboxes = document.querySelectorAll('input[name="notifications"]');
    
    // Forms
    const basicInfoForm = document.getElementById('basic-info-form');
    const physicalInfoForm = document.getElementById('physical-info-form');
    const goalsForm = document.getElementById('goals-form');
    const preferencesForm = document.getElementById('preferences-form');
    
    // Loading state
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    loadingSpinner.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingSpinner);
    
    // Load user profile data
    await loadUserProfile();
    
    // Event Listeners
    profilePictureUpload.addEventListener('change', handleProfilePictureUpload);
    basicInfoForm.addEventListener('submit', handleBasicInfoSubmit);
    physicalInfoForm.addEventListener('submit', handlePhysicalInfoSubmit);
    goalsForm.addEventListener('submit', handleGoalsSubmit);
    preferencesForm.addEventListener('submit', handlePreferencesSubmit);
    
    // Unit conversion event listeners
    heightUnitSelect.addEventListener('change', handleHeightUnitChange);
    weightUnitSelect.addEventListener('change', handleWeightUnitChange);
    measurementSystemSelect.addEventListener('change', handleMeasurementSystemChange);
    
    // Load user profile data from Firebase
    async function loadUserProfile() {
        try {
            loadingSpinner.style.display = 'flex';
            
            const result = await getUserProfile(user.uid);
            
            if (result.success) {
                const profile = result.data;
                
                // Basic Info
                if (profile.photoURL) {
                    profileImage.src = profile.photoURL;
                }
                displayNameInput.value = profile.displayName || '';
                emailInput.value = user.email || '';
                birthdateInput.value = profile.birthdate || '';
                genderSelect.value = profile.gender || '';
                
                // Physical Info
                heightInput.value = profile.height || '';
                heightUnitSelect.value = profile.heightUnit || 'cm';
                weightInput.value = profile.weight || '';
                weightUnitSelect.value = profile.weightUnit || 'kg';
                activityLevelSelect.value = profile.activityLevel || '';
                
                // Goals
                goalTypeSelect.value = profile.goalType || 'maintain';
                targetWeightInput.value = profile.targetWeight || '';
                weeklyGoalSelect.value = profile.weeklyGoal || '0.5';
                proteinGoalInput.value = profile.macroGoals?.protein || 30;
                carbsGoalInput.value = profile.macroGoals?.carbs || 40;
                fatGoalInput.value = profile.macroGoals?.fat || 30;
                
                // Preferences
                measurementSystemSelect.value = profile.measurementSystem || 'metric';
                
                // Set dietary preferences
                if (profile.dietaryPreferences) {
                    dietaryCheckboxes.forEach(checkbox => {
                        checkbox.checked = profile.dietaryPreferences.includes(checkbox.value);
                    });
                }
                
                // Set allergies
                if (profile.allergies) {
                    allergyCheckboxes.forEach(checkbox => {
                        checkbox.checked = profile.allergies.includes(checkbox.value);
                    });
                }
                
                // Set notification preferences
                if (profile.notificationPreferences) {
                    notificationCheckboxes.forEach(checkbox => {
                        checkbox.checked = profile.notificationPreferences.includes(checkbox.value);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showError('Failed to load profile data. Please try again later.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle profile picture upload
    async function handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError('Please upload an image file.');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Please upload an image smaller than 5MB.');
            return;
        }
        
        try {
            loadingSpinner.style.display = 'flex';
            
            // Create a temporary URL for preview
            const reader = new FileReader();
            reader.onload = function(e) {
                profileImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            // TODO: Implement Firebase Storage upload
            // For now, we'll just store the data URL
            const result = await updateUserProfile(user.uid, {
                photoURL: profileImage.src
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            showSuccess('Profile picture updated successfully!');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showError('Failed to upload profile picture. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle basic info form submit
    async function handleBasicInfoSubmit(event) {
        event.preventDefault();
        
        try {
            loadingSpinner.style.display = 'flex';
            
            const basicInfo = {
                displayName: displayNameInput.value,
                birthdate: birthdateInput.value,
                gender: genderSelect.value
            };
            
            const result = await updateUserProfile(user.uid, basicInfo);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            showSuccess('Basic information updated successfully!');
        } catch (error) {
            console.error('Error updating basic info:', error);
            showError('Failed to update basic information. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle physical info form submit
    async function handlePhysicalInfoSubmit(event) {
        event.preventDefault();
        
        try {
            loadingSpinner.style.display = 'flex';
            
            const physicalInfo = {
                height: parseFloat(heightInput.value),
                heightUnit: heightUnitSelect.value,
                weight: parseFloat(weightInput.value),
                weightUnit: weightUnitSelect.value,
                activityLevel: activityLevelSelect.value
            };
            
            const result = await updateUserProfile(user.uid, physicalInfo);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            showSuccess('Physical information updated successfully!');
        } catch (error) {
            console.error('Error updating physical info:', error);
            showError('Failed to update physical information. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle goals form submit
    async function handleGoalsSubmit(event) {
        event.preventDefault();
        
        try {
            loadingSpinner.style.display = 'flex';
            
            const goals = {
                goalType: goalTypeSelect.value,
                targetWeight: parseFloat(targetWeightInput.value),
                weeklyGoal: parseFloat(weeklyGoalSelect.value),
                macroGoals: {
                    protein: parseInt(proteinGoalInput.value),
                    carbs: parseInt(carbsGoalInput.value),
                    fat: parseInt(fatGoalInput.value)
                }
            };
            
            // Validate macro percentages sum to 100
            const macroSum = goals.macroGoals.protein + goals.macroGoals.carbs + goals.macroGoals.fat;
            if (macroSum !== 100) {
                throw new Error('Macro percentages must sum to 100%');
            }
            
            const result = await updateUserProfile(user.uid, goals);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            showSuccess('Goals updated successfully!');
        } catch (error) {
            console.error('Error updating goals:', error);
            showError(error.message || 'Failed to update goals. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle preferences form submit
    async function handlePreferencesSubmit(event) {
        event.preventDefault();
        
        try {
            loadingSpinner.style.display = 'flex';
            
            const preferences = {
                measurementSystem: measurementSystemSelect.value,
                dietaryPreferences: Array.from(dietaryCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value),
                allergies: Array.from(allergyCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value),
                notificationPreferences: Array.from(notificationCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value)
            };
            
            const result = await updateUserProfile(user.uid, preferences);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            showSuccess('Preferences updated successfully!');
        } catch (error) {
            console.error('Error updating preferences:', error);
            showError('Failed to update preferences. Please try again.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }
    
    // Handle height unit change
    function handleHeightUnitChange() {
        const height = parseFloat(heightInput.value);
        if (isNaN(height)) return;
        
        if (heightUnitSelect.value === 'ft' && heightInput.dataset.unit === 'cm') {
            // Convert cm to ft
            heightInput.value = (height / 30.48).toFixed(2);
        } else if (heightUnitSelect.value === 'cm' && heightInput.dataset.unit === 'ft') {
            // Convert ft to cm
            heightInput.value = (height * 30.48).toFixed(2);
        }
        
        heightInput.dataset.unit = heightUnitSelect.value;
    }
    
    // Handle weight unit change
    function handleWeightUnitChange() {
        const weight = parseFloat(weightInput.value);
        if (isNaN(weight)) return;
        
        if (weightUnitSelect.value === 'lbs' && weightInput.dataset.unit === 'kg') {
            // Convert kg to lbs
            weightInput.value = (weight * 2.20462).toFixed(2);
        } else if (weightUnitSelect.value === 'kg' && weightInput.dataset.unit === 'lbs') {
            // Convert lbs to kg
            weightInput.value = (weight / 2.20462).toFixed(2);
        }
        
        weightInput.dataset.unit = weightUnitSelect.value;
    }
    
    // Handle measurement system change
    function handleMeasurementSystemChange() {
        if (measurementSystemSelect.value === 'imperial') {
            heightUnitSelect.value = 'ft';
            weightUnitSelect.value = 'lbs';
        } else {
            heightUnitSelect.value = 'cm';
            weightUnitSelect.value = 'kg';
        }
        
        handleHeightUnitChange();
        handleWeightUnitChange();
    }
    
    // Helper function to show success message
    function showSuccess(message) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = message;
        document.querySelector('.profile-container').prepend(successMessage);
        
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    }
    
    // Helper function to show error message
    function showError(message) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        document.querySelector('.profile-container').prepend(errorMessage);
        
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
    }
}); 