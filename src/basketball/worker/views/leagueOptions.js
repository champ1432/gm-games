// @flow

import { g } from "../../../deion/worker/util";
import type { GetOutput, UpdateEvents } from "../../../deion/common/types";

async function updateOptions(
    inputs: GetOutput,
    updateEvents: UpdateEvents,
): void | { [key: string]: any } {
    if (
        updateEvents.includes("firstRun") ||
        updateEvents.includes("gameAttributes")
    ) {
        return {
            autoDeleteOldBoxScores: g.autoDeleteOldBoxScores,
            difficulty: g.difficulty,
            stopOnInjury: g.stopOnInjury,
            stopOnInjuryGames: g.stopOnInjuryGames,
        };
    }
}

export default {
    runBefore: [updateOptions],
};
