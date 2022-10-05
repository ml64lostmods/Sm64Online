import { EventsClient, EventServerJoined, EventServerLeft, EventHandler, EventsServer } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin, IPluginServerConfig } from 'modloader64_api/IModLoaderAPI';
import {
	INetworkPlayer,
	LobbyData,
	NetworkHandler,
	ServerNetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { DiscordStatus } from 'modloader64_api/Discord';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import * as API from 'SuperMario64/API/Imports';
import * as Hnd from './handlers/Imports';
import * as Net from './network/Imports';
import * as Puppet from './puppet/Imports';

export interface IConfig {
    print_net_client: boolean;
    print_net_server: boolean;
    show_tracker: boolean;
}

export class Sm64Online implements IPlugin, IPluginServerConfig {
	@InjectCore() core!: API.ISM64Core;
	ModLoader = {} as IModLoaderAPI;
	name = 'Sm64Online';

	// Storage Variables
	cDB!: Net.DatabaseClient;
    pMgr!: Puppet.PuppetManager;

    Handle!: Hnd.Sm64Online_Handlers;
    Client!: Hnd.Sm64Online_Client
    Server!: Hnd.Sm64Online_Server

    config!: IConfig;
	
    constructor() {
        // Construct sub-modules
        this.Handle = new Hnd.Sm64Online_Handlers(this);
        this.Client = new Hnd.Sm64Online_Client(this);
        this.Server = new Hnd.Sm64Online_Server(this);
    }

	preinit(): void { this.pMgr = new Puppet.PuppetManager(); }

	init(): void {
		// Init config
        this.config = this.ModLoader.config.registerConfigCategory('Sm64Online') as IConfig;
        this.ModLoader.config.setData('Sm64Online', 'print_net_client', 'false');
        this.ModLoader.config.setData('Sm64Online', 'print_net_server', 'false');
        this.ModLoader.config.setData('Sm64Online', 'show_tracker', 'true');

        // Init sub-modules
        this.Handle.init();
        this.Client.init();
        this.Server.init();
	}

	postinit(): void {
		// Puppet Manager Inject
		this.pMgr.postinit(
			this.ModLoader.emulator,
			this.core,
			this.ModLoader.me,
			this.ModLoader
		);

		this.ModLoader.logger.info('Puppet manager activated.');

		// Show tracker
        //if (this.config.show_tracker) this.ModLoader.gui.openWindow(698, 795, __dirname + '/gui/Tracker.html');

        // Update discord
        let status: DiscordStatus = new DiscordStatus('Playing Sm64Online', 'On the title screen [Team Select]');
        status.smallImageKey = 'sm64o';
        status.partyId = this.ModLoader.clientLobby;
        status.partyMax = 15;
        status.partySize = 1;
        this.ModLoader.gui.setDiscordStatus(status);
	}

	onTick(): void { this.Handle.tick(); }

	getServerURL(): string { return "158.69.60.101:8030"; }
}