document.addEventListener('DOMContentLoaded', function() {
    try {
        const { streamDeckClient } = SDPIComponents;
        let settings = {};

        // Request initial settings
        streamDeckClient.getSettings();

        // Listen for settings updates
        streamDeckClient.on('didReceiveSettings', ({ payload }) => {
            console.log('Property Inspector: Received settings', payload.settings);
            settings = payload.settings || {};
            
            // Handle display format select
            const displayFormatSelect = document.querySelector('sdpi-select[setting="displayFormat"]');
            if (!displayFormatSelect) {
                console.error('Property Inspector: Could not find displayFormat select element');
                return;
            }

            if (!settings.displayFormat) {
                settings.displayFormat = 'time';
                streamDeckClient.setSettings(settings);
                console.log('Property Inspector: Set default displayFormat and sent settings', settings);
            }

            displayFormatSelect.value = settings.displayFormat;

            // Handle title position select
            const titlePositionSelect = document.querySelector('sdpi-select[setting="titlePosition"]');
            if (titlePositionSelect) {
                titlePositionSelect.value = settings.titlePosition || 'top';
            }

            // Handle custom title textfield
            const customTitleField = document.querySelector('sdpi-textfield[setting="customTitle"]');
            if (customTitleField) {
                customTitleField.value = settings.customTitle || '';
            }
        });

        // Listen for select changes
        const displayFormatSelect = document.querySelector('sdpi-select[setting="displayFormat"]');
        if (displayFormatSelect) {
            displayFormatSelect.addEventListener('change', (event) => {
                const newSettings = { ...settings, displayFormat: event.target.value };
                console.log('Property Inspector: Sending settings', newSettings);
                streamDeckClient.setSettings(newSettings);
            });
        }

        // Listen for title position changes
        const titlePositionSelect = document.querySelector('sdpi-select[setting="titlePosition"]');
        if (titlePositionSelect) {
            titlePositionSelect.addEventListener('change', (event) => {
                const newSettings = { ...settings, titlePosition: event.target.value };
                console.log('Property Inspector: Sending settings', newSettings);
                streamDeckClient.setSettings(newSettings);
            });
        }

        // Listen for custom title changes
        const customTitleField = document.querySelector('sdpi-textfield[setting="customTitle"]');
        if (customTitleField) {
            let debounceTimer;
            customTitleField.addEventListener('input', (event) => {
                // Clear any existing timer
                clearTimeout(debounceTimer);
                
                // Set a new timer to update settings after user stops typing
                debounceTimer = setTimeout(() => {
                    const newSettings = { ...settings, customTitle: event.target.value };
                    console.log('Property Inspector: Sending settings', newSettings);
                    streamDeckClient.setSettings(newSettings);
                }, 300); // Wait 300ms after user stops typing
            });
        }
    } catch (error) {
        console.error('Property Inspector: Error initializing', error);
    }
}); 