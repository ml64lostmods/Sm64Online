import { EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { DiscordStatus } from 'modloader64_api/Discord';
import * as Main from '../Main';
import * as API from 'SuperMario64/API/Imports';
import * as Net from '../network/Imports';

export class Sm64Online_Handlers {
    private parent!: Main.Sm64Online;

    get core(): API.ISM64Core { return this.parent.core; }
    get modloader(): IModLoaderAPI { return this.parent.ModLoader; }

    constructor(parent: Main.Sm64Online) { this.parent = parent; }

    init() { }

    tick() {
        if (!this.core.player.exists) return;

		// Initializers
		let paused: boolean = this.core.runtime.get_is_paused();
		let profile: number = this.core.runtime.get_current_profile();
		let scene: number = this.core.runtime.get_current_scene();
		let visible: boolean = this.core.player.visible;
		let bufStorage: Buffer;
		let bufData: Buffer;

		// General Setup/Handlers
		this.handle_scene_change(scene, profile);
		this.handle_puppets(scene, visible);

		// Progress Flags Handlers
		this.handle_save_flags(bufData!, bufStorage!, profile);
		this.handle_star_count(profile);
    }

    // #################################################
    // ##  Utility Functions
    // #################################################

    log(input: string) {
        if (this.parent.config.print_net_server)
            this.modloader.logger.info('[Tick] ' + input);
    }

    // #################################################
    // ##  Handler Functions
    // #################################################
    
    merge_bits(buf1: Buffer, buf2: Buffer): boolean {
        let c1 = buf1.byteLength;
        let c2 = buf2.byteLength;
        let count = c1 > c2 ? c2 : c1;

        let i: number;
        let needUpdate = false;

        for (i = 0; i < count; i++) {
            if (buf1[i] === buf2[i]) continue;
            buf1[i] |= buf2[i];
            needUpdate = true;
        }

        return needUpdate;
    }
    
	handle_scene_change(scene: number, profile: number) {
		if (scene === this.parent.cDB.curScn) return;

		// Set global to current scene value
		this.parent.cDB.curScn = scene;

		this.modloader.clientSide.sendPacket(new Net.SyncNumber(this.modloader.clientLobby, "SyncLocation", profile, scene, true));
		this.modloader.logger.info('Moved to scene[' + scene + '].');
	}

	handle_puppets(scene: number, visible: boolean) {
		if (this.modloader.emulator.rdramRead32(0x8033EFFC) < 50) return;

		this.parent.pMgr.scene = scene;
		this.parent.pMgr.onTick(this.parent.cDB.curScn !== -1 && visible);
	}

	handle_save_flags(bufData: Buffer, bufStorage: Buffer, profile: number) {
		// Initializers
		let pData: Net.SyncBuffered;
		let i: number;
		let count: number;
        let val: number;
		let needUpdate = false;

		bufData = this.core.save[profile].get_all();
		bufStorage = this.parent.cDB.file[profile].save_data;
		count = bufData.byteLength;
		needUpdate = false;

		for (i = 0; i < count; i++) {
			if (bufData[i] === bufStorage[i]) continue;
            if (i === 9) continue; // Hat removal byte

			bufData[i] |= bufStorage[i];
			this.core.save[profile].set(i, bufData[i]);
			needUpdate = true;
		}

        val = bufStorage[9] & 0x000000f8; // 4 == monkey, 2 == vulture, 1 == vulture recollect
        if ((bufData[9] & 0x000000f8) !== val) {
            bufData[9] |= val;
            this.core.save[profile].set(9, bufData[9]);
            needUpdate = true;
        }

		// Send Changes to Server
		if (!needUpdate) return;
		this.parent.cDB.file[profile].save_data = bufData;
		pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncSaveFile', profile, bufData, false);
		this.modloader.clientSide.sendPacket(pData);
	}

	handle_star_count(profile: number) {
		// Initializers
		let pData: Net.SyncNumber;
		let val: number;
		let valDB: number;
		let needUpdate = false;

		val = this.core.runtime.star_count;
		valDB = this.parent.cDB.file[profile].star_count;

		// Detect Changes
		if (val === valDB) return;

		// Process Changes
		if (val > valDB) {
			this.parent.cDB.file[profile].star_count = val;
			needUpdate = true;
		} else {
			this.core.runtime.star_count = valDB;
		}

		// Send Changes to Server
		if (!needUpdate) return;
		pData = new Net.SyncNumber(this.modloader.clientLobby, 'SyncStarCount', profile, val, false);
		this.modloader.clientSide.sendPacket(pData);
	}
}