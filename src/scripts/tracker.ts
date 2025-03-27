import { format, parse, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, 
         startOfMonth, endOfMonth } from 'date-fns';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import { syncActivitiesToFirebase, initializeFirebaseSync, syncSettingsToFirebase } from './firebase';

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

// Constants
const STORAGE_KEY = 'activities';
const SETTINGS_KEY = 'miles-steps-tracker-settings';
let STEPS_PER_MILE = 2000;

// State management
let currentEditingActivity: Activity | null = null;
let activityChart: Chart | null = null;
let currentViewMode: ViewMode = 'weekly';
let showAverageLine = true;

// Initialize state
let activities = loadActivities();

// Load activities from localStorage
function loadActivities(): Activity[] {
  try {
    const savedActivities = localStorage.getItem(STORAGE_KEY);
    console.log('📥 Loading activities from localStorage:', savedActivities);
    if (!savedActivities) {
      console.log('No activities found in localStorage');
      return [];
    }
    const parsedActivities = JSON.parse(savedActivities);
    console.log('📦 Parsed activities:', parsedActivities);
    return Array.isArray(parsedActivities) ? parsedActivities : [];
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
}

// Save activities to localStorage and Firebase
async function saveActivities(): Promise<void> {
  try {
    console.log('💾 Saving activities:', activities);
    const activitiesJson = JSON.stringify(activities);
    localStorage.setItem(STORAGE_KEY, activitiesJson);
    console.log('📦 Saved to localStorage:', activitiesJson);
    
    // Sync to Firebase
    console.log('🔄 Starting Firebase sync...');
    await syncActivitiesToFirebase(activities);
    console.log('✅ Activities saved and synced successfully');
  } catch (error) {
    console.error('❌ Error saving activities:', error);
  }
}

// Load settings from localStorage
function loadSettings(): { stepsPerMile: number } {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return { stepsPerMile: 2000 };
  try {
    const settings = JSON.parse(stored);
    return { stepsPerMile: settings.stepsPerMile };
  } catch (e) {
    console.error('Error loading settings:', e);
    return { stepsPerMile: 2000 };
  }
}

// Save settings to localStorage and Firebase
async function saveSettings(stepsPerMile: number): Promise<void> {
  const settings = { stepsPerMile };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  await syncSettingsToFirebase(settings);
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

saveButton?.addEventListener('click', async () => {
  const activity = getActivityFromInputs();
  if (activity) {
    await addActivity(activity);
    closeAddModal();
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

saveEditButton?.addEventListener('click', async () => {
  const updatedActivity = getActivityFromEditInputs();
  if (updatedActivity && currentEditingActivity) {
    updatedActivity.id = currentEditingActivity.id;
    await updateActivity(updatedActivity);
  closeEditModal();
  }
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
  
  console.log('🎨 Rendering activities:', activities);
  
  // Remove all existing activities but keep the template
  const existingActivities = activityListElement.querySelectorAll('div[class*="border"]');
  existingActivities.forEach(activity => activity.remove());
  
  // Sort activities by date in descending order
  const sortedActivities = [...activities].sort((a, b) => 
    parse(b.date, 'yyyy-MM-dd', new Date()).getTime() - 
    parse(a.date, 'yyyy-MM-dd', new Date()).getTime()
  );
  
  console.log('📅 Sorted activities:', sortedActivities);
  
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
    const dateDiv = item.querySelector('.text-gray-600');
    const statsContainer = item.querySelector('.grid.grid-cols-4');
    
    if (!dateDiv || !statsContainer) {
      console.error('Date or stats container not found', { dateDiv, statsContainer });
      return;
    }
    
    // Set the date
    dateDiv.textContent = dateStr;
    
    // Get all stat value divs
    const statDivs = statsContainer.querySelectorAll('.text-gray-800');
    if (statDivs.length !== 4) {
      console.error('Incorrect number of stat divs:', statDivs.length);
      return;
    }
    
    // Set the stats values
    statDivs[0].textContent = activity.miles.toFixed(2);
    statDivs[1].textContent = activity.steps.toLocaleString();
    statDivs[2].textContent = Math.round(activity.calories).toString();
    statDivs[3].textContent = activity.weight ? Math.round(activity.weight).toString() : '-';
    
    // Get action buttons
    const buttons = item.querySelectorAll('button');
    const editButton = buttons[0];
    const deleteButton = buttons[1];
    
    // Add edit button event listener
    if (editButton) {
      editButton.addEventListener('click', () => {
        currentEditingActivity = activity;
        openEditModal(activity);
      });
    }
    
    // Add delete button event listener
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        deleteActivity(activity.id);
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
  // Load initial activities from localStorage
  activities = loadActivities();
  
  // Load saved settings
  const settings = loadSettings();
  STEPS_PER_MILE = settings.stepsPerMile;
  
  // Set initial date and steps per mile
  if (dateInput) {
    dateInput.value = getTodayDate();
  }
  
  if (stepsPerMileInput) {
    stepsPerMileInput.value = STEPS_PER_MILE.toString();
  }

  // Initialize Firebase sync
  initializeFirebaseSync();
  
  // Listen for activities update event
  window.addEventListener('activitiesUpdated', (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.source === 'firebase') {
      console.log('📥 Reloading activities from Firebase update');
      activities = loadActivities();
updateUI(); 
    }
  });

  // Listen for settings update event
  window.addEventListener('settingsUpdated', (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.source === 'firebase') {
      console.log('📥 Updating settings from Firebase:', customEvent.detail.settings);
      STEPS_PER_MILE = customEvent.detail.settings.stepsPerMile;
      if (stepsPerMileInput) {
        stepsPerMileInput.value = STEPS_PER_MILE.toString();
      }
      updateUI();
    }
  });

  // Update UI with initial data
  updateUI();
});

// Clear all data from localStorage
function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  activities = [];
  updateUI();
}

// Add clear data button event listener
const clearDataButton = document.getElementById('clearDataButton');
clearDataButton?.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all your activity data? This cannot be undone.')) {
    clearAllData();
  }
});

// Delete an activity
async function deleteActivity(activityId: string): Promise<void> {
  if (confirm('Are you sure you want to delete this activity?')) {
    activities = activities.filter(activity => activity.id !== activityId);
    await saveActivities();
    updateUI();
  }
}

// Add or update activity for the day
async function addActivity(newActivity: Activity): Promise<void> {
  // Check if an activity already exists for this date
  const existingIndex = activities.findIndex(activity => activity.date === newActivity.date);
  
  if (existingIndex !== -1) {
    // Update existing activity
    const existingActivity = activities[existingIndex];
    activities[existingIndex] = {
      ...existingActivity,
      miles: existingActivity.miles + newActivity.miles,
      steps: existingActivity.steps + newActivity.steps,
      calories: existingActivity.calories + newActivity.calories,
      weight: newActivity.weight || existingActivity.weight // Keep existing weight if no new weight provided
    };
    console.log('📝 Updated existing activity for', newActivity.date);
  } else {
    // Add new activity
    activities.push(newActivity);
    console.log('➕ Added new activity for', newActivity.date);
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await saveActivities();
  updateUI();
}

// Update activity and UI
async function updateActivity(updatedActivity: Activity): Promise<void> {
  const index = activities.findIndex(a => a.id === updatedActivity.id);
  if (index !== -1) {
    activities[index] = updatedActivity;
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await saveActivities();
    updateUI();
  }
}

// Helper function to get activity data from Add modal inputs
function getActivityFromInputs(): Activity | null {
  if (!milesInput?.value) return null;

  const miles = parseFloat(milesInput.value);
  const steps = Math.round(miles * STEPS_PER_MILE);
  const calories = parseFloat(caloriesInput?.value || '0');
  const weight = parseFloat(weightInput?.value || '0');
  const date = dateInput?.value ?? getTodayDate();

  return {
    id: date, // Use the date as the ID to ensure one activity per day
    date,
    miles: Number(miles.toFixed(2)),
    steps,
    calories,
    weight: weight || undefined
  };
}

// Helper function to get activity data from Edit modal inputs
function getActivityFromEditInputs(): Activity | null {
  if (!editMilesInput?.value) return null;

  const miles = parseFloat(editMilesInput.value);
  const steps = Math.round(miles * STEPS_PER_MILE);
  const calories = parseFloat(editCaloriesInput?.value || '0');
  const weight = parseFloat(editWeightInput?.value || '0');
  const date = editDateInput?.value ?? getTodayDate();

  return {
    id: currentEditingActivity?.id || Date.now().toString(),
    date,
    miles: Number(miles.toFixed(2)),
    steps,
    calories,
    weight: weight || undefined
  };
}

// Helper function to close Add modal
function closeAddModal(): void {
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
} 