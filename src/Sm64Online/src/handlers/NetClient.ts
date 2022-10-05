import { EventHandler, EventsClient } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { LobbyData, NetworkHandler, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { Sm64Online_Handlers } from './Handlers';
import * as Main from '../Main';
import * as API from 'SuperMario64/API/Imports';
import * as Net from '../network/Imports';

export class Sm64Online_Client {
    private parent!: Main.Sm64Online;

    get core(): API.ISM64Core { return this.parent.core; }
    get modloader(): IModLoaderAPI { return this.parent.ModLoader; }
    get handlers(): Sm64Online_Handlers { return this.parent.Handle; }

    constructor(parent: Main.Sm64Online) { this.parent = parent; }

    init() { }

    // #################################################
    // ##  Utility Functions
    // #################################################

    log(input: string) {
        if (this.parent.config.print_net_client)
            this.modloader.logger.info('[Client] ' + input);
    }

    // #################################################
    // ##  Primary Events
    // #################################################

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onClient_InjectFinished(evt: any) {
        
    }

    @EventHandler(EventsClient.ON_LOBBY_JOIN)
    onClient_LobbyJoin(lobby: LobbyData): void {
        this.parent.cDB = new Net.DatabaseClient();
        let pData = new Packet('Request_Storage', 'Sm64Online', this.modloader.clientLobby, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    @EventHandler(EventsClient.ON_SERVER_CONNECTION)
    onClient_ServerConnection(evt: any) {
        this.parent.pMgr.reset();
		if (this.core.runtime === undefined || !this.core.player.exists) return;
		let pData = new Net.SyncNumber(
			this.modloader.clientLobby,
			"SyncLocation",
            this.core.runtime.get_current_profile(),
			this.parent.cDB.curScn,
			true
		);
		this.modloader.clientSide.sendPacket(pData);
    }

    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onClient_PlayerJoin(nplayer: INetworkPlayer) {
        this.parent.pMgr.registerPuppet(nplayer);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onClient_PlayerLeave(nplayer: INetworkPlayer) {
        this.parent.pMgr.unregisterPuppet(nplayer);
    }

    // #################################################
    // ##  Client Receive Packets
    // #################################################

    @NetworkHandler('SyncStorage')
    onClient_SyncStorage(packet: Net.SyncStorage): void {
        this.log('Received: {Lobby Storage}');
        this.parent.cDB.file = packet.file;
    }

    @NetworkHandler('SyncSaveFile')
    onClient_SyncSaveFile(packet: Net.SyncBuffered) {
        this.log('Received: {Save File}');

        // Detect Changes
        if (!this.handlers.merge_bits(this.parent.cDB.file[packet.team].save_data, packet.value)) return;

        this.log('Updated Team[' + packet.team + ']: {Save File}');
    }

    @NetworkHandler('SyncStarCount')
    onClient_SyncStarCount(packet: Net.SyncNumber) {
        this.log('Received: {Star Count}');

        // Detect Changes
        if (this.parent.cDB.file[packet.team].star_count >= packet.value) return;
        this.parent.cDB.file[packet.team].star_count = packet.value;
        
        this.log('Updated Team[' + packet.team + ']: {Star Count}');
    }

    // Puppet Tracking

    @NetworkHandler('Request_Scene')
    onClient_RequestScene(packet: Packet) {
        let pData = new Net.SyncNumber(
			packet.lobby,
			"SyncLocation",
			this.core.runtime.get_current_profile(),
			this.core.runtime.get_current_scene(),
			false
		);
		this.modloader.clientSide.sendPacketToSpecificPlayer(pData, packet.player);
    }

    @NetworkHandler('SyncLocation')
    onClient_SyncLocation(packet: Net.SyncNumber) {
        let pMsg = 'Player[' + packet.player.nickname + ']';
		let sMsg = 'Scene[' + packet.value + ']';
        this.parent.pMgr.changePuppetScene(packet.player, packet.value);
        this.log('Received: {Player Scene}');
        this.log('Updated: ' + pMsg + ' to ' + sMsg);
    }

    @NetworkHandler('SyncPuppet')
    onClient_SyncPuppet(packet: Net.SyncPuppet) {
        this.parent.pMgr.handlePuppet(packet);
    }
}