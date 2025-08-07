import { getYear } from 'date-fns';

/**
 * Global Function to convert a full name into an ID in "FirstLastYear" format.
 * @param {} name the String containing the first and last name.
 * @returns ID of the first and last name in "FirstLastYear" format.
 */
export function formatID(name) {

    let res = "";

    for (let i = 0; i < name.length; i++) {

        if (name.charAt(i) != ' ') {
            res += name.charAt(i);
        }
    }
    
    const year = getYear(new Date());
    res += year.toString();

    return res;

}