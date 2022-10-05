import { Packet, UDPPacket } from 'modloader64_api/ModLoaderDefaultImpls';
import * as DB from './Database';
import * as PData from '../puppet/Instance';

export class SyncStorage extends Packet {
  file: DB.FileData[];
  constructor(
      lobby: string,
      file: DB.FileData[]
  ) {
      super('SyncStorage', 'Sm64Online', lobby, false);
      this.file = file;
  }
}

export class SyncBuffered extends Packet {
  team: number;
  value: Buffer;
  constructor(
    lobby: string,
    header: string,
    team: number,
    value: Buffer,
    persist: boolean
) {
    super(header, 'Sm64Online', lobby, persist);
    this.team = team;
    this.value = value;
  }
}

export class SyncPointedBuffer extends Packet {
  team: number;
  address: number;
  value: Buffer;
  constructor(
    lobby: string,
    header: string,
    team: number,
    address: number,
    value: Buffer,
    persist: boolean
) {
    super(header, 'Sm64Online', lobby, persist);
    this.team = team;
    this.address = address;
    this.value = value;
  }
}

export class SyncNumber extends Packet {
  team: number;
  value: number;
  constructor(
    lobby: string,
    header: string,
    team: number,
    value: number,
    persist: boolean
  ) {
    super(header, 'Sm64Online', lobby, persist);
    this.team = team;
    this.value = value;
  }
}

// #################################################
// ##  Puppet Tracking
// #################################################

export class SyncPuppet extends UDPPacket {
  puppet: PData.Data;
  constructor(lobby: string, value: PData.Data) {
      super('SyncPuppet', 'Sm64Online', lobby, false);
      this.puppet = value;
  }
}