import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, requestUrl, RequestUrlResponse } from 'obsidian';

interface TailscaleDevice {
    name: string;
    addresses: string[];
    lastSeen: string;
    // Add other properties as needed
}

interface TailscaleAPIResponse {
    devices: TailscaleDevice[];
}

interface TailscaleNode {
    name: string;
    online: boolean;
    tailscaleIP: string;
}

interface TailscalePluginSettings {
    authToken: string;
}

const DEFAULT_SETTINGS: TailscalePluginSettings = {
    authToken: ''
}

class TailscaleAPI {
    private authToken: string;
    private baseUrl: string;

    constructor(authToken: string) {
        this.authToken = authToken;
        this.baseUrl = 'https://api.tailscale.com/api/v2';
    }

    setAuthToken(authToken: string): void {
        this.authToken = authToken;
    }

    async getNodes(): Promise<TailscaleNode[]> {
        try {
            const response: RequestUrlResponse = await requestUrl({
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

            const data: TailscaleAPIResponse = JSON.parse(response.text);

            return data.devices.map((device: TailscaleDevice) => {
                const lastSeenDate = new Date(device.lastSeen);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                const isOnline = lastSeenDate > fiveMinutesAgo;
                const tailscaleIP = device.addresses.find((addr: string) => addr.includes('.')) || 'N/A';

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

export default class TailscalePlugin extends Plugin {
    settings: TailscalePluginSettings;
    api: TailscaleAPI;

    async onload() {
        await this.loadSettings();

        this.api = new TailscaleAPI(this.settings.authToken);

        this.addCommand({
            id: 'update-tailscale-note',
            name: 'Update Tailscale Note',
            callback: () => this.updateTailscaleNote()
        });

        this.addSettingTab(new TailscaleSettingTab(this.app, this));

        // Schedule regular updates every 5 minutes
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
            } catch (error) {
                new Notice(`Error creating Tailscale note. Check console for details.`);
                return;
            }
        }

        if (!(file instanceof TFile)) {
            new Notice(`Error: Tailscale.md is not a valid file.`);
            return;
        }

        try {
            const nodes = await this.api.getNodes();

            let content = '# Tailscale Nodes\n\n';
            content += '| Node Name | Tailscale UP | Tailscale IP |\n';
            content += '|-----------|--------------|---------------|\n';

            for (const node of nodes) {
                content += `| ${node.name} | ${node.online ? 'Yes' : 'No'} | ${node.tailscaleIP} |\n`;
            }

            const currentContent = await this.app.vault.read(file);

            if (currentContent !== content) {
                await this.app.vault.modify(file, content);
                new Notice('Tailscale note updated');
            }
        } catch (error) {
            console.error('Error updating Tailscale note:', error);
            new Notice(`Error updating Tailscale note. Check console for details.`);
        }
    }
}

class TailscaleSettingTab extends PluginSettingTab {
    plugin: TailscalePlugin;

    constructor(app: App, plugin: TailscalePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: 'Tailscale Plugin Settings'});

        new Setting(containerEl)
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