import test from 'node:test';
import assert from 'node:assert/strict';
import {doorwayState} from '../lib/doorway.mjs';
test('Door stays shut until contact, then opens and releases before recoil',()=>{
 assert.equal(doorwayState(.9).opening,0);assert.equal(doorwayState(1).reach,1);
 assert.equal(doorwayState(2.5).opening,1);assert.equal(doorwayState(3.2).reach,0);
 assert.equal(doorwayState(3.3).recoil,1);assert.ok(doorwayState(2).edge<doorwayState(0).edge);
});
