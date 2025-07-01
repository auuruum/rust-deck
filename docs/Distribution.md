Distribution
Share your Steam Deck plugin with your friends or publish it on Marketplace for everyone to use.

Validate
Before packaging a plugin to share, it must be validated to ensure it meets the requirements to work in Stream Deck. You can validate your plugin using the Stream Deck CLI's validate command. This validation includes things like manifest schema validation, file structure, and more.

Terminal
streamdeck validate com.elgato.hello-world.sdPlugin

Package
Once you have a valid plugin, you can package it into a .streamDeckPlugin file using the Stream Deck CLI's pack command. A .streamDeckPlugin file is an installer that users can double-click to add the plugin to Stream Deck.

Terminal
streamdeck pack com.elgato.hello-world.sdPlugin

Validation
The pack command will also validate the plugin before packaging it.

Publish
Become a Maker and publish your plugin on Marketplace! Publishing your plugin on Marketplace makes your plugin discoverable to millions of Stream Deck users, and keeps them up to date when you release new versions.

Plugins on Marketplace are submitted, and managed, within "Maker Console", a dedicated space for Makers and their products. Before submitting your plugin via Maker Console you should:

Test your plugin thoroughly. Looking for beta testers? Join the Marketplace Maker Discord and share your plugin to get feedback from fellow Makers.
Review the style guides, and make sure your plugin is Marketplace ready.
When everything is ready, learn more about submitting to Marketplace.

Returning Makers
Returning Makers, with plugins published before Maker Console, may not see their plugins in Maker Console upon first login. For assistance with accessing your plugins, please email our Maker Relations team on maker@elgato.com.