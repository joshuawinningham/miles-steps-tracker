// Sync functionality
const SYNC_CODE_KEY = 'miles-steps-tracker-sync-code';
const API_URL = 'https://api.miles-steps-tracker.com'; // Replace with your actual API URL

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
function getSyncCode(): string {
  let syncCode = localStorage.getItem(SYNC_CODE_KEY);
  if (!syncCode) {
    syncCode = generateSyncCode();
    localStorage.setItem(SYNC_CODE_KEY, syncCode);
  }
  return syncCode;
}

// Sync activities with server
async function syncActivities(activities: any[]): Promise<void> {
  const syncCode = getSyncCode();
  try {
    const response = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syncCode,
        activities,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync activities');
    }
  } catch (error) {
    console.error('Error syncing activities:', error);
  }
}

// Fetch activities from server
async function fetchActivities(syncCode: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/sync/${syncCode}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

// Initialize sync functionality
function initializeSync(): void {
  const syncCodeInput = document.getElementById('syncCodeInput') as HTMLInputElement;
  const copySyncCodeButton = document.getElementById('copySyncCodeButton');
  const enterSyncCodeInput = document.getElementById('enterSyncCodeInput') as HTMLInputElement;
  const syncButton = document.getElementById('syncButton');

  // Set initial sync code
  if (syncCodeInput) {
    syncCodeInput.value = getSyncCode();
  }

  // Copy sync code button
  copySyncCodeButton?.addEventListener('click', () => {
    if (syncCodeInput) {
      syncCodeInput.select();
      document.execCommand('copy');
      // Show feedback
      const originalText = copySyncCodeButton.textContent;
      copySyncCodeButton.textContent = 'Copied!';
      setTimeout(() => {
        copySyncCodeButton.textContent = originalText;
      }, 2000);
    }
  });

  // Sync button
  syncButton?.addEventListener('click', async () => {
    if (!enterSyncCodeInput?.value) return;

    const syncCode = enterSyncCodeInput.value.trim().toUpperCase();
    const activities = await fetchActivities(syncCode);
    
    if (activities.length > 0) {
      // Update localStorage with synced activities
      localStorage.setItem('miles-steps-tracker-activities', JSON.stringify(activities));
      // Update UI
      window.dispatchEvent(new Event('tracker:init'));
    }
  });
}

// Export functions
export {
  getSyncCode,
  syncActivities,
  fetchActivities,
  initializeSync
}; 