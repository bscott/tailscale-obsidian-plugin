
# Tailscale Obsidian Plugin

This plugin integrates Tailscale functionality into your Obsidian workspace, allowing you to manage and view your Tailscale network directly from within Obsidian.

## Features

- View active devices on your Tailscale network
- Check the status of your Tailscale connection
- Perform basic Tailscale operations without leaving Obsidian

## Installation

1. Open Obsidian and go to Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click on Browse and search for "Tailscale"
4. Install the Tailscale Obsidian Plugin
5. Enable the plugin after installation

## Configuration

To use this plugin, you need to provide a Tailscale API token:

1. Go to the Tailscale admin console: https://login.tailscale.com/admin/settings/keys
2. Click on "Generate API key"
3. Set an expiration date (up to 90 days) and choose the appropriate access level
4. Copy the generated API token
5. In Obsidian, go to Settings > Tailscale Plugin
6. Paste your API token in the designated field

**Important Note**: The Tailscale API token will need to be updated in the plugin settings every 90 days (or sooner, depending on the expiration date you set when generating the token). Make sure to generate a new token before the current one expires to ensure uninterrupted functionality.

## Usage

After configuration, you can access Tailscale features from the Obsidian sidebar. Click on the Tailscale icon to view your network status and connected devices.

## Troubleshooting

If you encounter any issues:

1. Ensure your API token is valid and hasn't expired
2. Check your internet connection
3. Verify that you have the necessary permissions in your Tailscale account

For further assistance, please open an issue on the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
