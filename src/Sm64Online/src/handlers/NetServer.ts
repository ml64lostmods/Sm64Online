import { EventHandler, EventsServer, EventServerJoined, EventServerLeft } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { Sm64Online_Handlers } from './Handlers';
import * as Main from '../Main';
import * as API from 'SuperMario64/API/Imports';
import * as Net from '../network/Imports';

export class Sm64Online_Server {
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
        if (this.parent.config.print_net_server)
            this.modloader.logger.info('[Server] ' + input);
    }

    sDB(lobby: string): Net.DatabaseServer {
        return this.modloader.lobbyManager.getLobbyStorage(lobby, this.parent);
    }

    // #################################################
    // ##  Primary Events
    // #################################################

    @EventHandler(EventsServer.ON_LOBBY_CREATE)
    onServer_LobbyCreate(lobby: string) {
        this.modloader.lobbyManager.createLobbyStorage(
            lobby,
            this.parent,
            new Net.DatabaseServer()
        );
    }

    @EventHandler(EventsServer.ON_LOBBY_JOIN)
    onServer_LobbyJoin(evt: EventServerJoined) {
        let sDB = this.sDB(evt.lobby);
        sDB.players[evt.player.uuid] = -1;
        sDB.playerInstances[evt.player.uuid] = evt.player;
    }

    @EventHandler(EventsServer.ON_LOBBY_LEAVE)
    onServer_LobbyLeave(evt: EventServerLeft) {
        let sDB = this.sDB(evt.lobby);
        delete sDB.players[evt.player.uuid];
        delete sDB.playerInstances[evt.player.uuid];
    }

    // #################################################
    // ##  Server Receive Packets
    // #################################################

    @ServerNetworkHandler('Request_Storage')
    onServer_RequestStorage(packet: Packet): void {
        this.log('Sending: {Lobby Storage}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let pData = new Net.SyncStorage(
            packet.lobby,
            sDB.file
        );
        this.modloader.serverSide.sendPacketToSpecificPlayer(pData, packet.player);
    }

	@ServerNetworkHandler('SyncSaveFile')
	onServer_SyncSaveFile(packet: Net.SyncBuffered) {
        this.log('Received: {Save File}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].save_data, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncSaveFile', packet.team, sDB.file[packet.team].save_data, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + packet.team + ']: {Save File}');
    }

	@ServerNetworkHandler('SyncStarCount')
	onServer_SyncStarCount(packet: Net.SyncNumber) {
        this.log('Received: {Star Count}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (sDB.file[packet.team].star_count >= packet.value) return;
        sDB.file[packet.team].star_count = packet.value;

        let pData = new Net.SyncNumber(packet.lobby, 'SyncStarCount', packet.team, sDB.file[packet.team].star_count, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + packet.team + ']: {Star Count}');
    }

    // Puppet Tracking

    @ServerNetworkHandler('SyncLocation')
    onServer_SyncLocation(packet: Net.SyncNumber) {
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let pMsg = 'Player[' + packet.player.nickname + ']';
		let sMsg = 'Scene[' + packet.value + ']';
        sDB.players[packet.player.uuid] = packet.value;
        this.log('Received: {Player Scene}');
        this.log('Updated: ' + pMsg + ' to ' + sMsg);
    }

    @ServerNetworkHandler('SyncPuppet')
    onServer_SyncPuppet(packet: Net.SyncPuppet) {
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        Object.keys(sDB.players).forEach((key: string) => {
            if (sDB.players[key] !== sDB.players[packet.player.uuid]) {
                return;
            }

            if (!sDB.playerInstances.hasOwnProperty(key)) return;
            if (sDB.playerInstances[key].uuid === packet.player.uuid) {
                return;
            }

            this.modloader.serverSide.sendPacketToSpecificPlayer(
                packet,
                sDB.playerInstances[key]
            );
        });
    }
}