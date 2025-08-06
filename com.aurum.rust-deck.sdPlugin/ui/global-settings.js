/**
 * Generic settings management for Stream Deck plugin property inspectors.
 * Handles both global and action-specific settings for various input types.
 */

document.addEventListener('DOMContentLoaded', () => {
    const checkSDPI = setInterval(() => {
        if (window.SDPIComponents && SDPIComponents.streamDeckClient) {
            clearInterval(checkSDPI);
            initializeSettings();
        }
    }, 100);
});

function initializeSettings() {
    const { streamDeckClient } = SDPIComponents;

    // Handle all settings inputs
    document.querySelectorAll('[setting]').forEach(input => {
        const settingName = input.getAttribute('setting');
        const isGlobal = input.hasAttribute('global');
        const isCheckbox = input.tagName.toLowerCase() === 'sdpi-checkbox';

        if (!settingName) return;

        const getSettings = isGlobal 
            ? streamDeckClient.getGlobalSettings.bind(streamDeckClient)
            : streamDeckClient.getSettings.bind(streamDeckClient);

        // Load initial value
        getSettings()
            .then(settings => {
                if (settings && settings[settingName] !== undefined) {
                    if (isCheckbox) {
                        input.checked = !!settings[settingName];
                    } else {
                        input.value = settings[settingName];
                    }
                }
            })
            .catch(error => console.error(`Error loading ${isGlobal ? 'global' : 'action'} settings:`, error));

        // Save changes
        input.addEventListener('change', (e) => {
            const value = isCheckbox ? e.target.checked : e.target.value;
            const update = {};
            update[settingName] = value;
            
            const setSettings = isGlobal
                ? streamDeckClient.setGlobalSettings.bind(streamDeckClient)
                : streamDeckClient.setSettings.bind(streamDeckClient);

            setSettings(update)
                .catch(error => console.error(`Error saving ${isGlobal ? 'global' : 'action'} settings:`, error));
        });
    });

    // Handle global settings updates from other property inspectors
    streamDeckClient.onDidReceiveGlobalSettings(({ settings }) => {
        if (!settings) return;
        
        Object.entries(settings).forEach(([key, value]) => {
            const input = document.querySelector(`[setting="${key}"][global]`);
            if (input) {
                const isCheckbox = input.tagName.toLowerCase() === 'sdpi-checkbox';
                if (isCheckbox) {
                    if (input.checked !== !!value) input.checked = !!value;
                } else {
                    if (input.value !== value) input.value = value;
                }
            }
        });
    });

    // Handle action settings updates from the plugin
    streamDeckClient.onDidReceiveSettings(({ settings }) => {
        if (!settings) return;
        
        Object.entries(settings).forEach(([key, value]) => {
            const input = document.querySelector(`[setting="${key}"]:not([global])`);
            if (input) {
                const isCheckbox = input.tagName.toLowerCase() === 'sdpi-checkbox';
                if (isCheckbox) {
                    if (input.checked !== !!value) input.checked = !!value;
                } else {
                    if (input.value !== value) input.value = value;
                }
            }
        });
    });
}
