export class TimeValidator {
    static validateTimeOverlap(set1, set2) {
        if (!set1.startTime || !set1.endTime || !set2.startTime || !set2.endTime) {
            return true;
        }
        if (set1.endTime < set1.startTime || set2.endTime < set2.startTime) {
            return false;
        }
        return set1.endTime <= set2.startTime || set2.endTime <= set1.startTime;
    }
    static validateTimeInterval(interval) {
        if (!interval.startTime || !interval.endTime) {
            return true;
        }
        return interval.endTime >= interval.startTime;
    }
    static validateTimeOrder(currentSet, previousSet) {
        if (!previousSet.endTime) {
            return true;
        }
        if (!currentSet.startTime) {
            return true;
        }
        return currentSet.startTime >= previousSet.endTime;
    }
    static validateTimeOrderReverse(currentSet, nextSet) {
        if (!currentSet.endTime) {
            return true;
        }
        if (!nextSet.startTime) {
            return true;
        }
        return currentSet.endTime <= nextSet.startTime;
    }
}
