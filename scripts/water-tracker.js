class WaterTracker {
  constructor() {
    this.currentDate = new Date();
    this.formatDate = date => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    this.waterData = JSON.parse(localStorage.getItem('waterData')) || {};
    this.settings = JSON.parse(localStorage.getItem('waterSettings')) || {
      goal: 2500,
      reminders: {
        enabled: false,
        frequency: 60,
        startTime: '08:00',
        endTime: '22:00',
        sound: 'droplet'
      }
    };
    
    this.achievements = {
      firstEntry: { unlocked: false, title: "First Sip!", description: "You logged your first water intake", icon: "tint" },
      dailyGoal: { unlocked: false, title: "Goal Reached!", description: "You reached your daily water intake goal", icon: "award" },
      perfectWeek: { unlocked: false, title: "Perfect Week", description: "You reached your goal every day for a week", icon: "calendar-check" },
      threeWeekStreak: { unlocked: false, title: "Hydration Master", description: "You maintained a 21-day water tracking streak", icon: "trophy" }
    };
    
    this.initElements();
    this.initEventListeners();
    this.loadCurrentDay();
    this.updateInsights();
    this.init();
  }

  initElements() {
    // Water level visualization
    this.waterLevel = document.getElementById('water-level');
    
    // Stats elements
    this.currentIntakeEl = document.getElementById('current-intake');
    this.dailyGoalEl = document.getElementById('daily-goal');
    this.percentageEl = document.getElementById('percentage');
    
    // Date navigation
    this.currentDateEl = document.getElementById('current-date');
    this.prevDayBtn = document.getElementById('prev-day');
    this.nextDayBtn = document.getElementById('next-day');
    
    // Entry containers
    this.entriesContainer = document.getElementById('water-entries-container');
    this.emptyLogMessage = document.getElementById('empty-log-message');
    
    // Quick add buttons
    this.quickAddBtns = document.querySelectorAll('.quick-add-btn');
    this.customAmountInput = document.getElementById('custom-amount');
    this.addCustomBtn = document.getElementById('add-custom-btn');
    
    // Goal editing
    this.editGoalBtn = document.getElementById('edit-goal-btn');
    this.editGoalModal = document.getElementById('edit-goal-modal');
    this.goalAmountInput = document.getElementById('goal-amount');
    this.presetGoalBtns = document.querySelectorAll('.preset-goal');
    this.saveGoalBtn = document.getElementById('save-goal-btn');
    
    // Reminders
    this.remindersSwitch = document.getElementById('reminders-switch');
    this.customizeRemindersBtn = document.getElementById('customize-reminders-btn');
    this.remindersModal = document.getElementById('reminders-modal');
    this.reminderFrequency = document.getElementById('reminder-frequency');
    this.startTime = document.getElementById('start-time');
    this.endTime = document.getElementById('end-time');
    this.notificationSound = document.getElementById('notification-sound');
    this.saveRemindersBtn = document.getElementById('save-reminders-btn');
    
    // Insights elements
    this.weeklyAverage = document.getElementById('weekly-average');
    this.weeklyTrend = document.getElementById('weekly-trend');
    this.currentStreak = document.getElementById('current-streak');
    this.streakMessage = document.getElementById('streak-message');
    this.goalCompletion = document.getElementById('goal-completion');
    this.completionBar = document.getElementById('completion-bar');
    
    // Close modal buttons
    this.closeModalBtns = document.querySelectorAll('.close-modal');
  }

  initEventListeners() {
    // Date navigation
    this.prevDayBtn.addEventListener('click', () => this.changeDay(-1));
    this.nextDayBtn.addEventListener('click', () => this.changeDay(1));
    
    // Quick add buttons
    this.quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseInt(btn.dataset.amount);
        this.addWaterEntry(amount);
      });
    });
    
    // Custom amount
    this.addCustomBtn.addEventListener('click', () => {
      const amount = parseInt(this.customAmountInput.value);
      if (amount > 0) {
        this.addWaterEntry(amount);
        this.customAmountInput.value = '';
      } else {
        this.showToast('Please enter a valid amount', 'error');
      }
    });
    
    // Handle Enter key on custom amount input
    this.customAmountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addCustomBtn.click();
      }
    });
    
    // Edit goal
    this.editGoalBtn.addEventListener('click', () => this.openEditGoalModal());
    
    // Preset goal buttons
    this.presetGoalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.goalAmountInput.value = btn.dataset.amount;
        this.presetGoalBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Save goal
    this.saveGoalBtn.addEventListener('click', () => this.saveGoal());
    
    // Reminders toggle
    this.remindersSwitch.addEventListener('change', () => {
      this.toggleReminders(this.remindersSwitch.checked);
    });
    
    // Customize reminders
    this.customizeRemindersBtn.addEventListener('click', () => this.openRemindersModal());
    
    // Save reminders settings
    this.saveRemindersBtn.addEventListener('click', () => this.saveReminderSettings());
    
    // Close modals
    this.closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });
    
    // Close modals when clicking on backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.parentElement.classList.remove('active');
        }
      });
    });
    
    // Initialize reminders switch
    this.remindersSwitch.checked = this.settings.reminders.enabled;
  }

  loadCurrentDay() {
    const currentDateKey = this.formatDate(this.currentDate);
    
    // Format the date for display
    this.currentDateEl.textContent = this.currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    
    // Initialize day data if it doesn't exist
    if (!this.waterData[currentDateKey]) {
      this.waterData[currentDateKey] = {
        entries: [],
        totalAmount: 0
      };
    }
    
    const dayData = this.waterData[currentDateKey];
    
    // Update stats
    this.currentIntakeEl.textContent = dayData.totalAmount;
    this.dailyGoalEl.textContent = this.settings.goal;
    
    const percentage = Math.min(100, Math.round((dayData.totalAmount / this.settings.goal) * 100));
    this.percentageEl.textContent = `${percentage}%`;
    
    // Update water level visualization
    this.waterLevel.style.height = `${percentage}%`;
    
    // Render entries
    this.renderEntries(dayData.entries);
    
    // Disable next day button if current date is today
    const today = new Date();
    const isToday = this.currentDate.toDateString() === today.toDateString();
    this.nextDayBtn.disabled = isToday;
    this.nextDayBtn.style.opacity = isToday ? '0.5' : '1';
    
    // Save data
    this.saveData();
  }

  renderEntries(entries) {
    // Clear entries container
    this.entriesContainer.innerHTML = '';
    
    if (entries.length === 0) {
      this.entriesContainer.appendChild(this.emptyLogMessage);
      return;
    }
    
    // Sort entries by time (newest first)
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Create entries
    entries.forEach((entry, index) => {
      const entryElement = document.createElement('div');
      entryElement.className = 'water-entry';
      
      const entryTime = document.createElement('div');
      entryTime.className = 'entry-time';
      
      // Format the time
      const time = new Date(entry.timestamp);
      entryTime.textContent = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const entryAmount = document.createElement('div');
      entryAmount.className = 'entry-amount';
      entryAmount.textContent = `${entry.amount} ml`;
      
      const entryActions = document.createElement('div');
      entryActions.className = 'entry-actions';
      
      const editButton = document.createElement('button');
      editButton.className = 'edit-entry';
      editButton.title = 'Edit entry';
      editButton.innerHTML = '<i class="fas fa-pen"></i>';
      editButton.addEventListener('click', () => this.editEntry(index));
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-entry';
      deleteButton.title = 'Delete entry';
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
      deleteButton.addEventListener('click', () => this.deleteEntry(index));
      
      entryActions.appendChild(editButton);
      entryActions.appendChild(deleteButton);
      
      entryElement.appendChild(entryTime);
      entryElement.appendChild(entryAmount);
      entryElement.appendChild(entryActions);
      
      this.entriesContainer.appendChild(entryElement);
    });
  }

  addWaterEntry(amount) {
    const currentDateKey = this.formatDate(this.currentDate);
    
    // Initialize day data if it doesn't exist
    if (!this.waterData[currentDateKey]) {
      this.waterData[currentDateKey] = {
        entries: [],
        totalAmount: 0
      };
    }
    
    // Add entry
    this.waterData[currentDateKey].entries.push({
      timestamp: new Date().toISOString(),
      amount: amount
    });
    
    // Update total
    this.waterData[currentDateKey].totalAmount += amount;
    
    // Reload the day
    this.loadCurrentDay();
    
    // Update insights
    this.updateInsights();
    
    // Show toast
    this.showToast(`Added ${amount} ml of water`, 'success');
    
    // Check if goal reached
    if (this.waterData[currentDateKey].totalAmount >= this.settings.goal) {
      this.showToast('Daily goal reached! 🎉', 'success');
    }
    
    // Check for achievements after updating
    this.checkAchievements();
  }

  editEntry(index) {
    const currentDateKey = this.formatDate(this.currentDate);
    const entry = this.waterData[currentDateKey].entries[index];
    
    // Prompt for new amount
    const newAmount = prompt('Enter new amount in ml:', entry.amount);
    
    if (newAmount !== null) {
      const amount = parseInt(newAmount);
      
      if (amount > 0) {
        // Update total
        this.waterData[currentDateKey].totalAmount -= entry.amount;
        this.waterData[currentDateKey].totalAmount += amount;
        
        // Update entry
        entry.amount = amount;
        entry.timestamp = new Date().toISOString(); // Update timestamp
        
        // Reload the day
        this.loadCurrentDay();
        
        // Update insights
        this.updateInsights();
        
        // Show toast
        this.showToast('Entry updated successfully', 'success');
      } else {
        this.showToast('Please enter a valid amount', 'error');
      }
    }
  }

  deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
      const currentDateKey = this.formatDate(this.currentDate);
      const entry = this.waterData[currentDateKey].entries[index];
      
      // Update total
      this.waterData[currentDateKey].totalAmount -= entry.amount;
      
      // Remove entry
      this.waterData[currentDateKey].entries.splice(index, 1);
      
      // Reload the day
      this.loadCurrentDay();
      
      // Update insights
      this.updateInsights();
      
      // Show toast
      this.showToast('Entry deleted successfully', 'info');
    }
  }

  changeDay(offset) {
    // Create a new date by adding the offset
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + offset);
    
    // Don't allow going to future dates
    const today = new Date();
    if (newDate > today) {
      return;
    }
    
    this.currentDate = newDate;
    this.loadCurrentDay();
  }

  openEditGoalModal() {
    // Set current goal
    this.goalAmountInput.value = this.settings.goal;
    
    // Highlight the matching preset button if it exists
    this.presetGoalBtns.forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.amount) === this.settings.goal) {
        btn.classList.add('active');
      }
    });
    
    // Show modal
    this.editGoalModal.classList.add('active');
  }

  saveGoal() {
    const amount = parseInt(this.goalAmountInput.value);
    
    if (amount > 0) {
      this.settings.goal = amount;
      this.dailyGoalEl.textContent = amount;
      
      // Update percentage and water level
      const currentDateKey = this.formatDate(this.currentDate);
      const currentAmount = this.waterData[currentDateKey]?.totalAmount || 0;
      const percentage = Math.min(100, Math.round((currentAmount / amount) * 100));
      this.percentageEl.textContent = `${percentage}%`;
      this.waterLevel.style.height = `${percentage}%`;
      
      // Save settings
      localStorage.setItem('waterSettings', JSON.stringify(this.settings));
      
      // Update insights
      this.updateInsights();
      
      // Close modal
      this.editGoalModal.classList.remove('active');
      
      // Show toast
      this.showToast('Daily goal updated successfully', 'success');
    } else {
      this.showToast('Please enter a valid goal amount', 'error');
    }
  }

  toggleReminders(enabled) {
    this.settings.reminders.enabled = enabled;
    localStorage.setItem('waterSettings', JSON.stringify(this.settings));
    
    if (enabled) {
      this.scheduleReminders();
      this.showToast('Water reminders enabled', 'success');
    } else {
      this.clearReminders();
      this.showToast('Water reminders disabled', 'info');
    }
  }

  openRemindersModal() {
    // Set current reminder settings
    this.reminderFrequency.value = this.settings.reminders.frequency;
    this.startTime.value = this.settings.reminders.startTime;
    this.endTime.value = this.settings.reminders.endTime;
    this.notificationSound.value = this.settings.reminders.sound;
    
    // Show modal
    this.remindersModal.classList.add('active');
  }

  saveReminderSettings() {
    this.settings.reminders.frequency = parseInt(this.reminderFrequency.value);
    this.settings.reminders.startTime = this.startTime.value;
    this.settings.reminders.endTime = this.endTime.value;
    this.settings.reminders.sound = this.notificationSound.value;
    
    // Save settings
    localStorage.setItem('waterSettings', JSON.stringify(this.settings));
    
    // Reschedule reminders if enabled
    if (this.settings.reminders.enabled) {
      this.clearReminders();
      this.scheduleReminders();
    }
    
    // Close modal
    this.remindersModal.classList.remove('active');
    
    // Show toast
    this.showToast('Reminder settings updated', 'success');
  }

  scheduleReminders() {
    // Clear existing reminders
    this.clearReminders();
    
    if (!this.settings.reminders.enabled) return;
    
    // Request notification permission if not already granted
    if (Notification && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.setupReminderSchedule();
        } else {
          this.showToast('Notification permission denied. Reminders will not work.', 'warning');
          this.remindersSwitch.checked = false;
          this.settings.reminders.enabled = false;
          this.saveData();
        }
      });
    } else if (Notification && Notification.permission === 'granted') {
      this.setupReminderSchedule();
    }
  }
  
  setupReminderSchedule() {
    // Parse start and end times
    const startTimeParts = this.settings.reminders.startTime.split(':');
    const endTimeParts = this.settings.reminders.endTime.split(':');
    
    const startHour = parseInt(startTimeParts[0]);
    const startMinute = parseInt(startTimeParts[1]);
    const endHour = parseInt(endTimeParts[0]);
    const endMinute = parseInt(endTimeParts[1]);
    
    // Calculate minutes between reminders
    const frequencyMinutes = parseInt(this.settings.reminders.frequency);
    
    // Store interval IDs for cleanup
    this.reminderIntervals = [];
    
    // Schedule first reminder
    const now = new Date();
    let nextReminder = new Date(now);
    nextReminder.setHours(startHour, startMinute, 0, 0);
    
    // If start time is in the past, set to the next frequency interval
    if (nextReminder <= now) {
      const minutesSinceStart = (now - nextReminder) / (1000 * 60);
      const intervalsToAdd = Math.ceil(minutesSinceStart / frequencyMinutes);
      nextReminder = new Date(nextReminder.getTime() + intervalsToAdd * frequencyMinutes * 60 * 1000);
      
      // If next reminder is beyond end time, schedule for tomorrow
      const endTime = new Date(now);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      if (nextReminder > endTime) {
        nextReminder = new Date(now);
        nextReminder.setDate(nextReminder.getDate() + 1);
        nextReminder.setHours(startHour, startMinute, 0, 0);
      }
    }
    
    // Calculate milliseconds until next reminder
    const msUntilReminder = nextReminder - now;
    
    // Schedule first reminder
    const firstTimer = setTimeout(() => {
      this.showWaterReminder();
      
      // Setup recurring reminders
      const reminderInterval = setInterval(() => {
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        
        // Check if we're within the reminder window
        const currentTimeValue = currentHour * 60 + currentMinute;
        const startTimeValue = startHour * 60 + startMinute;
        const endTimeValue = endHour * 60 + endMinute;
        
        if (currentTimeValue >= startTimeValue && currentTimeValue <= endTimeValue) {
          this.showWaterReminder();
        }
      }, frequencyMinutes * 60 * 1000);
      
      this.reminderIntervals.push(reminderInterval);
    }, msUntilReminder);
    
    this.reminderIntervals.push(firstTimer);
    
    // Show confirmation
    const timeUntilNext = this.formatTimeUntil(msUntilReminder);
    this.showToast(`Water reminders set. Next reminder in ${timeUntilNext}.`, 'success');
  }
  
  formatTimeUntil(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      }
    }
  }

  clearReminders() {
    // Clear all scheduled reminders
    if (this.reminderIntervals) {
      this.reminderIntervals.forEach(interval => {
        clearTimeout(interval);
        clearInterval(interval);
      });
      this.reminderIntervals = [];
    }
  }
  
  showWaterReminder() {
    // Calculate how much more water needed today
    const currentDateKey = this.formatDate(new Date());
    const dayData = this.waterData[currentDateKey] || { totalAmount: 0 };
    const remaining = Math.max(0, this.settings.goal - dayData.totalAmount);
    
    // Create and show notification
    this.showNotification(
      'Hydration Reminder',
      `Time to drink some water! You have ${remaining}ml to go for today's goal.`
    );
  }

  showNotification(title, body) {
    // Check if notifications are supported and permission granted
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    if (Notification.permission === 'granted') {
      // Create notification
      const notification = new Notification(title, {
        body: body,
        icon: 'images/water-icon.png',
        badge: 'images/water-badge.png',
        vibrate: [100, 50, 100]
      });
      
      // Play sound if specified
      if (this.settings.reminders.sound !== 'none') {
        this.playNotificationSound(this.settings.reminders.sound);
      }
      
      // Close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showNotification(title, body);
        }
      });
    }
  }
  
  playNotificationSound(sound) {
    // Map of sound names to files
    const sounds = {
      droplet: 'sounds/droplet.mp3',
      ding: 'sounds/ding.mp3',
      chime: 'sounds/chime.mp3'
    };
    
    const soundFile = sounds[sound] || sounds.droplet;
    
    try {
      const audio = new Audio(soundFile);
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  updateInsights() {
    // Calculate weekly average
    const weeklyData = this.getWeeklyData();
    
    // Weekly average
    const currentWeekAvg = weeklyData.currentWeek.totalAmount / 7;
    this.weeklyAverage.textContent = `${Math.round(currentWeekAvg)} ml`;
    
    // Weekly trend
    const lastWeekAvg = weeklyData.lastWeek.totalAmount / 7;
    let trendPercentage = 0;
    
    if (lastWeekAvg > 0) {
      trendPercentage = Math.round(((currentWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
    }
    
    const trendIcon = document.querySelector('.trend-icon i');
    if (trendPercentage > 0) {
      this.weeklyTrend.textContent = `+${trendPercentage}%`;
      this.weeklyTrend.style.color = 'var(--success-color)';
      trendIcon.className = 'fas fa-arrow-up';
      trendIcon.style.color = 'var(--success-color)';
    } else if (trendPercentage < 0) {
      this.weeklyTrend.textContent = `${trendPercentage}%`;
      this.weeklyTrend.style.color = 'var(--danger-color)';
      trendIcon.className = 'fas fa-arrow-down';
      trendIcon.style.color = 'var(--danger-color)';
    } else {
      this.weeklyTrend.textContent = `0%`;
      this.weeklyTrend.style.color = 'var(--text-secondary)';
      trendIcon.className = 'fas fa-minus';
      trendIcon.style.color = 'var(--text-secondary)';
    }
    
    // Current streak
    const streak = this.calculateStreak();
    this.currentStreak.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
    
    // Streak message
    if (streak === 0) {
      this.streakMessage.textContent = 'Start tracking today!';
    } else if (streak < 3) {
      this.streakMessage.textContent = 'Keep going to build your streak!';
    } else if (streak < 7) {
      this.streakMessage.textContent = 'Great job staying consistent!';
    } else {
      this.streakMessage.textContent = 'Impressive streak! Keep it up!';
    }
    
    // Goal completion for the week
    const daysReachedGoal = weeklyData.currentWeek.daysReachedGoal;
    this.goalCompletion.textContent = `${daysReachedGoal}/7 days`;
    
    // Update progress bar
    const completionPercentage = Math.round((daysReachedGoal / 7) * 100);
    this.completionBar.style.width = `${completionPercentage}%`;
  }

  getWeeklyData() {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Sunday of current week
    
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7); // Sunday of last week
    
    const currentWeekData = {
      totalAmount: 0,
      daysReachedGoal: 0
    };
    
    const lastWeekData = {
      totalAmount: 0,
      daysReachedGoal: 0
    };
    
    // Calculate current week stats
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      
      // Don't count future days
      if (day > today) continue;
      
      const dateKey = this.formatDate(day);
      const dayData = this.waterData[dateKey];
      
      if (dayData) {
        currentWeekData.totalAmount += dayData.totalAmount;
        if (dayData.totalAmount >= this.settings.goal) {
          currentWeekData.daysReachedGoal++;
        }
      }
    }
    
    // Calculate last week stats
    for (let i = 0; i < 7; i++) {
      const day = new Date(lastWeekStart);
      day.setDate(lastWeekStart.getDate() + i);
      
      const dateKey = this.formatDate(day);
      const dayData = this.waterData[dateKey];
      
      if (dayData) {
        lastWeekData.totalAmount += dayData.totalAmount;
        if (dayData.totalAmount >= this.settings.goal) {
          lastWeekData.daysReachedGoal++;
        }
      }
    }
    
    return {
      currentWeek: currentWeekData,
      lastWeek: lastWeekData
    };
  }

  calculateStreak() {
    let streak = 0;
    const today = new Date();
    
    // Check today first
    const todayKey = this.formatDate(today);
    const todayData = this.waterData[todayKey];
    
    // If today has no data or didn't reach goal, streak is 0
    if (!todayData || todayData.totalAmount < this.settings.goal) {
      // Check yesterday to see if we had a streak going
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayKey = this.formatDate(yesterday);
      
      if (this.waterData[yesterdayKey] && this.waterData[yesterdayKey].totalAmount >= this.settings.goal) {
        // We had a streak but broke it today
        return 0;
      }
    }
    
    // Count backwards from yesterday
    let currentDate = new Date(today);
    currentDate.setDate(today.getDate() - 1); // Start with yesterday
    
    let streakBroken = false;
    
    while (!streakBroken) {
      const dateKey = this.formatDate(currentDate);
      const dayData = this.waterData[dateKey];
      
      if (dayData && dayData.totalAmount >= this.settings.goal) {
        streak++;
      } else {
        streakBroken = true;
      }
      
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // If today reached goal, add it to the streak
    if (todayData && todayData.totalAmount >= this.settings.goal) {
      streak++;
    }
    
    return streak;
  }

  showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  saveData() {
    localStorage.setItem('waterData', JSON.stringify(this.waterData));
  }

  checkAchievements() {
    const currentDay = this.waterData[this.formatDate(new Date())];
    const totalIntake = currentDay ? currentDay.entries.reduce((sum, entry) => sum + entry.amount, 0) : 0;
    
    // Check first entry achievement
    if (!this.achievements.firstEntry.unlocked && currentDay && currentDay.entries.length > 0) {
      this.unlockAchievement('firstEntry');
    }
    
    // Check daily goal achievement
    if (!this.achievements.dailyGoal.unlocked && totalIntake >= this.settings.goal) {
      this.unlockAchievement('dailyGoal');
    }
    
    // Check perfect week achievement
    const weeklyData = this.getWeeklyData();
    const perfectDays = weeklyData.filter(day => day.percentage >= 100).length;
    if (!this.achievements.perfectWeek.unlocked && perfectDays >= 7) {
      this.unlockAchievement('perfectWeek');
    }
    
    // Check streak achievement
    const streak = this.calculateStreak();
    if (!this.achievements.threeWeekStreak.unlocked && streak >= 21) {
      this.unlockAchievement('threeWeekStreak');
    }
  }
  
  unlockAchievement(achievementId) {
    if (!this.achievements[achievementId]) return;
    
    // Mark as unlocked
    this.achievements[achievementId].unlocked = true;
    
    // Save achievements to localStorage
    this.saveAchievements();
    
    // Show achievement notification
    this.showAchievementNotification(achievementId);
  }
  
  saveAchievements() {
    localStorage.setItem('waterTrackerAchievements', JSON.stringify(this.achievements));
  }
  
  loadAchievements() {
    const savedAchievements = localStorage.getItem('waterTrackerAchievements');
    if (savedAchievements) {
      this.achievements = JSON.parse(savedAchievements);
    }
  }
  
  showAchievementNotification(achievementId) {
    const achievement = this.achievements[achievementId];
    
    // Create modal for the achievement
    const modal = document.createElement('div');
    modal.className = 'achievement-modal';
    
    const stats = {
      streak: this.calculateStreak(),
      calories: 0, // Placeholder - water tracker doesn't track calories
      protein: 0 // Placeholder - water tracker doesn't track protein
    };
    
    // Achievement card HTML
    modal.innerHTML = `
      <div class="achievement-notification">
        <div class="achievement-icon">
          <i class="fas fa-${achievement.icon}"></i>
        </div>
        <div class="achievement-content">
          <h3>${achievement.title}</h3>
          <p>${achievement.description}</p>
          <div class="achievement-actions">
            <button class="btn-primary share-achievement">Share</button>
            <button class="btn-secondary close-achievement">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-achievement').addEventListener('click', () => {
      modal.classList.add('closing');
      setTimeout(() => modal.remove(), 300);
    });
    
    modal.querySelector('.share-achievement').addEventListener('click', () => {
      this.shareAchievement(achievement, stats);
      modal.classList.add('closing');
      setTimeout(() => modal.remove(), 300);
    });
    
    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Auto-close after 7 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 300);
      }
    }, 7000);
  }
  
  shareAchievement(achievement, stats) {
    // Create an iframe to load the achievement share component
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'components/achievement-share.html';
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      try {
        // Get the iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Check if the updateAchievement function exists
        if (iframeDoc.defaultView.updateAchievement) {
          // Update the achievement in the iframe
          iframeDoc.defaultView.updateAchievement({
            title: achievement.title,
            description: achievement.description,
            stats: stats,
            image: 'images/achievement.png'
          });
          
          // Extract the HTML content
          const content = iframeDoc.querySelector('.achievement-share-container').outerHTML;
          
          // Show a modal with the achievement share content
          this.showAchievementShareModal(content);
        }
      } catch (e) {
        console.error('Error loading achievement share component:', e);
        this.showToast('Could not load sharing component', 'error');
      } finally {
        // Clean up
        document.body.removeChild(iframe);
      }
    };
  }
  
  showAchievementShareModal(content) {
    // Create modal for sharing
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    modal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content achievement-share-modal">
          <div class="modal-header">
            <h3>Share Achievement</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    });
    
    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);
  }

  init() {
    // Load achievements
    this.loadAchievements();
  }
}

// Initialize water tracker when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const waterTracker = new WaterTracker();
});

// Add achievement styles to the document
const achievementStyles = document.createElement('style');
achievementStyles.textContent = `
  .achievement-modal {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    transform: translateX(110%);
    transition: transform 0.3s ease-out;
  }
  
  .achievement-modal.show {
    transform: translateX(0);
  }
  
  .achievement-modal.closing {
    transform: translateX(110%);
  }
  
  .achievement-notification {
    display: flex;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    padding: 15px;
    width: 300px;
    animation: glow 2s infinite alternate;
  }
  
  @keyframes glow {
    from {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }
    to {
      box-shadow: 0 4px 20px rgba(255, 183, 77, 0.5);
    }
  }
  
  .achievement-notification .achievement-icon {
    width: 50px;
    height: 50px;
    background-color: #ffb74d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
  }
  
  .achievement-notification .achievement-icon i {
    color: white;
    font-size: 24px;
  }
  
  .achievement-notification .achievement-content {
    flex: 1;
  }
  
  .achievement-notification h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
  }
  
  .achievement-notification p {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #666;
  }
  
  .achievement-actions {
    display: flex;
    gap: 10px;
  }
  
  .achievement-actions button {
    padding: 5px 10px;
    font-size: 12px;
  }
  
  .achievement-share-modal .modal-content {
    max-width: 550px;
  }
`;

document.head.appendChild(achievementStyles); 