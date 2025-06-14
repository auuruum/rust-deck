/**
 * Global settings management for Stream Deck plugin
 */

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for SDPIComponents to be available
    const checkSDPI = setInterval(() => {
        if (window.SDPIComponents && SDPIComponents.streamDeckClient) {
            clearInterval(checkSDPI);
            initializeGlobalSettings();
        }
    }, 100);
});

function initializeGlobalSettings() {
    const { streamDeckClient } = SDPIComponents;
    
    // Initialize all global settings inputs
    document.querySelectorAll('sdpi-textfield[global]').forEach(input => {
        const settingName = input.getAttribute('setting');
        if (!settingName) return;

        // Load initial value
        streamDeckClient.getGlobalSettings()
            .then(settings => {
                if (settings && settings[settingName] !== undefined) {
                    input.value = settings[settingName];
                }
            })
            .catch(error => console.error('Error loading global settings:', error));

        // Save changes
        input.addEventListener('change', (e) => {
            const value = e.target.value;
            const update = {};
            update[settingName] = value;
            
            streamDeckClient.setGlobalSettings(update)
                .catch(error => console.error('Error saving global settings:', error));
        });
    });

    // Handle global settings updates from other property inspectors
    streamDeckClient.onDidReceiveGlobalSettings(({ settings }) => {
        if (!settings) return;
        
        Object.entries(settings).forEach(([key, value]) => {
            const input = document.querySelector(`sdpi-textfield[setting="${key}"][global]`);
            if (input && input.value !== value) {
                input.value = value;
            }
        });
    });
}
