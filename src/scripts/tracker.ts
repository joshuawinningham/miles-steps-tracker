import { format, parse, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, 
         startOfMonth, endOfMonth } from 'date-fns';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

interface Activity {
  id: string;
  date: string;
  miles: number;
  steps: number;
  calories: number;
  weight?: number;
}

interface DailyTotal {
  date: string;
  miles: number;
  steps: number;
  calories: number;
  weight: number | undefined;
}

type ViewMode = 'weekly' | 'monthly' | 'yearly';

// State management
const STORAGE_KEY = 'miles-steps-tracker-activities';
const SETTINGS_KEY = 'miles-steps-tracker-settings';

// Restore previous data if no data exists
const previousData = [
  {"id":"1742593142056","date":"2025-03-21","miles":6.13,"steps":12260,"weight":180},
  {"id":"1742593150479","date":"2025-03-20","miles":2.45,"steps":4900,"weight":181},
  {"id":"1742594217082","date":"2025-03-17","miles":7.33,"steps":14660,"weight":182},
  {"id":"1742594230605","date":"2025-03-18","miles":6.17,"steps":12340,"weight":181},
  {"id":"1742594248491","date":"2025-03-19","miles":7.47,"steps":14940,"weight":180},
  {"id":"1742594532952","date":"2025-03-14","miles":5.95,"steps":11900,"weight":183},
  {"id":"1742595024869","date":"2025-03-13","miles":9,"steps":18000,"weight":184},
  {"id":"1742595892883","date":"2025-03-12","miles":8.91,"steps":17820,"weight":185},
  {"id":"1742595907290","date":"2025-03-11","miles":9.07,"steps":18140,"weight":186},
  {"id":"1742595919373","date":"2025-03-10","miles":5.46,"steps":10920,"weight":187},
  {"id":"1742595945701","date":"2025-03-08","miles":0.94,"steps":1880,"weight":188},
  {"id":"1742595959664","date":"2025-03-07","miles":7.99,"steps":15980,"weight":189},
  {"id":"1742595969462","date":"2025-03-06","miles":7.93,"steps":15860,"weight":190},
  {"id":"1742595986749","date":"2025-03-05","miles":6.95,"steps":13900,"weight":191},
  {"id":"1742595998967","date":"2025-03-04","miles":6.84,"steps":13680,"weight":192},
  {"id":"1742596011815","date":"2025-03-03","miles":7.36,"steps":14720,"weight":193}
];

// Initialize state
let STEPS_PER_MILE = 2000;
let currentEditingActivity: Activity | null = null;
let activityChart: Chart | null = null;
let currentViewMode: ViewMode = 'weekly';
let showAverageLine = true;

// Check if we need to restore previous data
const storedData = localStorage.getItem(STORAGE_KEY);
if (!storedData) {
  // Add calories field with 0 value to previous data
  const dataWithCalories = previousData.map(activity => ({
    ...activity,
    calories: 0
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithCalories));
}

// Load activities from localStorage
function loadActivities(): Activity[] {
  try {
    const storedActivities = localStorage.getItem(STORAGE_KEY);
    if (!storedActivities) {
      return [];
    }
    const parsedActivities = JSON.parse(storedActivities);
    return Array.isArray(parsedActivities) ? parsedActivities : [];
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
}

// Initialize activities
let activities = loadActivities();

// Save activities to localStorage
function saveActivities(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch (error) {
    console.error('Error saving activities:', error);
  }
}

// Load settings from localStorage
// function loadSettings(): { stepsPerMile: number } {
//   const stored = localStorage.getItem(SETTINGS_KEY);
//   if (!stored) return { stepsPerMile: 2000 };
//   try {
//     return JSON.parse(stored);
//   } catch (e) {
//     console.error('Error loading settings:', e);
//     return { stepsPerMile: 2000 };
//   }
// }

// Save settings to localStorage
function saveSettings(stepsPerMile: number): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ stepsPerMile }));
}

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Helper function to format display date
// function formatDisplayDate(dateStr: string): string {
//   const date = parse(dateStr, 'yyyy-MM-dd', new Date());
//   return format(date, 'EEEE, MMMM d, yyyy');
// }

// DOM Elements
const addButton = document.getElementById('addButton');
const addModal = document.getElementById('addModal');
const dateInput = document.getElementById('dateInput') as HTMLInputElement;
const milesInput = document.getElementById('milesInput') as HTMLInputElement;
const caloriesInput = document.getElementById('caloriesInput') as HTMLInputElement;
const weightInput = document.getElementById('weightInput') as HTMLInputElement;
const calculatedSteps = document.getElementById('calculatedSteps');
const stepsCount = document.getElementById('stepsCount');
const cancelButton = document.getElementById('cancelButton');
const saveButton = document.getElementById('saveButton');
const emptyState = document.getElementById('emptyState');
const activityList = document.getElementById('activityList');
const editModal = document.getElementById('editModal');
const editDateInput = document.getElementById('editDateInput') as HTMLInputElement;
const editMilesInput = document.getElementById('editMilesInput') as HTMLInputElement;
const editCaloriesInput = document.getElementById('editCaloriesInput') as HTMLInputElement;
const editWeightInput = document.getElementById('editWeightInput') as HTMLInputElement;
const editCalculatedSteps = document.getElementById('editCalculatedSteps');
const editStepsCount = document.getElementById('editStepsCount');
const cancelEditButton = document.getElementById('cancelEditButton');
const saveEditButton = document.getElementById('saveEditButton');
const activitySummary = document.getElementById('activitySummary');
const totalMiles = document.getElementById('totalMiles');
const totalSteps = document.getElementById('totalSteps');
const totalCalories = document.getElementById('totalCalories');
const latestWeight = document.getElementById('latestWeight');
const dateRange = document.getElementById('dateRange');
const activityChartCanvas = document.getElementById('activityChart') as HTMLCanvasElement;
const weeklyButton = document.getElementById('weeklyButton');
const monthlyButton = document.getElementById('monthlyButton');
const yearlyButton = document.getElementById('yearlyButton');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const stepsPerMileInput = document.getElementById('stepsPerMileInput') as HTMLInputElement;
const cancelSettingsButton = document.getElementById('cancelSettingsButton');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const summaryTitle = document.getElementById('summaryTitle');

// Initialize date input with today's date
if (dateInput) {
  dateInput.value = getTodayDate();
}

// Initialize settings input with current value
if (stepsPerMileInput) {
  stepsPerMileInput.value = STEPS_PER_MILE.toString();
}

// Event Listeners
addButton?.addEventListener('click', () => {
  if (addModal) {
    addModal.style.display = 'flex';
  }
  // Always set to today's date when opening modal
  if (dateInput) {
    dateInput.value = getTodayDate();
  }
});

cancelButton?.addEventListener('click', () => {
  if (addModal) {
    addModal.style.display = 'none';
  }
  if (milesInput) {
    milesInput.value = '';
  }
  if (calculatedSteps) {
    calculatedSteps.style.display = 'none';
  }
});

milesInput?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const miles = parseFloat(target.value);
  
  if (miles) {
    updateAddModalSteps();
  } else if (calculatedSteps) {
    calculatedSteps.style.display = 'none';
  }
});

saveButton?.addEventListener('click', () => {
  if (!milesInput?.value) return;

  const miles = parseFloat(milesInput.value);
  const steps = Math.round(miles * STEPS_PER_MILE);
  const calories = parseFloat(caloriesInput?.value || '0');
  const weight = parseFloat(weightInput?.value || '0');
  const date = dateInput?.value ?? getTodayDate();

  const existingActivityIndex = activities.findIndex((a) => a.date === date);

  if (existingActivityIndex !== -1) {
    const existingActivity = activities[existingActivityIndex];
    activities[existingActivityIndex] = {
      ...existingActivity,
      miles: Number((existingActivity.miles + miles).toFixed(2)),
      steps: existingActivity.steps + steps,
      calories: existingActivity.calories + calories,
      weight: weight || existingActivity.weight,
    };
  } else {
    activities.push({
      id: Date.now().toString(),
      date,
      miles: Number(miles.toFixed(2)),
      steps,
      calories,
      weight: weight || undefined,
    });
  }

  saveActivities();
  updateUI();
  if (addModal) {
    addModal.style.display = 'none';
  }
  if (milesInput) {
    milesInput.value = '';
  }
  if (caloriesInput) {
    caloriesInput.value = '';
  }
  if (weightInput) {
    weightInput.value = '';
  }
  if (calculatedSteps) {
    calculatedSteps.style.display = 'none';
  }
});

// Edit modal functions
function openEditModal(activity: Activity): void {
  currentEditingActivity = activity;
  if (editDateInput && editMilesInput && editCaloriesInput && editWeightInput) {
    editDateInput.value = activity.date;
    editMilesInput.value = activity.miles.toString();
    editCaloriesInput.value = activity.calories.toString();
    editWeightInput.value = activity.weight?.toString() || '';
    updateEditSteps(activity.miles);
  }
  if (editModal) {
    editModal.style.display = 'flex';
  }
}

function closeEditModal(): void {
  if (editModal) {
    editModal.style.display = 'none';
  }
  currentEditingActivity = null;
  if (editMilesInput) {
    editMilesInput.value = '';
  }
  if (editCalculatedSteps) {
    editCalculatedSteps.style.display = 'none';
  }
}

function updateEditSteps(miles: number): void {
  if (editStepsCount && editCalculatedSteps) {
    const steps = Math.round(miles * STEPS_PER_MILE);
    editStepsCount.textContent = steps.toLocaleString();
    editCalculatedSteps.style.display = 'block';
  }
}

// Edit modal event listeners
editMilesInput?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const miles = parseFloat(target.value);
  
  if (miles) {
    updateEditModalSteps();
  } else if (editCalculatedSteps) {
    editCalculatedSteps.style.display = 'none';
  }
});

cancelEditButton?.addEventListener('click', closeEditModal);

saveEditButton?.addEventListener('click', () => {
  if (!currentEditingActivity || !editMilesInput?.value) return;

  const miles = parseFloat(editMilesInput.value);
  const steps = Math.round(miles * STEPS_PER_MILE);
  const calories = parseFloat(editCaloriesInput?.value || '0');
  const weight = parseFloat(editWeightInput?.value || '0');

  const activityIndex = activities.findIndex((a) => a.id === currentEditingActivity?.id);
  if (activityIndex !== -1) {
    activities[activityIndex] = {
      ...activities[activityIndex],
      miles: Number(miles.toFixed(2)),
      steps,
      calories,
      weight: weight || undefined,
    };
  }

  saveActivities();
  updateUI();
  if (editModal) {
    editModal.style.display = 'none';
  }
  currentEditingActivity = null;
});

// Helper function to get daily totals for the current period
function getDailyTotals(viewMode: ViewMode): DailyTotal[] {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  
  if (viewMode === 'weekly') {
    startDate = startOfWeek(today, { weekStartsOn: 1 });
    endDate = endOfWeek(today, { weekStartsOn: 1 });
  } else if (viewMode === 'monthly') {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  } else {
    // For yearly view, get the start and end of the current year
    startDate = new Date(today.getFullYear(), 0, 1); // January 1st
    endDate = new Date(today.getFullYear(), 11, 31); // December 31st
  }
  
  // Get all days in the period
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Initialize daily totals for each day
  const dailyTotals = daysInPeriod.map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    miles: 0,
    steps: 0,
    calories: 0,
    weight: undefined as number | undefined
  }));
  
  // Sum up activities for each day
  activities.forEach(activity => {
    const activityDate = parse(activity.date, 'yyyy-MM-dd', new Date());
    if (isWithinInterval(activityDate, { start: startDate, end: endDate })) {
      const dayIndex = dailyTotals.findIndex(day => day.date === activity.date);
      if (dayIndex !== -1) {
        dailyTotals[dayIndex].miles += activity.miles;
        dailyTotals[dayIndex].steps += activity.steps;
        dailyTotals[dayIndex].calories += activity.calories;
        if (activity.weight !== undefined) {
          dailyTotals[dayIndex].weight = activity.weight;
        }
      }
    }
  });
  
  return dailyTotals;
}

// Calculate summary for the current period
function calculateSummary(viewMode: ViewMode): { totalMiles: number; totalSteps: number; totalCalories: number; latestWeight: number | undefined; startDate: Date; endDate: Date } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  
  if (viewMode === 'weekly') {
    startDate = startOfWeek(today, { weekStartsOn: 1 });
    endDate = endOfWeek(today, { weekStartsOn: 1 });
  } else {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  }

  const periodActivities = activities.filter(activity => {
    const activityDate = parse(activity.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(activityDate, { start: startDate, end: endDate });
  });

  // Find the most recent weight entry from all activities
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
    const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
    return dateB.getTime() - dateA.getTime(); // Sort in descending order (most recent first)
  });
  
  const latestWeight = sortedActivities.find(activity => activity.weight !== undefined)?.weight;

  const summary = periodActivities.reduce(
    (acc, activity) => ({
      totalMiles: acc.totalMiles + activity.miles,
      totalSteps: acc.totalSteps + activity.steps,
      totalCalories: acc.totalCalories + activity.calories,
      latestWeight,
      startDate,
      endDate
    }),
    { totalMiles: 0, totalSteps: 0, totalCalories: 0, latestWeight, startDate, endDate }
  );

  return {
    ...summary,
    totalMiles: Number(summary.totalMiles.toFixed(2)),
    totalCalories: Number(summary.totalCalories.toFixed(0))
  };
}

// Calculate averages for the period
function calculateAverages(): { weeklyAvg: number; monthlyAvg: number; yearlyAvg: number } {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);

  const weeklyActivities = activities.filter(activity => {
    const activityDate = parse(activity.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
  });

  const monthlyActivities = activities.filter(activity => {
    const activityDate = parse(activity.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(activityDate, { start: monthStart, end: monthEnd });
  });

  const yearlyActivities = activities.filter(activity => {
    const activityDate = parse(activity.date, 'yyyy-MM-dd', new Date());
    return isWithinInterval(activityDate, { start: yearStart, end: yearEnd });
  });

  const weeklyTotal = weeklyActivities.reduce((sum, activity) => sum + activity.miles, 0);
  const monthlyTotal = monthlyActivities.reduce((sum, activity) => sum + activity.miles, 0);
  const yearlyTotal = yearlyActivities.reduce((sum, activity) => sum + activity.miles, 0);

  // Calculate averages only for days with activities
  const weeklyDays = new Set(weeklyActivities.map(a => a.date)).size || 1;
  const monthlyDays = new Set(monthlyActivities.map(a => a.date)).size || 1;
  const yearlyDays = new Set(yearlyActivities.map(a => a.date)).size || 1;

  return {
    weeklyAvg: Number((weeklyTotal / weeklyDays).toFixed(2)),
    monthlyAvg: Number((monthlyTotal / monthlyDays).toFixed(2)),
    yearlyAvg: Number((yearlyTotal / yearlyDays).toFixed(2))
  };
}

// Initialize or update the activity chart
function updateActivityChart(): void {
  const dailyTotals = getDailyTotals(currentViewMode);
  const { weeklyAvg, monthlyAvg, yearlyAvg } = calculateAverages();
  
  let labels: string[];
  let milesData: number[];
  let weightData: (number | null)[];
  let averageValue: number;
  
  if (currentViewMode === 'yearly') {
    const monthlyData = Array(12).fill(0);
    const monthlyWeightData = Array(12).fill(null);
    dailyTotals.forEach(day => {
      const month = parse(day.date, 'yyyy-MM-dd', new Date()).getMonth();
      monthlyData[month] += day.miles;
      if (day.weight !== undefined) {
        monthlyWeightData[month] = day.weight;
      }
    });
    
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    milesData = monthlyData;
    weightData = monthlyWeightData;
    averageValue = yearlyAvg;
  } else {
    labels = dailyTotals.map(day => {
      const date = parse(day.date, 'yyyy-MM-dd', new Date());
      return currentViewMode === 'weekly' 
        ? format(date, 'EEE')
        : format(date, 'd');
    });
    milesData = dailyTotals.map(day => day.miles);
    weightData = dailyTotals.map(day => day.weight ?? null);
    averageValue = currentViewMode === 'weekly' ? weeklyAvg : monthlyAvg;
  }

  const chartConfig: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Miles',
          data: milesData,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          order: 1,
          yAxisID: 'y'
        },
        {
          label: 'Weight (lbs)',
          data: weightData,
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          order: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: {
              size: 11
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Miles'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Weight (lbs)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: currentViewMode === 'weekly' ? 'Daily Miles & Weight This Week' : currentViewMode === 'monthly' ? 'Daily Miles & Weight This Month' : 'Monthly Miles & Weight This Year'
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'line'
          }
        },
        tooltip: {
          mode: 'nearest',
          intersect: true,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const datasetLabel = context.dataset.label;
              if (datasetLabel === 'Weight (lbs)') {
                return `Weight: ${Math.round(value)} lbs`;
              }
              return `Miles: ${value.toFixed(2)}`;
            }
          }
        },
        annotation: showAverageLine ? {
          annotations: {
            line1: {
              type: 'line',
              yMin: averageValue,
              yMax: averageValue,
              xMin: -0.5,
              xMax: labels.length - 0.5,
              borderColor: 'rgba(234, 88, 12, 0.6)',
              borderWidth: 2,
              borderDash: [4, 4],
              label: {
                display: true,
                content: `Avg: ${averageValue.toFixed(2)} miles`,
                position: 'start',
                backgroundColor: 'rgba(234, 88, 12, 0.6)',
                color: 'white',
                padding: 4
              }
            }
          }
        } : undefined
      }
    }
  };

  if (activityChart) {
    activityChart.data = chartConfig.data;
    if (chartConfig.options) {
      activityChart.options = chartConfig.options;
    }
    activityChart.update();
  } else if (activityChartCanvas) {
    activityChart = new Chart(activityChartCanvas, chartConfig);
  }
}

// Update the summary display
function updateSummaryDisplay(): void {
  const summary = calculateSummary(currentViewMode);
  const today = new Date();
  const currentMonth = format(today, 'MMMM yyyy');
  
  if (totalMiles) {
    totalMiles.textContent = summary.totalMiles.toString();
  }
  
  if (totalSteps) {
    totalSteps.textContent = summary.totalSteps.toLocaleString();
  }

  if (totalCalories) {
    totalCalories.textContent = summary.totalCalories.toLocaleString();
  }

  if (latestWeight) {
    latestWeight.textContent = summary.latestWeight ? `${Math.round(summary.latestWeight)}` : '-';
  }
  
  if (dateRange) {
    if (currentViewMode === 'weekly') {
      const startStr = format(summary.startDate, 'M/d/yy');
      const endStr = format(summary.endDate, 'M/d/yy');
      dateRange.textContent = `${currentMonth} • Week of ${startStr} - ${endStr}`;
    } else if (currentViewMode === 'monthly') {
      dateRange.textContent = currentMonth;
    } else {
      dateRange.textContent = format(today, 'yyyy');
    }
  }

  if (activitySummary) {
    if (summary.totalMiles > 0 || summary.totalSteps > 0) {
      activitySummary.style.display = 'block';
    } else {
      activitySummary.style.display = 'none';
    }
  }
}

// Toggle view mode
function setViewMode(mode: ViewMode): void {
  currentViewMode = mode;
  
  // Update button styles
  if (weeklyButton && monthlyButton && yearlyButton) {
    // Reset all buttons
    weeklyButton.classList.remove('bg-blue-500', 'text-white');
    weeklyButton.classList.add('bg-gray-200');
    monthlyButton.classList.remove('bg-blue-500', 'text-white');
    monthlyButton.classList.add('bg-gray-200');
    yearlyButton.classList.remove('bg-blue-500', 'text-white');
    yearlyButton.classList.add('bg-gray-200');
    
    // Set active button
    switch (mode) {
      case 'weekly':
        weeklyButton.classList.remove('bg-gray-200');
        weeklyButton.classList.add('bg-blue-500', 'text-white');
        if (summaryTitle) summaryTitle.textContent = 'Weekly Summary';
        break;
      case 'monthly':
        monthlyButton.classList.remove('bg-gray-200');
        monthlyButton.classList.add('bg-blue-500', 'text-white');
        if (summaryTitle) summaryTitle.textContent = 'Monthly Summary';
        break;
      case 'yearly':
        yearlyButton.classList.remove('bg-gray-200');
        yearlyButton.classList.add('bg-blue-500', 'text-white');
        if (summaryTitle) summaryTitle.textContent = 'Yearly Summary';
        break;
    }
  }
  
  updateSummaryDisplay();
  updateActivityChart();
}

// Event listeners for view toggle
weeklyButton?.addEventListener('click', () => setViewMode('weekly'));
monthlyButton?.addEventListener('click', () => setViewMode('monthly'));
yearlyButton?.addEventListener('click', () => setViewMode('yearly'));

// Add event listener for average line toggle
const showAverageButton = document.getElementById('showAverageButton');
showAverageButton?.addEventListener('click', () => {
  showAverageLine = !showAverageLine;
  if (showAverageButton) {
    showAverageButton.classList.toggle('bg-blue-500');
    showAverageButton.classList.toggle('bg-gray-200');
    showAverageButton.classList.toggle('text-white');
    showAverageButton.textContent = showAverageLine ? 'Hide Average' : 'Show Average';
  }
  updateActivityChart();
});

// Set initial state of average button since line is shown by default
if (showAverageButton) {
  showAverageButton.classList.remove('bg-blue-500', 'text-white');
  showAverageButton.classList.add('bg-gray-200');
  showAverageButton.textContent = 'Hide Average';
}

// Update UI Functions
function updateUI(): void {
  // Load activities from localStorage to ensure we have the latest data
  activities = loadActivities();
  
  // Update visibility of UI elements
  const hasActivities = activities.length > 0;
  
  if (emptyState) {
    emptyState.style.display = hasActivities ? 'none' : 'block';
  }
  
  if (activityList) {
    activityList.style.display = hasActivities ? 'block' : 'none';
  }
  
  if (activitySummary) {
    activitySummary.style.display = hasActivities ? 'block' : 'none';
  }
  
  // Only update other UI elements if we have activities
  if (hasActivities) {
    renderActivities();
    updateSummaryDisplay();
    updateActivityChart();
  }
}

function renderActivities(): void {
  const activityListElement = document.getElementById('activityList');
  const template = document.getElementById('activityItemTemplate') as HTMLTemplateElement;
  
  if (!activityListElement || !template) {
    console.error('Activity list or template not found');
    return;
  }
  
  // Remove all existing activities but keep the template
  const existingActivities = activityListElement.querySelectorAll('div[class*="border"]');
  existingActivities.forEach(activity => activity.remove());
  
  // Sort activities by date in descending order
  const sortedActivities = [...activities].sort((a, b) => 
    parse(b.date, 'yyyy-MM-dd', new Date()).getTime() - 
    parse(a.date, 'yyyy-MM-dd', new Date()).getTime()
  );
  
  sortedActivities.forEach(activity => {
    const clone = template.content.cloneNode(true) as DocumentFragment;
    const item = clone.querySelector('div[class*="border"]');
    
    if (!item) {
      console.error('Activity item template structure not found');
      return;
    }
    
    const date = parse(activity.date, 'yyyy-MM-dd', new Date());
    const dateStr = format(date, 'EEE, MMM d');
    
    // Find the date and stats containers
    const dateDiv = item.querySelector('.text-gray-600.text-sm.font-medium');
    const statsContainer = item.querySelector('.flex.items-center.gap-4.flex-grow');
    
    if (!dateDiv || !statsContainer) {
      console.error('Date or stats container not found');
      return;
    }
    
    // Set the date
    dateDiv.textContent = dateStr;
    
    // Get all stat value divs (the second div in each stat container)
    const statDivs = statsContainer.querySelectorAll('.text-center > .text-gray-800');
    if (statDivs.length !== 4) {
      console.error('Incorrect number of stat divs:', statDivs.length);
      return;
    }
    
    // Set the stats values
    statDivs[0].textContent = activity.miles.toFixed(2);
    statDivs[1].textContent = activity.steps.toLocaleString();
    statDivs[2].textContent = Math.round(activity.calories).toString();
    statDivs[3].textContent = activity.weight ? Math.round(activity.weight).toString() : '-';
    
    // Add edit button event listener
    const editButton = item.querySelector('button');
    if (editButton) {
      editButton.addEventListener('click', () => {
        currentEditingActivity = activity;
        openEditModal(activity);
      });
    }
    
    activityListElement.appendChild(clone);
  });
  
  // Update visibility of empty state and activity list
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    emptyState.style.display = sortedActivities.length === 0 ? 'block' : 'none';
  }
  if (activityListElement) {
    activityListElement.style.display = sortedActivities.length === 0 ? 'none' : 'block';
  }
}

// Settings modal event listeners
settingsButton?.addEventListener('click', () => {
  if (settingsModal) {
    settingsModal.style.display = 'flex';
  }
  if (stepsPerMileInput) {
    stepsPerMileInput.value = STEPS_PER_MILE.toString();
  }
});

cancelSettingsButton?.addEventListener('click', () => {
  if (settingsModal) {
    settingsModal.style.display = 'none';
  }
  if (stepsPerMileInput) {
    stepsPerMileInput.value = STEPS_PER_MILE.toString();
  }
});

// Helper function to update steps calculation in Add modal
function updateAddModalSteps(): void {
  if (milesInput && stepsCount && calculatedSteps) {
    const miles = parseFloat(milesInput.value);
    if (miles) {
      const steps = Math.round(miles * STEPS_PER_MILE);
      stepsCount.textContent = steps.toLocaleString();
      calculatedSteps.style.display = 'block';
    }
  }
}

// Helper function to update steps calculation in Edit modal
function updateEditModalSteps(): void {
  if (editMilesInput && editStepsCount && editCalculatedSteps) {
    const miles = parseFloat(editMilesInput.value);
    if (miles) {
      const steps = Math.round(miles * STEPS_PER_MILE);
      editStepsCount.textContent = steps.toLocaleString();
      editCalculatedSteps.style.display = 'block';
    }
  }
}

saveSettingsButton?.addEventListener('click', () => {
  if (!stepsPerMileInput?.value) return;

  const newStepsPerMile = parseInt(stepsPerMileInput.value);
  if (newStepsPerMile > 0) {
    STEPS_PER_MILE = newStepsPerMile;
    saveSettings(newStepsPerMile);
    
    // Update steps in any open modals
    updateAddModalSteps();
    updateEditModalSteps();
    
    updateUI(); // Update all displayed steps with new conversion
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }
});

// Add initialization event listener
window.addEventListener('tracker:init', () => {
  // Force reload activities from storage
  activities = loadActivities();
  // Update UI
  updateUI();
});

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load initial activities
  activities = loadActivities();
  
  // Set initial date and steps per mile
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  
  if (stepsPerMileInput) {
    const savedStepsPerMile = localStorage.getItem('stepsPerMile');
    stepsPerMileInput.value = savedStepsPerMile || '2000';
  }
  
  // Update UI with initial data
  updateUI();
}); 