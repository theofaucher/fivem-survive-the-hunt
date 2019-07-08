/// <reference path="C:\Users\User\Desktop\FiveM_Hide_And_Seek\server-data\autocompletion\typings\index.d.ts" />
import { huntersSpawnpoints } from './spawnpoints/hunters'
import { chasedSpawnpoints } from './spawnpoints/chased'
import { getPlayers } from './utils/sv_players'
import { Delay } from './utils/wait'
import { getRandomArbitrary } from './utils/random'
let chased;
let hunters = [];
let isGameStarted = false;
let startTime;
const huntersWeapons = [
    {
        hash: 'WEAPON_PUMPSHOTGUN',
        ammo: 3 * 8
    },
    {
        hash: 'WEAPON_PISTOL',
        ammo: 3 * 12
    },
    {
        hash: 'WEAPON_NIGHTSTICK',
        ammo: 1
    }
]

let zoneInterval
let zoneLastChanged
let zoneBlip = {
    type: 'radius',
    alpha: 128,
    coords: [0, 0, 0],
    scale: 1000,
    colour: 26,
}

onNet('playerConnected', () => {
    let playerId = source
    console.log(`${GetPlayerName(playerId)} connected!`)

    let location = huntersSpawnpoints[Math.floor(Math.random() * huntersSpawnpoints.length)]
    emitNet('spawn', playerId, location) // Force player respawn
    emitNet('giveWeapons', playerId, huntersWeapons)

    emitNet('notify', -1, `~b~${GetPlayerName(playerId)}~s~ has connected`)


    if (GetNumPlayerIndices() >= GetConvarInt('min_players', 20)) {
        emit('startGame')
    } else {
        emitNet('notify', -1, `Game will start when ~b~${GetConvar('min_players')}~s~ players will be connected (~r~${GetConvar('min_players') - GetNumPlayerIndices()}~s~ to go)`)
    }
})

on('startGame', () => {
    if (!isGameStarted) {
        hunters = getPlayers()

        let rand = Math.floor(Math.random() * hunters.length)

        chased = hunters[rand]
        hunters.splice(rand, 1)

        console.log(`Game started, chased : ${GetPlayerName(chased)}`)

        emitNet('spawn', chased, chasedSpawnpoints[Math.floor(Math.random() * chasedSpawnpoints.length)], true)
        emitNet('giveWeapons', chased)
        emitNet('notify', chased, "The game started! you are ~r~chased~s~!~n~RUN!")


        let locations = huntersSpawnpoints
        hunters.forEach(hunter => {
            let locationIdx = Math.floor(Math.random() * locations.length)
            emitNet('spawn', hunter, locations[locationIdx])
            locations.splice(locationIdx, 1)
            emitNet('giveWeapons', hunter, huntersWeapons, true)
            emitNet('notify', hunter, `The game started! Kill ~b~${GetPlayerName(chased)}~s~ to win!`)
        })
        isGameStarted = true
        startTime = Date.now()
        zoneLastChanged = Date.now()

        zoneInterval = setInterval(() => {
            if ((Date.now() - zoneLastChanged) / 1000 > GetConvarInt('zoneDelayBetweenChanges', 60)) {

                zoneLastChanged = Date.now()
                let chasedCoords = GetEntityCoords(GetPlayerPed(chased))
                if (zoneBlip.scale > GetConvarInt('zoneSizeStep', 50)) zoneBlip.scale -= GetConvarInt('zoneSizeStep', 50)
                zoneBlip.coords[0] = chasedCoords[0] + zoneBlip.scale * getRandomArbitrary(-0.7, 0.7)
                zoneBlip.coords[1] = chasedCoords[1] + zoneBlip.scale * getRandomArbitrary(-0.7, 0.7)
                emit('setBlip', 'chasedZone', zoneBlip)

            }
        }, 500)

    }
})

onNet('events:playerDied', async () => {
    let playerId = source
    emitNet('notify', -1, `${GetPlayerName(playerId)} died`)

    if (isGameStarted) {

        if (hunters.includes(playerId.toString())) {

            hunters.splice(hunters.indexOf(playerId), 1)

            if (hunters.length > 0) {
                emitNet('notify', -1, `~r~${GetPlayerName(playerId)}~s~ died ~r~${hunters.length}~s~ hunters left`)
            } else {
                emit('gameEnd', false)
            }

        }

        if (playerId == chased) {
            emit('gameEnd', true)
        }

    } else {
        console.log(`${GetPlayerName(playerId)} died`)
        await Delay(5000)
        let locationIdx = Math.floor(Math.random() * huntersSpawnpoints.length)
        emitNet('spawn', playerId, huntersSpawnpoints[locationIdx])
    }
})

on('gameEnd', (huntersWon) => {

    isGameStarted = false
    clearInterval(zoneInterval)
    emit('removeBlip', 'chasedZone')

    let locations = huntersSpawnpoints
    let timeSurvived = new Date(Date.now() - startTime)

    getPlayers().forEach(player => {
        let locationIdx = Math.floor(Math.random() * locations.length)
        emitNet('spawn', player, locations[locationIdx])
        locations.splice(locationIdx, 1)
        emitNet('giveWeapons', player, huntersWeapons, true)
    })

    if (huntersWon) {
        emitNet('notify', -1, `~b~${GetPlayerName(chased)}~s~ survived ${timeSurvived.toISOString().substr(11, 8)}`)
    } else {
        emitNet('notify', -1, `~r~Hunters~s~ were so bad that ~b~${GetPlayerName(chased)}~s~ managed to kill them all!`)
    }

})
