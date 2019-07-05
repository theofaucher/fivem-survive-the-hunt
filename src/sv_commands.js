import {getPlayers} from './utils/sv_players'

RegisterCommand('list',()=>{
    console.log(`Connected players: ${GetNumPlayerIndices()}/${GetConvar('sv_maxClients')}`)
    getPlayers().forEach(player => {
        console.log(GetPlayerName(player))
    });
})