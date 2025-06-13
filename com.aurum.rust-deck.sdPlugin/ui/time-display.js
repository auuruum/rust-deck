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
            console.log('Property Inspector: Set displayFormatSelect value to', displayFormatSelect.value);
        });

        // Listen for select changes
        const displayFormatSelect = document.querySelector('sdpi-select[setting="displayFormat"]');
        if (displayFormatSelect) {
            displayFormatSelect.addEventListener('change', (event) => {
                const newSettings = { ...settings, displayFormat: event.target.value };
                console.log('Property Inspector: Sending settings', newSettings);
                streamDeckClient.setSettings(newSettings);
            });
        } else {
            console.error('Property Inspector: Could not find displayFormat select element for event listener');
        }
    } catch (error) {
        console.error('Property Inspector: Error initializing', error);
    }
}); 