const obsidian = require('obsidian');

class TailscaleAPI {
    constructor(authToken) {
        this.authToken = authToken;
        this.baseUrl = 'https://api.tailscale.com/api/v2';
    }

    setAuthToken(authToken) {
        this.authToken = authToken;
    }

    async getNodes() {
        try {
            const response = await obsidian.requestUrl({
                url: `${this.baseUrl}/tailnet/-/devices`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status !== 200) {
                throw new Error(`Failed to fetch nodes: ${response.status}`);
            }

            const data = JSON.parse(response.text);
            console.log('Raw API response:', JSON.stringify(data, null, 2));

            return data.devices.map((device) => {
                // Determine if the device is online (active within the last 5 minutes)
                const lastSeenDate = new Date(device.lastSeen);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const isOnline = lastSeenDate > fiveMinutesAgo;

                // Get the Tailscale IP (first IPv4 address)
                const tailscaleIP = device.addresses.find(addr => addr.includes('.')) || 'N/A';

                console.log(`Device ${device.name}:`, {
                    online: isOnline,
                    tailscaleIP: tailscaleIP,
                    lastSeen: device.lastSeen,
                    fullDevice: device  // Log the entire device object
                });

                return {
                    name: device.name,
                    online: isOnline,
                    tailscaleIP: tailscaleIP
                };
            });
        } catch (error) {
            console.error('Error fetching Tailscale nodes:', error);
            throw error;
        }
    }
}

const DEFAULT_SETTINGS = {
    authToken: ''
}

module.exports = class TailscalePlugin extends obsidian.Plugin {
    settings;
    api;

    async onload() {
        await this.loadSettings();

        this.api = new TailscaleAPI(this.settings.authToken);

        this.addCommand({
            id: 'update-tailscale-note',
            name: 'Update Tailscale Note',
            callback: () => this.updateTailscaleNote()
        });

        this.addSettingTab(new TailscaleSettingTab(this.app, this));

        // Schedule regular updates (e.g., every 5 minutes)
        this.registerInterval(
            window.setInterval(() => this.updateTailscaleNote(), 5 * 60 * 1000)
        );
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async updateTailscaleNote() {
        const fileName = 'Tailscale.md';
        let file = this.app.vault.getAbstractFileByPath(fileName);
        
        if (!file) {
            try {
                file = await this.app.vault.create(fileName, '# Tailscale Nodes\n\n');
                console.log(`Created new file: ${fileName}`);
            } catch (error) {
                console.error(`Error creating file ${fileName}:`, error);
                new obsidian.Notice(`Error creating Tailscale note. Check console for details.`);
                return;
            }
        }

        if (!(file instanceof obsidian.TFile)) {
            console.error('Tailscale.md is not a file');
            new obsidian.Notice(`Error: Tailscale.md is not a valid file.`);
            return;
        }

        try {
            const nodes = await this.api.getNodes();
            console.log(`Fetched ${nodes.length} nodes from Tailscale API`);

            let content = '# Tailscale Nodes\n\n';
            content += '| Node Name | Tailscale UP | Tailscale IP |\n';
            content += '|-----------|--------------|---------------|\n';

            for (const node of nodes) {
                content += `| ${node.name} | ${node.online ? 'Yes' : 'No'} | ${node.tailscaleIP} |\n`;
                console.log(`Processed Node: ${node.name}, Online: ${node.online}, Tailscale IP: ${node.tailscaleIP}`);
            }

            console.log('Content to be written:', content);

            // Read the current content of the file
            const currentContent = await this.app.vault.read(file);
            console.log('Current file content:', currentContent);

            if (currentContent !== content) {
                await this.app.vault.modify(file, content);
                console.log('Tailscale note updated successfully');
                new obsidian.Notice('Tailscale note updated');
            } else {
                console.log('No changes needed, file content is up to date');
            }
        } catch (error) {
            console.error('Error updating Tailscale note:', error);
            new obsidian.Notice(`Error updating Tailscale note. Check console for details.`);
        }
    }
}

class TailscaleSettingTab extends obsidian.PluginSettingTab {
    plugin;

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: 'Tailscale Plugin Settings'});

        new obsidian.Setting(containerEl)
            .setName('Tailscale Auth API Token')
            .setDesc('Enter your Tailscale Auth API token')
            .addText(text => text
                .setPlaceholder('Enter your token')
                .setValue(this.plugin.settings.authToken)
                .onChange(async (value) => {
                    this.plugin.settings.authToken = value;
                    await this.plugin.saveSettings();
                    this.plugin.api.setAuthToken(value);
                }));
    }
}