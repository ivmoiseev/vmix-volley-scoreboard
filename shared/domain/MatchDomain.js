export class MatchDomain {
    static getMaxSetNumber(match) {
        if (match.sets.length === 0)
            return 0;
        return Math.max(...match.sets.map(s => s.setNumber));
    }
    static getCompletedSets(match) {
        return match.sets.filter(set => set.completed === true || set.status === 'completed');
    }
    static getSetsWonByTeam(match, team) {
        const completedSets = this.getCompletedSets(match);
        return completedSets.filter(set => {
            if (team === 'A') {
                return set.scoreA > set.scoreB;
            }
            else {
                return set.scoreB > set.scoreA;
            }
        }).length;
    }
}
