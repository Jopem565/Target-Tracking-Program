/**
 * Function to test if two arrays of events are equal. 
 * Equal in this case is defined as if the length of EACH event in each array is equal
 * to the corresponding event's length in the other array. 
 * If the length of the two arrays are not equal, we immediately return false. 
 * 
 * This function is necessary for the "Hours Off" calculation on the Calendar page.
 * We need to know if the events array from the database, and the events array on the 
 * hypothetical calendar are the same, before the user clicks save. 
 * This comparison is necessary to properly calculate the total hours off, as if the user
 * had saved events, we must ensure the hours are not over-calculated.
 */
export function equalEvents(events1, events2) {
    if (events1.length != events2.length) {
        return false;
    }

    for (let i = 0; i < events1.length; i++) {
        const event1 = events1[i];
        const event2 = events2[i];
        if (event1.length != event2.length) {
            return false;
        }
    }

    return true;
}