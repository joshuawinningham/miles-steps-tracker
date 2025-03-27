import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbvsVPadv7dRlOF0-hCkm-kCoquS2I4PI",
  authDomain: "miles-steps-tracker.firebaseapp.com",
  databaseURL: "https://miles-steps-tracker-default-rtdb.firebaseio.com",
  projectId: "miles-steps-tracker",
  storageBucket: "miles-steps-tracker.firebasestorage.app",
  messagingSenderId: "686766245020",
  appId: "1:686766245020:web:99194680badc5176d35959"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Constants
const SYNC_CODE_KEY = 'syncCode';
const STORAGE_KEY = 'activities';
const SETTINGS_KEY = 'miles-steps-tracker-settings';
const LAST_UPDATE_KEY = 'lastUpdate';

// Generate a random sync code
function generateSyncCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get or create sync code
export function getOrCreateSyncCode(): string {
  let syncCode = localStorage.getItem(SYNC_CODE_KEY);
  if (!syncCode) {
    syncCode = generateSyncCode();
    localStorage.setItem(SYNC_CODE_KEY, syncCode);
  }
  return syncCode;
}

// Sync activities to Firebase
export async function syncActivitiesToFirebase(activities: any[]): Promise<void> {
  try {
    const syncCode = getOrCreateSyncCode();
    console.log('🔄 Syncing activities to Firebase:', {
      syncCode,
      activitiesCount: activities.length,
      activities
    });
    
    // Convert undefined values to null for Firebase
    const sanitizedActivities = activities.map(activity => ({
      ...activity,
      weight: activity.weight === undefined ? null : activity.weight
    }));
    
    const activitiesRef = ref(database, `activities/${syncCode}`);
    await set(activitiesRef, sanitizedActivities);
    
    // Store the timestamp of this update
    const timestamp = Date.now();
    localStorage.setItem(LAST_UPDATE_KEY, timestamp.toString());
    
    console.log('✅ Successfully synced activities to Firebase');
  } catch (error) {
    console.error('❌ Error syncing to Firebase:', error);
    throw error;
  }
}

// Fetch activities from Firebase
export async function fetchActivitiesFromFirebase(syncCode: string): Promise<any[]> {
  try {
    console.log('🔍 Fetching activities with sync code:', syncCode);
    const activitiesRef = ref(database, `activities/${syncCode}`);
    const snapshot = await get(activitiesRef);
    const activities = snapshot.val() || [];
    console.log('📥 Fetched activities:', {
      found: !!snapshot.val(),
      activitiesCount: Array.isArray(activities) ? activities.length : 0,
      activities
    });
    return activities;
  } catch (error) {
    console.error('❌ Error fetching from Firebase:', error);
    throw error;
  }
}

// Sync settings to Firebase
export async function syncSettingsToFirebase(settings: any): Promise<void> {
  try {
    const syncCode = getOrCreateSyncCode();
    console.log('🔄 Syncing settings to Firebase:', {
      syncCode,
      settings
    });
    
    const settingsRef = ref(database, `settings/${syncCode}`);
    await set(settingsRef, settings);
    console.log('✅ Successfully synced settings to Firebase');
  } catch (error) {
    console.error('❌ Error syncing settings to Firebase:', error);
    throw error;
  }
}

// Initialize sync functionality
export function initializeFirebaseSync(): void {
  const syncCodeInput = document.getElementById('syncCodeInput') as HTMLInputElement;
  const enterSyncCodeInput = document.getElementById('enterSyncCodeInput') as HTMLInputElement;
  const copySyncCodeButton = document.getElementById('copySyncCodeButton') as HTMLButtonElement;
  const syncButton = document.getElementById('syncButton') as HTMLButtonElement;

  console.log('🚀 Initializing Firebase sync...');

  // Set initial sync code
  const initialSyncCode = getOrCreateSyncCode();
  if (syncCodeInput) {
    console.log('📝 Setting initial sync code:', initialSyncCode);
    syncCodeInput.value = initialSyncCode;
  }

  // Set up real-time sync for activities
  const activitiesRef = ref(database, `activities/${initialSyncCode}`);
  onValue(activitiesRef, (snapshot) => {
    const activities = snapshot.val() || [];
    console.log('🔄 Real-time update received:', {
      activitiesCount: activities.length,
      activities
    });
    
    // Save to localStorage and update UI
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    window.dispatchEvent(new CustomEvent('activitiesUpdated', { detail: { source: 'firebase' } }));
  });

  // Set up real-time sync for settings
  const settingsRef = ref(database, `settings/${initialSyncCode}`);
  onValue(settingsRef, (snapshot) => {
    const settings = snapshot.val();
    console.log('🔄 Settings update received:', settings);
    
    if (settings) {
      // Save to localStorage and update UI
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { source: 'firebase', settings } }));
    }
  });

  if (copySyncCodeButton) {
    copySyncCodeButton.addEventListener('click', () => {
      const syncCode = getOrCreateSyncCode();
      console.log('📋 Copying sync code:', syncCode);
      navigator.clipboard.writeText(syncCode).then(() => {
        copySyncCodeButton.textContent = 'Copied!';
        setTimeout(() => {
          copySyncCodeButton.textContent = 'Copy Code';
        }, 2000);
      });
    });
  }

  if (syncButton && enterSyncCodeInput) {
    syncButton.addEventListener('click', async () => {
      const syncCode = enterSyncCodeInput.value.trim().toUpperCase();
      console.log('🔄 Attempting to sync with code:', syncCode);
      
      if (syncCode.length !== 6) {
        alert('Please enter a valid 6-character sync code');
        return;
      }

      try {
        // Fetch and sync activities
        const activities = await fetchActivitiesFromFirebase(syncCode);
        console.log('📥 Received activities:', {
          syncCode,
          activitiesCount: activities.length,
          activities
        });
        
        // Fetch and sync settings
        const settingsRef = ref(database, `settings/${syncCode}`);
        const settingsSnapshot = await get(settingsRef);
        const settings = settingsSnapshot.val();
        console.log('📥 Received settings:', settings);
        
        if (activities && activities.length >= 0) {
          // Save activities and settings to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
          localStorage.setItem(SYNC_CODE_KEY, syncCode);
          if (settings) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          }
          
          console.log('💾 Saved to localStorage:', {
            activities: JSON.stringify(activities),
            settings,
            syncCode
          });
          
          // Set up real-time sync with new sync code
          const newActivitiesRef = ref(database, `activities/${syncCode}`);
          onValue(newActivitiesRef, (snapshot) => {
            const updatedActivities = snapshot.val() || [];
            console.log('🔄 Real-time update received:', {
              activitiesCount: updatedActivities.length,
              activities: updatedActivities
            });
            
            // Save to localStorage and update UI
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));
            window.dispatchEvent(new CustomEvent('activitiesUpdated', { detail: { source: 'firebase' } }));
          });

          // Set up real-time sync for settings
          const newSettingsRef = ref(database, `settings/${syncCode}`);
          onValue(newSettingsRef, (snapshot) => {
            const updatedSettings = snapshot.val();
            console.log('🔄 Settings update received:', updatedSettings);
            
            if (updatedSettings) {
              // Save to localStorage and update UI
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
              window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { source: 'firebase', settings: updatedSettings } }));
            }
          });
          
          alert('Activities and settings synced successfully!');
        } else {
          console.log('⚠️ No activities found for sync code:', syncCode);
          alert('No activities found for this sync code.');
        }
      } catch (error) {
        console.error('❌ Error syncing data:', error);
        alert('Error syncing data. Please try again.');
      }
    });
  }
} 