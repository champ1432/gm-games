// @flow

import orderBy from "lodash/orderBy";
import range from "lodash/range";
import { PHASE, PLAYER } from "../../../../deion/common";
import { player, team } from "..";
import { idb } from "../../db";
import { g, local, random } from "../../../../deion/worker/util";

/**
 * AI teams sign free agents.
 *
 * Each team (in random order) will sign free agents up to their salary cap or roster size limit. This should eventually be made smarter
 *
 * @memberOf core.freeAgents
 * @return {Promise}
 */
const autoSign = async () => {
    const [teams, players] = await Promise.all([
        idb.getCopies.teamsPlus({
            attrs: ["strategy"],
            season: g.season,
        }),
        idb.cache.players.indexGetAll("playersByTid", PLAYER.FREE_AGENT),
    ]);

    if (players.length === 0) {
        return;
    }

    const strategies = teams.map(t => t.strategy);

    // List of free agents, sorted by value
    const playersSorted = orderBy(players, "value", "desc");

    // Randomly order teams
    const tids = range(g.numTeams);
    random.shuffle(tids);

    for (const tid of tids) {
        // Skip the user's team
        if (g.userTids.includes(tid) && local.autoPlaySeasons === 0) {
            continue;
        }

        // Small chance of actually trying to sign someone in free agency, gets greater as time goes on
        if (
            g.phase === PHASE.FREE_AGENCY &&
            Math.random() < (0.99 * g.daysLeft) / 30
        ) {
            continue;
        }

        // Skip rebuilding teams sometimes
        if (strategies[tid] === "rebuilding" && Math.random() < 0.7) {
            continue;
        }

        const playersOnRoster = await idb.cache.players.indexGetAll(
            "playersByTid",
            tid,
        );
        const payroll = await team.getPayroll(tid);
        const numPlayersOnRoster = playersOnRoster.length;

        if (numPlayersOnRoster < g.maxRosterSize) {
            for (let i = 0; i < playersSorted.length; i++) {
                const p = playersSorted[i];
                // Don't sign minimum contract players to fill out the roster
                if (
                    p.contract.amount + payroll <= g.salaryCap ||
                    (p.contract.amount === g.minContract &&
                        numPlayersOnRoster < g.maxRosterSize - 2)
                ) {
                    player.sign(p, tid, p.contract, g.phase);

                    playersSorted.splice(i, 1); // Remove from list of free agents

                    await idb.cache.players.put(p);
                    await team.rosterAutoSort(tid);

                    // We found one, so stop looking for this team
                    break;
                }
            }
        }
    }
};

export default autoSign;
